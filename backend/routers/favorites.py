"""
Favorites router: add/remove/list favorite shops.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, FavoriteShop, MerchantProfile
from schemas import FavoriteResponse
from auth import get_current_user

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.post("/{merchant_id}")
async def add_favorite(merchant_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(FavoriteShop).where(and_(FavoriteShop.consumer_id == current_user.id, FavoriteShop.merchant_id == merchant_id)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already favorited")
    fav = FavoriteShop(consumer_id=current_user.id, merchant_id=merchant_id)
    db.add(fav)
    await db.commit()
    return {"message": "Shop added to favorites"}


@router.delete("/{merchant_id}")
async def remove_favorite(merchant_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FavoriteShop).where(and_(FavoriteShop.consumer_id == current_user.id, FavoriteShop.merchant_id == merchant_id)))
    fav = result.scalar_one_or_none()
    if not fav:
        raise HTTPException(status_code=404, detail="Not in favorites")
    await db.delete(fav)
    await db.commit()
    return {"message": "Shop removed from favorites"}


@router.get("/my-favorites")
async def my_favorites(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FavoriteShop, MerchantProfile).join(MerchantProfile, FavoriteShop.merchant_id == MerchantProfile.id).where(FavoriteShop.consumer_id == current_user.id))
    rows = result.all()
    return [FavoriteResponse(id=f.id, merchant_id=f.merchant_id, shop_name=m.shop_name, shop_address=m.shop_address, cover_image_url=m.cover_image_url) for f, m in rows]
