"""
Streak service: update rescue streak after order completion.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import RescueStreak

CO2_PER_MEAL = 2.5  # kg CO2 saved per meal rescued


async def update_streak(user_id: int, db: AsyncSession):
    result = await db.execute(select(RescueStreak).where(RescueStreak.user_id == user_id))
    streak = result.scalar_one_or_none()
    if not streak:
        streak = RescueStreak(user_id=user_id, meals_rescued=0, monthly_rescues=0, total_co2_saved=0)
        db.add(streak)
    streak.meals_rescued += 1
    streak.monthly_rescues += 1
    streak.total_co2_saved += CO2_PER_MEAL
    # Award 5 Eco-Tokens per rescue
    if not hasattr(streak, 'eco_tokens'):
        streak.eco_tokens = 0
    streak.eco_tokens += 5
    await db.commit()


def get_badges(meals: int) -> list:
    badges = []
    if meals >= 1:
        badges.append("First Rescue 🌱")
    if meals >= 5:
        badges.append("Regular Rescuer 🥗")
    if meals >= 10:
        badges.append("Eco Warrior ♻️")
    if meals >= 25:
        badges.append("Planet Hero 🌍")
    if meals >= 50:
        badges.append("Food Legend 🏆")
    if meals >= 100:
        badges.append("Zero Waste Champion 👑")
    return badges
