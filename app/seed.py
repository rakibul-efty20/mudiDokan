"""Run once to create tables and populate demo data:  python -m app.seed

Product prices are placeholder/demo values (this dataset has no real price
column) — heuristically assigned per category so they at least look
plausible, not randomly generated. Replace with real prices before this
goes anywhere near production.
"""

import random
import re

from app.auth import hash_password
from app.categories import CATEGORIES, verify
from app.database import Base, SessionLocal, engine
from app.db_models import Category, Product, User, UserRole

# (min, max) Tk — rough, defensible bands per category, not per-item accuracy
PRICE_RANGES = {
    "Dairy & Eggs": (40, 350),
    "Bakery": (25, 150),
    "Fruits & Vegetables": (30, 200),
    "Meat & Seafood": (200, 800),
    "Beverages": (30, 600),
    "Snacks & Confectionery": (20, 150),
    "Pantry & Cooking Essentials": (30, 250),
    "Household & Cleaning": (40, 300),
    "Personal Care": (50, 400),
    "Pet & Garden": (100, 500),
    "Other": (15, 100),
}

ADMIN_EMAIL = "admin@supershop.local"
ADMIN_PASSWORD = "ChangeMe123!"
SHOPKEEPER_EMAIL = "shopkeeper@supershop.local"
SHOPKEEPER_PASSWORD = "ChangeMe123!"


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[/.]", "-", text)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    rng = random.Random(42)  # reproducible prices across re-seeds

    try:
        if db.query(Category).count() > 0:
            print("Already seeded — skipping. Delete supershop.db to reseed from scratch.")
            return

        category_rows = {}
        for name in CATEGORIES:
            cat = Category(name=name, slug=slugify(name))
            db.add(cat)
            db.flush()
            category_rows[name] = cat

        total_items = 0
        for cat_name, items in CATEGORIES.items():
            lo, hi = PRICE_RANGES[cat_name]
            for item in items:
                price = round(rng.uniform(lo, hi) / 5) * 5
                original_price = None
                if rng.random() < 0.15:  # ~15% of products show an OFF badge
                    original_price = round(price * rng.uniform(1.15, 1.35) / 5) * 5
                db.add(Product(
                    name=item,
                    category_id=category_rows[cat_name].id,
                    price=float(price),
                    original_price=float(original_price) if original_price else None,
                    stock=rng.randint(20, 200),
                    image_filename=f"{slugify(item)}.jpg",
                    description=f"{item} — {cat_name}",
                ))
                total_items += 1

        db.add(User(email=ADMIN_EMAIL, hashed_password=hash_password(ADMIN_PASSWORD), role=UserRole.admin))
        db.add(User(email=SHOPKEEPER_EMAIL, hashed_password=hash_password(SHOPKEEPER_PASSWORD), role=UserRole.shopkeeper))

        db.commit()
        print(f"Seeded {len(category_rows)} categories, {total_items} products.")
        print(f"Admin login:      {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print(f"Shopkeeper login: {SHOPKEEPER_EMAIL} / {SHOPKEEPER_PASSWORD}")
        print("CHANGE THESE PASSWORDS before this touches real data.")
    finally:
        db.close()


if __name__ == "__main__":
    import pandas as pd
    df = pd.read_csv("Groceries_dataset.csv")
    df["itemDescription"] = df["itemDescription"].str.strip()
    verify(sorted(df["itemDescription"].unique()))  # fail loudly before writing anything
    run()
