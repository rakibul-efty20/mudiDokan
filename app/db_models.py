import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Enum, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    customer = "customer"
    shopkeeper = "shopkeeper"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.customer, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    orders = relationship("Order", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    price = Column(Float, nullable=False)  # Tk, placeholder demo pricing — see seed.py
    original_price = Column(Float, nullable=True)  # set only when the item is "on sale"; null = no discount
    stock = Column(Integer, default=100, nullable=False)
    image_filename = Column(String, nullable=False)
    description = Column(Text, default="")

    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")


class PromoCodeType(str, enum.Enum):
    percentage = "percentage"
    fixed = "fixed"


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    discount_type = Column(Enum(PromoCodeType), nullable=False)
    discount_value = Column(Float, nullable=False)  # % (0-100) or Tk, per discount_type
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    orders = relationship("Order", back_populates="promo_code")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = guest order

    guest_name = Column(String, nullable=True)
    guest_phone = Column(String, nullable=True)
    guest_address = Column(String, nullable=True)

    subtotal = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    total = Column(Float, nullable=False)

    promo_code_id = Column(Integer, ForeignKey("promo_codes.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="orders")
    promo_code = relationship("PromoCode", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)  # price at time of purchase, not live product.price

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
