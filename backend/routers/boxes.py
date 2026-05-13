"""
Boxes router: CRUD for SurpriseBox listings.
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import SurpriseBox, MerchantProfile, BoxStatus, User
from schemas import BoxResponse, BoxCreateRequest, BoxUpdateRequest
from auth import get_current_user, get_optional_user
from dependencies import require_role

router = APIRouter(prefix="/api/boxes", tags=["boxes"])


def box_to_response(box: SurpriseBox, merchant: MerchantProfile = None) -> dict:
    """Convert a SurpriseBox ORM object to a response dict."""
    data = {
        "id": box.id,
        "merchant_id": box.merchant_id,
        "title": box.title,
        "description": box.description,
        "original_price": box.original_price,
        "current_price": box.current_price,
        "quantity": box.quantity,
        "remaining_qty": box.remaining_qty,
        "pickup_start": box.pickup_start,
        "pickup_end": box.pickup_end,
        "tags": box.tags or [],
        "image_url": box.image_url,
        "status": box.status.value if hasattr(box.status, 'value') else box.status,
        "created_at": box.created_at,
        "shop_name": merchant.shop_name if merchant else None,
        "shop_address": merchant.shop_address if merchant else None,
        "merchant_avatar": None,
    }
    return data


@router.get("", response_model=List[BoxResponse])
async def list_boxes(
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    veg_only: bool = Query(False),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all active boxes with optional filters."""
    query = (
        select(SurpriseBox, MerchantProfile)
        .join(MerchantProfile, SurpriseBox.merchant_id == MerchantProfile.id)
        .where(SurpriseBox.status == BoxStatus.active)
        .order_by(SurpriseBox.created_at.desc())
    )

    result = await db.execute(query)
    rows = result.all()

    boxes = []
    for box, merchant in rows:
        # Filter by tags
        if veg_only and box.tags and "Veg" not in box.tags:
            continue
        if tags:
            tag_list = [t.strip() for t in tags.split(",")]
            if box.tags and not any(t in box.tags for t in tag_list):
                continue
        if search:
            search_lower = search.lower()
            if (search_lower not in (box.title or "").lower() and
                search_lower not in (merchant.shop_name or "").lower()):
                continue

        boxes.append(box_to_response(box, merchant))

    return boxes


@router.get("/{box_id}", response_model=BoxResponse)
async def get_box(box_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single box by ID."""
    result = await db.execute(
        select(SurpriseBox, MerchantProfile)
        .join(MerchantProfile, SurpriseBox.merchant_id == MerchantProfile.id)
        .where(SurpriseBox.id == box_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Box not found")
    box, merchant = row
    return box_to_response(box, merchant)


@router.post("", response_model=BoxResponse)
async def create_box(
    req: BoxCreateRequest,
    current_user: User = Depends(require_role("merchant")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new surprise box (merchant only)."""
    # Get merchant profile
    result = await db.execute(
        select(MerchantProfile).where(MerchantProfile.user_id == current_user.id)
    )
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=400, detail="Merchant profile not found. Register as merchant first.")
    if not merchant.is_approved:
        raise HTTPException(status_code=403, detail="Merchant profile not yet approved by admin.")

    box = SurpriseBox(
        merchant_id=merchant.id,
        title=req.title,
        description=req.description,
        original_price=req.original_price,
        current_price=req.original_price,
        quantity=req.quantity,
        remaining_qty=req.quantity,
        pickup_start=req.pickup_start,
        pickup_end=req.pickup_end,
        tags=req.tags,
    )
    db.add(box)
    await db.commit()
    await db.refresh(box)

    # Broadcast new box event via WebSocket
    from routers.websocket import manager
    await manager.broadcast({
        "type": "new_box",
        "data": box_to_response(box, merchant),
    })

    return box_to_response(box, merchant)


@router.patch("/{box_id}", response_model=BoxResponse)
async def update_box(
    box_id: int,
    req: BoxUpdateRequest,
    current_user: User = Depends(require_role("merchant")),
    db: AsyncSession = Depends(get_db),
):
    """Update a box (merchant only)."""
    result = await db.execute(
        select(SurpriseBox, MerchantProfile)
        .join(MerchantProfile, SurpriseBox.merchant_id == MerchantProfile.id)
        .where(
            and_(
                SurpriseBox.id == box_id,
                MerchantProfile.user_id == current_user.id,
            )
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Box not found or access denied")

    box, merchant = row
    if req.title is not None:
        box.title = req.title
    if req.description is not None:
        box.description = req.description
    if req.current_price is not None:
        box.current_price = req.current_price
    if req.remaining_qty is not None:
        box.remaining_qty = req.remaining_qty
        if box.remaining_qty <= 0:
            box.status = BoxStatus.sold_out
    if req.tags is not None:
        box.tags = req.tags

    await db.commit()
    await db.refresh(box)
    return box_to_response(box, merchant)


@router.delete("/{box_id}")
async def delete_box(
    box_id: int,
    current_user: User = Depends(require_role("merchant")),
    db: AsyncSession = Depends(get_db),
):
    """Delete a box (merchant only)."""
    result = await db.execute(
        select(SurpriseBox, MerchantProfile)
        .join(MerchantProfile, SurpriseBox.merchant_id == MerchantProfile.id)
        .where(
            and_(
                SurpriseBox.id == box_id,
                MerchantProfile.user_id == current_user.id,
            )
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Box not found or access denied")

    box, _ = row
    await db.delete(box)
    await db.commit()
    return {"message": "Box deleted successfully"}


@router.post("/{box_id}/upload-image")
async def upload_box_image(
    box_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("merchant")),
    db: AsyncSession = Depends(get_db),
):
    """Upload an image for a box."""
    from services.image_service import save_image

    result = await db.execute(
        select(SurpriseBox, MerchantProfile)
        .join(MerchantProfile, SurpriseBox.merchant_id == MerchantProfile.id)
        .where(
            and_(
                SurpriseBox.id == box_id,
                MerchantProfile.user_id == current_user.id,
            )
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Box not found")

    box, _ = row
    image_url = await save_image(file, folder="boxes")
    box.image_url = image_url
    await db.commit()
    return {"image_url": image_url}
