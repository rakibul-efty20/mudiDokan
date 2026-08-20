from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_role
from app.database import get_db
from app.db_models import Order, PromoCode, Product, User, UserRole
from app.schemas import EarningsSummary, ProductOut, ProductUpdate, PromoCodeCreate, PromoCodeOut, RoleUpdate, UserOut

router = APIRouter(tags=["admin"])

STAFF = (UserRole.shopkeeper, UserRole.admin)


# --- inventory editing (admin only) -----------------------------------------

@router.patch("/admin/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role(UserRole.admin)),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")
    for field, value in updates.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


# --- role control (admin only) ---------------------------------------------

@router.get("/admin/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _user: User = Depends(require_role(UserRole.admin))):
    return db.query(User).order_by(User.created_at).all()


@router.patch("/admin/users/{user_id}/role", response_model=UserOut)
def set_user_role(
    user_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.admin)),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Can't change your own role")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = payload.role
    db.commit()
    db.refresh(target)
    return target


# --- promo codes (admin only) -----------------------------------------------

@router.get("/admin/promo-codes", response_model=list[PromoCodeOut])
def list_promo_codes(db: Session = Depends(get_db), _user: User = Depends(require_role(UserRole.admin))):
    return db.query(PromoCode).order_by(PromoCode.created_at.desc()).all()


@router.post("/admin/promo-codes", response_model=PromoCodeOut, status_code=201)
def create_promo_code(
    payload: PromoCodeCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_role(UserRole.admin)),
):
    if db.query(PromoCode).filter(PromoCode.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Promo code already exists")
    promo = PromoCode(**payload.model_dump())
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.patch("/admin/promo-codes/{promo_id}/deactivate", response_model=PromoCodeOut)
def deactivate_promo_code(
    promo_id: int, db: Session = Depends(get_db), _user: User = Depends(require_role(UserRole.admin))
):
    promo = db.get(PromoCode, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    promo.active = False
    db.commit()
    db.refresh(promo)
    return promo


# --- earnings dashboard (shopkeeper + admin) --------------------------------

@router.get("/earnings", response_model=EarningsSummary)
def earnings_summary(db: Session = Depends(get_db), _user: User = Depends(require_role(*STAFF))):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    total = db.query(func.coalesce(func.sum(Order.total), 0.0)).scalar()
    this_month = db.query(func.coalesce(func.sum(Order.total), 0.0)).filter(Order.created_at >= month_start).scalar()
    this_week = db.query(func.coalesce(func.sum(Order.total), 0.0)).filter(Order.created_at >= week_start).scalar()
    order_count = db.query(func.count(Order.id)).scalar()

    return EarningsSummary(
        total_earnings=round(total, 2), this_month=round(this_month, 2),
        this_week=round(this_week, 2), order_count=order_count,
    )
