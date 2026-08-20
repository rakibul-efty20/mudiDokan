from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.db_models import PromoCodeType, UserRole

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserOut(BaseModel):
    id: int
    email: str
    role: UserRole
    created_at: datetime
    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleUpdate(BaseModel):
    role: UserRole


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------

class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    model_config = {"from_attributes": True}


class ProductOut(BaseModel):
    id: int
    name: str
    category_id: int
    price: float
    stock: int
    image_filename: str
    description: str
    model_config = {"from_attributes": True}


class ProductUpdate(BaseModel):
    price: Optional[float] = Field(None, gt=0)
    stock: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)


class OrderCreate(BaseModel):
    items: list[OrderItemIn]
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    guest_address: Optional[str] = None
    promo_code: Optional[str] = None


class OrderItemOut(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    line_total: float


class OrderOut(BaseModel):
    id: int
    subtotal: float
    discount_amount: float
    total: float
    items: list[OrderItemOut]
    created_at: datetime


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

class PromoCodeCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=20)
    discount_type: PromoCodeType
    discount_value: float = Field(..., gt=0)


class PromoCodeOut(BaseModel):
    id: int
    code: str
    discount_type: PromoCodeType
    discount_value: float
    active: bool
    model_config = {"from_attributes": True}


class EarningsSummary(BaseModel):
    total_earnings: float
    this_month: float
    this_week: float
    order_count: int


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------

class ForecastRequest(BaseModel):
    item: str = Field(..., description="Product name, e.g. 'whole milk'")
    year: int = Field(2015, ge=2014, le=2030)


class MonthPrediction(BaseModel):
    month: int
    quantity: float


class ForecastResponse(BaseModel):
    item: str
    year: int
    monthly: list[MonthPrediction]
    total: float


class ItemsResponse(BaseModel):
    all_items: list[str]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
