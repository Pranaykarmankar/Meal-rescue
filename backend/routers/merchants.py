"""
Merchants router: profile registration, dashboard stats, listings.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, MerchantProfile, SurpriseBox, Order, RatingEvent, OrderStatus, BoxStatus
from schemas import MerchantRegisterRequest, MerchantProfileResponse, MerchantDashboardStats
from auth import get_current_user
from dependencies import require_role
from routers.boxes import box_to_response

router = APIRouter(prefix="/api/merchants", tags=["merchants"])


@router.post("/register", response_model=MerchantProfileResponse)
async def register_merchant(req: MerchantRegisterRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MerchantProfile).where(MerchantProfile.user_id == current_user.id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Merchant profile already exists")
    profile = MerchantProfile(user_id=current_user.id, shop_name=req.shop_name, shop_address=req.shop_address, latitude=req.latitude, longitude=req.longitude, fssai_number=req.fssai_number)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return MerchantProfileResponse.model_validate(profile)


@router.get("/dashboard", response_model=MerchantDashboardStats)
async def merchant_dashboard(current_user: User = Depends(require_role("merchant")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MerchantProfile).where(MerchantProfile.user_id == current_user.id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")

    rev = await db.execute(select(func.coalesce(func.sum(Order.paid_amount), 0)).join(SurpriseBox, Order.box_id == SurpriseBox.id).where(and_(SurpriseBox.merchant_id == merchant.id, Order.status == OrderStatus.completed)))
    total_revenue = float(rev.scalar() or 0)

    active = await db.execute(select(func.count()).select_from(SurpriseBox).where(and_(SurpriseBox.merchant_id == merchant.id, SurpriseBox.status == BoxStatus.active)))
    active_boxes = active.scalar() or 0

    meals = await db.execute(select(func.count()).select_from(Order).join(SurpriseBox).where(and_(SurpriseBox.merchant_id == merchant.id, Order.status == OrderStatus.completed)))
    meals_rescued = meals.scalar() or 0

    return MerchantDashboardStats(total_revenue=total_revenue, active_boxes=active_boxes, meals_rescued=meals_rescued, avg_rating=4.5)


@router.get("/my-boxes")
async def my_boxes(current_user: User = Depends(require_role("merchant")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MerchantProfile).where(MerchantProfile.user_id == current_user.id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
    boxes_result = await db.execute(select(SurpriseBox).where(SurpriseBox.merchant_id == merchant.id).order_by(SurpriseBox.created_at.desc()))
    return [box_to_response(b, merchant) for b in boxes_result.scalars().all()]


@router.get("/profile", response_model=MerchantProfileResponse)
async def get_profile(current_user: User = Depends(require_role("merchant")), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MerchantProfile).where(MerchantProfile.user_id == current_user.id))
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
    return MerchantProfileResponse.model_validate(merchant)
