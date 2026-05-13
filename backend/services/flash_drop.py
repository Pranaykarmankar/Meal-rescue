"""
Flash-drop service: recalculate prices for boxes nearing pickup deadline.
"""
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal
from models import SurpriseBox, BoxStatus


async def flash_drop_job():
    """Run every 5 minutes: reduce prices for boxes near pickup end."""
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        result = await db.execute(select(SurpriseBox).where(SurpriseBox.status == BoxStatus.active))
        boxes = result.scalars().all()

        updated = []
        for box in boxes:
            if box.pickup_end <= now:
                box.status = BoxStatus.expired
                updated.append(box)
                continue

            minutes_to_close = (box.pickup_end - now).total_seconds() / 60

            if minutes_to_close <= 30 and box.current_price > box.original_price * 0.30:
                box.current_price = round(box.original_price * 0.30, 2)
                updated.append(box)
            elif minutes_to_close <= 60 and box.current_price > box.original_price * 0.50:
                box.current_price = round(box.original_price * 0.50, 2)
                updated.append(box)

        if updated:
            await db.commit()
            # Broadcast price updates
            from routers.websocket import manager
            for box in updated:
                if box.status == BoxStatus.expired:
                    await manager.broadcast({"type": "box_sold_out", "data": {"box_id": box.id}})
                else:
                    await manager.broadcast({"type": "price_updated", "data": {"box_id": box.id, "new_price": box.current_price}})
