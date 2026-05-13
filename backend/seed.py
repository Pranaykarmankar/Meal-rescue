import asyncio
import os
from datetime import datetime, timedelta
import bcrypt

from database import engine, AsyncSessionLocal, init_db
from models import (
    Base, User, UserRole, MerchantProfile, SurpriseBox, BoxStatus,
    Order, OrderStatus, RescueStreak
)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

async def seed_data():
    # Ensure tables exist
    await init_db()

    async with AsyncSessionLocal() as session:
        # Check if users already exist
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.email.in_(['merchant@example.com', 'consumer@example.com'])))
        existing_users = result.scalars().all()
        if existing_users:
            print("Database already seeded with these test users!")
            return

        print("Seeding new users...")
        pwd_hash = hash_password("password123")

        # 1. Create Merchant User
        merchant_user = User(
            name="Local Bakery",
            email="merchant@example.com",
            password_hash=pwd_hash,
            role=UserRole.merchant
        )
        session.add(merchant_user)
        await session.flush()  # to get merchant_user.id

        # 2. Create Merchant Profile
        merchant_profile = MerchantProfile(
            user_id=merchant_user.id,
            shop_name="Local Bakery",
            shop_address="123 Baker Street",
            latitude=37.7749,
            longitude=-122.4194,
            is_approved=True
        )
        session.add(merchant_profile)
        await session.flush()  # to get merchant_profile.id

        # 3. Create Consumer User
        consumer_user = User(
            name="Test User",
            email="consumer@example.com",
            password_hash=pwd_hash,
            role=UserRole.consumer
        )
        session.add(consumer_user)
        await session.flush()

        consumer_streak = RescueStreak(
            user_id=consumer_user.id,
            meals_rescued=0,
            monthly_rescues=0,
            total_co2_saved=0.0
        )
        session.add(consumer_streak)
        await session.flush()

        now = datetime.utcnow()

        # 4. Create Surprise Boxes
        boxes_data = [
            {
                "title": "Veggie Delight Box",
                "description": "A delicious mix of fresh vegetarian pastries and salads.",
                "original_price": 200.0,
                "current_price": 80.0,
                "quantity": 5,
                "remaining_qty": 3,
                "pickup_start": now,
                "pickup_end": now + timedelta(hours=2),
                "tags": ["Veg", "Fresh"],
            },
            {
                "title": "Protein Packed Bowl",
                "description": "Chicken and quinoa bowl.",
                "original_price": 250.0,
                "current_price": 100.0,
                "quantity": 3,
                "remaining_qty": 1,
                "pickup_start": now,
                "pickup_end": now + timedelta(minutes=15),
                "tags": ["High Protein", "Meat"],
            },
            {
                "title": "Dairy Dream Pastries",
                "description": "Croissants, cheese rolls, and more.",
                "original_price": 150.0,
                "current_price": 40.0,  # Under 50
                "quantity": 10,
                "remaining_qty": 10,
                "pickup_start": now,
                "pickup_end": now + timedelta(hours=4),
                "tags": ["Contains Dairy", "Veg"],
            },
            {
                "title": "Surprise Dinner Box",
                "description": "Everything left over from dinner service.",
                "original_price": 400.0,
                "current_price": 120.0,
                "quantity": 2,
                "remaining_qty": 2,
                "pickup_start": now,
                "pickup_end": now + timedelta(hours=1),
                "tags": ["Veg", "Contains Dairy"],
            }
        ]

        created_boxes = []
        for bd in boxes_data:
            box = SurpriseBox(
                merchant_id=merchant_profile.id,
                status=BoxStatus.active,
                **bd
            )
            session.add(box)
            created_boxes.append(box)
        
        await session.flush()

        # 5. Create some Orders for the consumer
        order1 = Order(
            consumer_id=consumer_user.id,
            box_id=created_boxes[0].id,
            totp_secret="JBSWY3DPEHPK3PXP",
            status=OrderStatus.pending,
            paid_amount=80.0
        )
        session.add(order1)

        order2 = Order(
            consumer_id=consumer_user.id,
            box_id=created_boxes[2].id,
            totp_secret="JBSWY3DPEHPK3PXP",
            status=OrderStatus.completed,
            paid_amount=40.0
        )
        session.add(order2)

        # Update streak
        consumer_streak.meals_rescued = 1
        consumer_streak.total_co2_saved = 2.5

        await session.commit()
        print("Successfully seeded the database!")

if __name__ == "__main__":
    asyncio.run(seed_data())
