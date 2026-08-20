"""Category assignment for the 167-item grocery catalog. Run standalone to
verify every item is assigned to exactly one category before this is used
to seed the database."""

CATEGORIES = {
    "Dairy & Eggs": [
        "UHT-milk", "whole milk", "butter", "butter milk", "cream",
        "cream cheese", "curd", "curd cheese", "domestic eggs", "hard cheese",
        "processed cheese", "sliced cheese", "soft cheese", "specialty cheese",
        "spread cheese", "yogurt", "whipped/sour cream", "condensed milk",
        "margarine",
    ],
    "Bakery": [
        "brown bread", "white bread", "rolls/buns", "roll products",
        "semi-finished bread", "long life bakery product", "cake bar",
        "pastry", "zwieback", "waffles",
    ],
    "Fruits & Vegetables": [
        "berries", "citrus fruit", "grapes", "other vegetables",
        "packaged fruit/vegetables", "pickled vegetables", "pip fruit",
        "root vegetables", "specialty vegetables", "tropical fruit", "onions",
        "canned vegetables", "canned fruit", "frozen vegetables", "frozen fruits",
    ],
    "Meat & Seafood": [
        "beef", "chicken", "frozen chicken", "fish", "frozen fish",
        "canned fish", "frankfurter", "ham", "hamburger meat", "liver loaf",
        "meat", "meat spreads", "organic sausage", "pork", "sausage", "turkey",
    ],
    "Beverages": [
        "beverages", "bottled water", "bottled beer", "canned beer", "brandy",
        "coffee", "instant coffee", "cocoa drinks", "fruit/vegetable juice",
        "liqueur", "liquor", "liquor (appetizer)", "misc. beverages",
        "prosecco", "red/blush wine", "rum", "soda", "sparkling wine", "tea",
        "whisky", "white wine",
    ],
    "Snacks & Confectionery": [
        "candy", "chewing gum", "chocolate", "chocolate marshmallow",
        "cooking chocolate", "nut snack", "nuts/prunes", "popcorn",
        "salty snack", "snack products", "specialty bar", "specialty chocolate",
        "tidbits",
    ],
    "Pantry & Cooking Essentials": [
        "baking powder", "cereals", "flour", "honey", "jam", "ketchup",
        "mayonnaise", "mustard", "oil", "pasta", "rice", "salad dressing",
        "sauces", "seasonal products", "spices", "sugar", "sweet spreads",
        "syrup", "vinegar", "salt", "artif. sweetener", "pudding powder",
        "Instant food products", "ready soups", "soups", "finished products",
        "frozen meals", "frozen potato products", "potato products",
        "organic products", "specialty fat", "dessert", "frozen dessert",
        "ice cream",
    ],
    "Household & Cleaning": [
        "abrasive cleaner", "bathroom cleaner", "cleaner", "decalcifier",
        "detergent", "dish cleaner", "softener", "toilet cleaner",
        "cling film/bags", "kitchen towels", "napkins", "candles",
        "light bulbs", "preservation products", "house keeping products",
        "dishes", "cookware", "kitchen utensil", "shopping bags", "bags",
    ],
    "Personal Care": [
        "baby cosmetics", "dental care", "female sanitary products",
        "hair spray", "hygiene articles", "make up remover", "male cosmetics",
        "rubbing alcohol", "skin care", "soap",
    ],
    "Pet & Garden": [
        "cat food", "dog food", "pet care", "flower (seeds)",
        "flower soil/fertilizer", "pot plants", "herbs",
    ],
    "Other": [
        "newspapers", "photo/film",
    ],
}


def verify(all_items: list[str]) -> None:
    assigned = [item for items in CATEGORIES.values() for item in items]
    dupes = {i for i in assigned if assigned.count(i) > 1}
    missing = set(all_items) - set(assigned)
    extra = set(assigned) - set(all_items)
    assert not dupes, f"Duplicate assignments: {dupes}"
    assert not missing, f"Unassigned items: {missing}"
    assert not extra, f"Assigned items not in catalog: {extra}"
    assert len(assigned) == len(all_items) == 167, f"Count mismatch: {len(assigned)} vs {len(all_items)}"
    print(f"OK — all {len(all_items)} items assigned exactly once across {len(CATEGORIES)} categories")


if __name__ == "__main__":
    import pandas as pd
    df = pd.read_csv("Groceries_dataset.csv")
    df["itemDescription"] = df["itemDescription"].str.strip()
    all_items = sorted(df["itemDescription"].unique())
    verify(all_items)
    for cat, items in CATEGORIES.items():
        print(f"{cat}: {len(items)}")
