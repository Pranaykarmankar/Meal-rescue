"""
Notifications router: list and mark-read.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Notification
from schemas import NotificationResponse
from auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(50))
    notifs = result.scalars().all()
    return [NotificationResponse.model_validate(n) for n in notifs]


@router.patch("/mark-all-read")
async def mark_all_read(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(update(Notification).where(Notification.user_id == current_user.id).values(is_read=True))
    await db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/unread-count")
async def unread_count(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    result = await db.execute(select(func.count()).select_from(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False))
    return {"count": result.scalar() or 0}
