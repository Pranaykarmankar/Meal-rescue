"""
Orders router: reserve, list orders, QR generation and verification.
"""
import pyotp
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Order, SurpriseBox, MerchantProfile, OrderStatus, BoxStatus, User
from schemas import ReserveRequest, OrderResponse, QRResponse, VerifyQRRequest
from auth import get_current_user
from dependencies import require_role

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("/reserve", response_model=OrderResponse)
async def reserve_box(
    req: ReserveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reserve a surprise box — creates an order with TOTP secret."""
    # Get the box
    result = await db.execute(
        select(SurpriseBox, MerchantProfile)
        .join(MerchantProfile, SurpriseBox.merchant_id == MerchantProfile.id)
        .where(SurpriseBox.id == req.box_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Box not found")

    box, merchant = row

    if box.status != BoxStatus.active:
        raise HTTPException(status_code=400, detail="Box is no longer available")
    if box.remaining_qty <= 0:
        raise HTTPException(status_code=400, detail="Box is sold out")

    # Check for existing pending order from same consumer on same box
    existing = await db.execute(
        select(Order).where(
            and_(
                Order.consumer_id == current_user.id,
                Order.box_id == req.box_id,
                Order.status == OrderStatus.pending,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already have a pending order for this box")

    # Generate TOTP secret
    totp_secret = pyotp.random_base32()

    # Create order
    # Handle dynamic pricing
    final_price = box.current_price
    if box.is_dynamic_pricing and box.min_price is not None:
        import datetime
        now = datetime.datetime.utcnow()
        if box.pickup_start <= now < box.pickup_end:
            total_duration = (box.pickup_end - box.pickup_start).total_seconds()
            elapsed = (now - box.pickup_start).total_seconds()
            decay_ratio = elapsed / total_duration
            price_drop = (box.current_price - box.min_price) * decay_ratio
            final_price = max(box.min_price, box.current_price - price_drop)
            final_price = round(final_price, 2)
        elif now >= box.pickup_end:
            final_price = box.min_price

    order = Order(
        consumer_id=current_user.id,
        box_id=req.box_id,
        totp_secret=totp_secret,
        paid_amount=final_price,
        is_donated=req.is_donated,
    )
    db.add(order)

    # Decrement remaining quantity
    box.remaining_qty -= 1
    if box.remaining_qty <= 0:
        box.status = BoxStatus.sold_out

    await db.commit()
    await db.refresh(order)

    # Broadcast quantity update
    from routers.websocket import manager
    if box.remaining_qty <= 0:
        await manager.broadcast({
            "type": "box_sold_out",
            "data": {"box_id": box.id},
        })
    else:
        await manager.broadcast({
            "type": "order_qty_update",
            "data": {"box_id": box.id, "remaining_qty": box.remaining_qty},
        })

    return OrderResponse(
        id=order.id,
        consumer_id=order.consumer_id,
        box_id=order.box_id,
        status=order.status.value,
        paid_amount=order.paid_amount,
        is_donated=order.is_donated,
        created_at=order.created_at,
        box_title=box.title,
        box_image=box.image_url,
        shop_name=merchant.shop_name,
        pickup_start=box.pickup_start,
        pickup_end=box.pickup_end,
    )


@router.get("/my-orders")
async def my_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current consumer's orders."""
    result = await db.execute(
        select(Order, SurpriseBox, MerchantProfile)
        .join(SurpriseBox, Order.box_id == SurpriseBox.id)
        .join(MerchantProfile, SurpriseBox.merchant_id == MerchantProfile.id)
        .where(Order.consumer_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    rows = result.all()

    orders = []
    for order, box, merchant in rows:
        orders.append(OrderResponse(
            id=order.id,
            consumer_id=order.consumer_id,
            box_id=order.box_id,
            status=order.status.value if hasattr(order.status, 'value') else order.status,
            paid_amount=order.paid_amount,
            is_donated=order.is_donated,
            created_at=order.created_at,
            box_title=box.title,
            box_image=box.image_url,
            shop_name=merchant.shop_name,
            pickup_start=box.pickup_start,
            pickup_end=box.pickup_end,
        ))

    return orders


@router.get("/{order_id}/qr", response_model=QRResponse)
async def get_qr(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate current TOTP token for an order's QR code."""
    result = await db.execute(
        select(Order).where(
            and_(
                Order.id == order_id,
                Order.consumer_id == current_user.id,
            )
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.pending:
        raise HTTPException(status_code=400, detail="Order is not pending")

    totp = pyotp.TOTP(order.totp_secret, interval=30)
    token = totp.now()
    payload = f"{order.id}:{token}"

    # Calculate time remaining in current TOTP window
    import time
    time_remaining = 30 - (int(time.time()) % 30)

    return QRResponse(payload=payload, expires_in=time_remaining)


@router.post("/verify-qr")
async def verify_qr(
    req: VerifyQRRequest,
    current_user: User = Depends(require_role("merchant")),
    db: AsyncSession = Depends(get_db),
):
    """Merchant verifies a customer's QR code to complete an order."""
    result = await db.execute(
        select(Order).where(Order.id == req.order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.pending:
        raise HTTPException(status_code=400, detail="Order is not pending")

    totp = pyotp.TOTP(order.totp_secret, interval=30)
    if not totp.verify(req.token, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid or expired QR code")

    # Mark order as completed
    order.status = OrderStatus.completed
    await db.commit()

    # Update rescue streak
    from services.streak_service import update_streak
    await update_streak(order.consumer_id, db)

    return {"success": True, "message": "Order verified and completed!"}
