"""
All SQLAlchemy ORM models for Meal-Rescue.
"""
import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship
from database import Base


# ── Enums ──────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    consumer = "consumer"
    merchant = "merchant"
    admin = "admin"


class BoxStatus(str, enum.Enum):
    active = "active"
    sold_out = "sold_out"
    expired = "expired"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    cancelled = "cancelled"


# ── Models ─────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.consumer, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_banned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    merchant_profile = relationship("MerchantProfile", back_populates="user", uselist=False)
    orders = relationship("Order", back_populates="consumer")
    favorite_shops = relationship("FavoriteShop", back_populates="consumer")
    rescue_streak = relationship("RescueStreak", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user", order_by="Notification.created_at.desc()")


class MerchantProfile(Base):
    __tablename__ = "merchant_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    shop_name = Column(String(200), nullable=False)
    shop_address = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    fssai_number = Column(String(50), nullable=True)
    is_approved = Column(Boolean, default=False)
    cover_image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="merchant_profile")
    boxes = relationship("SurpriseBox", back_populates="merchant")
    favorited_by = relationship("FavoriteShop", back_populates="merchant")


class SurpriseBox(Base):
    __tablename__ = "surprise_boxes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(Integer, ForeignKey("merchant_profiles.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    original_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    is_dynamic_pricing = Column(Boolean, default=False)
    min_price = Column(Float, nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    remaining_qty = Column(Integer, nullable=False, default=1)
    pickup_start = Column(DateTime, nullable=False)
    pickup_end = Column(DateTime, nullable=False)
    tags = Column(JSON, nullable=True)  # ["Veg", "High Protein", ...]
    image_url = Column(String(500), nullable=True)
    status = Column(SAEnum(BoxStatus), default=BoxStatus.active, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    merchant = relationship("MerchantProfile", back_populates="boxes")
    orders = relationship("Order", back_populates="box")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    consumer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    box_id = Column(Integer, ForeignKey("surprise_boxes.id"), nullable=False)
    totp_secret = Column(String(64), nullable=False)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.pending, nullable=False)
    paid_amount = Column(Float, nullable=False)
    is_donated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    consumer = relationship("User", back_populates="orders")
    box = relationship("SurpriseBox", back_populates="orders")
    rating = relationship("RatingEvent", back_populates="order", uselist=False)


class FavoriteShop(Base):
    __tablename__ = "favorite_shops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    consumer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    merchant_id = Column(Integer, ForeignKey("merchant_profiles.id"), nullable=False)

    # Relationships
    consumer = relationship("User", back_populates="favorite_shops")
    merchant = relationship("MerchantProfile", back_populates="favorited_by")


class RatingEvent(Base):
    __tablename__ = "rating_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    thumbs_up = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    order = relationship("Order", back_populates="rating")


class RescueStreak(Base):
    __tablename__ = "rescue_streaks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    meals_rescued = Column(Integer, default=0)
    monthly_rescues = Column(Integer, default=0)
    total_co2_saved = Column(Float, default=0.0)
    eco_tokens = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="rescue_streak")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
