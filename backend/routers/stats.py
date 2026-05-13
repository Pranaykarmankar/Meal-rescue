"""
Stats router: public endpoint for landing page counters.
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Order, RescueStreak, OrderStatus, User
from schemas import PublicStats

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=PublicStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = await db.execute(select(func.count()).select_from(Order).where(Order.status == OrderStatus.completed, Order.created_at >= today))
    total_result = await db.execute(select(func.count()).select_from(Order).where(Order.status == OrderStatus.completed))
    co2_result = await db.execute(select(func.coalesce(func.sum(RescueStreak.total_co2_saved), 0)).select_from(RescueStreak))
    users_result = await db.execute(select(func.count()).select_from(User).where(User.role == "consumer"))

    return PublicStats(
        meals_rescued_today=today_result.scalar() or 0,
        total_meals_rescued=total_result.scalar() or 0,
        total_co2_saved=float(co2_result.scalar() or 0),
        happy_students=users_result.scalar() or 0,
    )
