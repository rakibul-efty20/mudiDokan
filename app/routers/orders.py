from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_optional_user
from app.config import settings
from app.database import get_db
from app.db_models import Order, OrderItem, PromoCode, PromoCodeType, Product, User
from app.schemas import OrderCreate, OrderItemOut, OrderOut

router = APIRouter(tags=["orders"])


@router.post("/orders", response_model=OrderOut, status_code=201)
def create_order(
    payload: OrderCreate,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    if current_user is None:
        missing = [f for f in ("guest_name", "guest_phone", "guest_address")
                   if not getattr(payload, f)]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Guest checkout requires: {missing}",
            )

    # Validate stock and compute subtotal before writing anything
    line_items = []
    subtotal = 0.0
    for item in payload.items:
        product = db.get(Product, item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for '{product.name}': {product.stock} available",
            )
        line_items.append((product, item.quantity))
        subtotal += product.price * item.quantity

    discount = 0.0

    # Account discount — flat percentage for logged-in customers, on top of
    # any promo code (the two are additive, not either/or).
    if current_user is not None:
        discount += subtotal * (settings.account_discount_percent / 100)

    if payload.promo_code:
        promo = db.query(PromoCode).filter(
            PromoCode.code == payload.promo_code, PromoCode.active == True  # noqa: E712
        ).first()
        if not promo:
            raise HTTPException(status_code=400, detail="Invalid or inactive promo code")
        if promo.discount_type == PromoCodeType.percentage:
            discount += subtotal * (promo.discount_value / 100)
        else:
            discount += promo.discount_value
    else:
        promo = None

    discount = min(discount, subtotal)  # never discount below zero
    total = round(subtotal - discount, 2)

    order = Order(
        user_id=current_user.id if current_user else None,
        guest_name=payload.guest_name,
        guest_phone=payload.guest_phone,
        guest_address=payload.guest_address,
        subtotal=round(subtotal, 2),
        discount_amount=round(discount, 2),
        total=total,
        promo_code_id=promo.id if promo else None,
    )
    db.add(order)
    db.flush()

    out_items = []
    for product, qty in line_items:
        db.add(OrderItem(order_id=order.id, product_id=product.id, quantity=qty, unit_price=product.price))
        product.stock -= qty
        out_items.append(OrderItemOut(
            product_id=product.id, product_name=product.name,
            quantity=qty, unit_price=product.price, line_total=round(product.price * qty, 2),
        ))

    db.commit()
    db.refresh(order)

    return OrderOut(
        id=order.id, subtotal=order.subtotal, discount_amount=order.discount_amount,
        total=order.total, items=out_items, created_at=order.created_at,
    )
