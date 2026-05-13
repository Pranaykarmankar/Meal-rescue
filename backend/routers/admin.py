"""
Admin router: approve/reject merchants, ban users, refund orders.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, MerchantProfile, Order, SurpriseBox, OrderStatus, BoxStatus
from schemas import AdminStats
from dependencies import require_role

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
async def admin_stats(current_user: User = Depends(require_role("admin")), db: AsyncSession = Depends(get_db)):
    users = await db.execute(select(func.count()).select_from(User))
    merchants = await db.execute(select(func.count()).select_from(MerchantProfile))
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    meals_today = await db.execute(select(func.count()).select_from(Order).where(and_(Order.status == OrderStatus.completed, Order.created_at >= today)))
    revenue = await db.execute(select(func.coalesce(func.sum(Order.paid_amount), 0)).where(Order.status == OrderStatus.completed))
    return AdminStats(total_users=users.scalar() or 0, total_merchants=merchants.scalar() or 0, meals_rescued_today=meals_today.scalar() or 0, total_revenue=float(revenue.scalar() or 0))


@router.get("/pending-merchants")
async def pending_merchants(current_user: User = Depends(require_role("admin")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MerchantProfile, User).join(User, MerchantProfile.user_id == User.id).where(MerchantProfile.is_approved == False))
    rows = result.all()
    return [{"id": m.id, "user_id": m.user_id, "shop_name": m.shop_name, "shop_address": m.shop_address, "fssai_number": m.fssai_number, "user_name": u.name, "user_email": u.email} for m, u in rows]


@router.patch("/merchants/{merchant_id}/approve")
async def approve_merchant(merchant_id: int, current_user: User = Depends(require_role("admin")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MerchantProfile).where(MerchantProfile.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    merchant.is_approved = True
    await db.commit()
    return {"message": "Merchant approved"}


@router.patch("/merchants/{merchant_id}/reject")
async def reject_merchant(merchant_id: int, current_user: User = Depends(require_role("admin")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MerchantProfile).where(MerchantProfile.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    await db.delete(merchant)
    await db.commit()
    return {"message": "Merchant rejected"}


@router.patch("/users/{user_id}/ban")
async def ban_user(user_id: int, current_user: User = Depends(require_role("admin")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = not user.is_banned
    await db.commit()
    return {"message": f"User {'banned' if user.is_banned else 'unbanned'}"}


@router.post("/orders/{order_id}/refund")
async def refund_order(order_id: int, current_user: User = Depends(require_role("admin")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = OrderStatus.cancelled
    box_result = await db.execute(select(SurpriseBox).where(SurpriseBox.id == order.box_id))
    box = box_result.scalar_one_or_none()
    if box:
        box.remaining_qty += 1
        if box.status == BoxStatus.sold_out:
            box.status = BoxStatus.active
    await db.commit()
    return {"message": "Order refunded"}


@router.get("/users")
async def list_users(current_user: User = Depends(require_role("admin")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role.value, "is_banned": u.is_banned, "created_at": u.created_at.isoformat()} for u in users]


@router.get("/orders")
async def list_orders(current_user: User = Depends(require_role("admin")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order, User, SurpriseBox).join(User, Order.consumer_id == User.id).join(SurpriseBox, Order.box_id == SurpriseBox.id).order_by(Order.created_at.desc()).limit(50))
    rows = result.all()
    return [{"id": o.id, "consumer_name": u.name, "box_title": b.title, "status": o.status.value, "paid_amount": o.paid_amount, "created_at": o.created_at.isoformat()} for o, u, b in rows]


@router.get("/chart-data")
async def chart_data(current_user: User = Depends(require_role("admin")), db: AsyncSession = Depends(get_db)):
    """Get chart data for admin dashboard."""
    days = []
    for i in range(6, -1, -1):
        day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count = await db.execute(select(func.count()).select_from(Order).where(and_(Order.status == OrderStatus.completed, Order.created_at >= day, Order.created_at < next_day)))
        rev = await db.execute(select(func.coalesce(func.sum(Order.paid_amount), 0)).where(and_(Order.status == OrderStatus.completed, Order.created_at >= day, Order.created_at < next_day)))
        days.append({"date": day.strftime("%a"), "meals": count.scalar() or 0, "revenue": float(rev.scalar() or 0)})
    return {"daily": days}
