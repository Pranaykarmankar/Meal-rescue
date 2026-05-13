"""
All Pydantic request / response schemas for Meal-Rescue.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ── Auth ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default="consumer")  # consumer | merchant


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── User ───────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Merchant Profile ──────────────────────────────────────────────

class MerchantRegisterRequest(BaseModel):
    shop_name: str = Field(..., min_length=2, max_length=200)
    shop_address: str = Field(..., min_length=5, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    fssai_number: Optional[str] = None


class MerchantProfileResponse(BaseModel):
    id: int
    user_id: int
    shop_name: str
    shop_address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    fssai_number: Optional[str] = None
    is_approved: bool
    cover_image_url: Optional[str] = None

    class Config:
        from_attributes = True


# ── Surprise Box ──────────────────────────────────────────────────

class BoxCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    original_price: float = Field(..., gt=0)
    quantity: int = Field(..., ge=1)
    pickup_start: datetime
    pickup_end: datetime
    tags: Optional[List[str]] = None
    is_dynamic_pricing: bool = False
    min_price: Optional[float] = None


class BoxUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    current_price: Optional[float] = None
    remaining_qty: Optional[int] = None
    tags: Optional[List[str]] = None


class BoxResponse(BaseModel):
    id: int
    merchant_id: int
    title: str
    description: Optional[str] = None
    original_price: float
    current_price: float
    quantity: int
    remaining_qty: int
    pickup_start: datetime
    pickup_end: datetime
    tags: Optional[List[str]] = None
    image_url: Optional[str] = None
    is_dynamic_pricing: bool = False
    min_price: Optional[float] = None
    status: str
    created_at: datetime
    # Joined fields
    shop_name: Optional[str] = None
    shop_address: Optional[str] = None
    merchant_avatar: Optional[str] = None

    class Config:
        from_attributes = True


# ── Order ─────────────────────────────────────────────────────────

class ReserveRequest(BaseModel):
    box_id: int
    is_donated: bool = False


class OrderResponse(BaseModel):
    id: int
    consumer_id: int
    box_id: int
    status: str
    paid_amount: float
    is_donated: bool
    created_at: datetime
    # Joined
    box_title: Optional[str] = None
    box_image: Optional[str] = None
    shop_name: Optional[str] = None
    pickup_start: Optional[datetime] = None
    pickup_end: Optional[datetime] = None

    class Config:
        from_attributes = True


class QRResponse(BaseModel):
    payload: str
    expires_in: int


class VerifyQRRequest(BaseModel):
    order_id: int
    token: str


# ── Favorites ─────────────────────────────────────────────────────

class FavoriteResponse(BaseModel):
    id: int
    merchant_id: int
    shop_name: str
    shop_address: Optional[str] = None
    cover_image_url: Optional[str] = None

    class Config:
        from_attributes = True


# ── Notification ──────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: int
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Dashboard Stats ───────────────────────────────────────────────

class MerchantDashboardStats(BaseModel):
    total_revenue: float
    active_boxes: int
    meals_rescued: int
    avg_rating: float


class AdminStats(BaseModel):
    total_users: int
    total_merchants: int
    meals_rescued_today: int
    total_revenue: float


class PublicStats(BaseModel):
    meals_rescued_today: int
    total_meals_rescued: int
    total_co2_saved: float
    happy_students: int


# ── Rescue Streak ─────────────────────────────────────────────────

class RescueStreakResponse(BaseModel):
    meals_rescued: int
    monthly_rescues: int
    total_co2_saved: float
    eco_tokens: int
    badges: List[str] = []

    class Config:
        from_attributes = True
