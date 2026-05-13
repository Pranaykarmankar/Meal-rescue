import asyncio
from datetime import datetime, timedelta
from database import engine, AsyncSessionLocal
from models import User, MerchantProfile, SurpriseBox, BoxStatus
from sqlalchemy import select

async def seed_more():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == 'merchant@example.com'))
        merchant_user = result.scalars().first()
        if not merchant_user:
            print("Merchant user not found")
            return
            
        result = await session.execute(select(MerchantProfile).where(MerchantProfile.user_id == merchant_user.id))
        merchant_profile = result.scalars().first()
        if not merchant_profile:
             print("Merchant profile not found")
             return

        now = datetime.utcnow()
        boxes_data = [
            {
                "title": "Fresh Baked Croissants",
                "description": "A set of 4 buttery, flaky croissants from this morning's batch.",
                "original_price": 120.0,
                "current_price": 40.0,
                "quantity": 10,
                "remaining_qty": 10,
                "pickup_start": now,
                "pickup_end": now + timedelta(hours=3),
                "tags": ["Veg", "Contains Dairy", "cheap"],
            },
            {
                "title": "Pasta Lunch Special",
                "description": "Penne arrabiata with a side of garlic bread.",
                "original_price": 250.0,
                "current_price": 90.0,
                "quantity": 5,
                "remaining_qty": 5,
                "pickup_start": now,
                "pickup_end": now + timedelta(hours=5),
                "tags": ["Veg"],
            },
            {
                "title": "Assorted Sushi Box",
                "description": "8 pieces of assorted sushi, freshly prepared.",
                "original_price": 500.0,
                "current_price": 200.0,
                "quantity": 3,
                "remaining_qty": 3,
                "pickup_start": now,
                "pickup_end": now + timedelta(hours=1),
                "tags": ["High Protein", "soon"],
            },
            {
                "title": "Vegan Salad Bowl",
                "description": "Quinoa, roasted chickpeas, and fresh greens.",
                "original_price": 180.0,
                "current_price": 60.0,
                "quantity": 6,
                "remaining_qty": 6,
                "pickup_start": now,
                "pickup_end": now + timedelta(hours=4),
                "tags": ["Veg", "protein"],
            }
        ]

        for bd in boxes_data:
            box = SurpriseBox(
                merchant_id=merchant_profile.id,
                status=BoxStatus.active,
                **bd
            )
            session.add(box)
        
        await session.commit()
        print("Successfully seeded more meals!")

if __name__ == "__main__":
    asyncio.run(seed_more())
