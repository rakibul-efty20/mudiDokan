import os

os.environ["DATABASE_URL"] = "sqlite:///./test_supershop.db"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app
from app import seed as seed_module

client = TestClient(app)


@pytest.fixture(autouse=True, scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    seed_module.run()  # populates categories/products/demo admin+shopkeeper
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_supershop.db"):
        os.remove("test_supershop.db")


def register_and_login(email, password="password123"):
    client.post("/api/v1/auth/register", json={"email": email, "password": password})
    res = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


def test_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["model_loaded"] is True


def test_register_and_login():
    token = register_and_login("alice@test.com")
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["role"] == "customer"


def test_duplicate_registration_rejected():
    client.post("/api/v1/auth/register", json={"email": "dup@test.com", "password": "password123"})
    res = client.post("/api/v1/auth/register", json={"email": "dup@test.com", "password": "password123"})
    assert res.status_code == 400


def test_wrong_password_rejected():
    client.post("/api/v1/auth/register", json={"email": "bob@test.com", "password": "password123"})
    res = client.post("/api/v1/auth/login", data={"username": "bob@test.com", "password": "wrongpass"})
    assert res.status_code == 401


def test_customer_cannot_access_forecast():
    token = register_and_login("carol@test.com")
    res = client.get("/api/v1/forecast/items", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_no_token_rejected_on_protected_route():
    res = client.get("/api/v1/forecast/items")
    assert res.status_code == 401


def test_customer_cannot_reach_admin():
    token = register_and_login("dave@test.com")
    res = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_categories_and_products_seeded():
    cats = client.get("/api/v1/categories").json()
    assert len(cats) == 11
    products = client.get("/api/v1/products").json()
    assert len(products) == 167


def test_products_filtered_by_category():
    products = client.get("/api/v1/products?category_slug=bakery").json()
    assert len(products) == 10
    assert all(p["category_id"] == products[0]["category_id"] for p in products)


def test_guest_checkout_requires_contact_info():
    res = client.post("/api/v1/orders", json={"items": [{"product_id": 1, "quantity": 1}]})
    assert res.status_code == 400


def test_guest_checkout_succeeds_with_contact_info():
    res = client.post("/api/v1/orders", json={
        "items": [{"product_id": 1, "quantity": 2}],
        "guest_name": "Guest", "guest_phone": "0170", "guest_address": "Dhaka",
    })
    assert res.status_code == 201
    body = res.json()
    assert body["discount_amount"] == 0  # no account, no promo -> no discount


def test_authenticated_checkout_gets_account_discount():
    token = register_and_login("eve@test.com")
    res = client.post(
        "/api/v1/orders",
        json={"items": [{"product_id": 1, "quantity": 1}]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["discount_amount"] > 0
    assert body["total"] == body["subtotal"] - body["discount_amount"]


def test_order_rejects_insufficient_stock():
    res = client.post("/api/v1/orders", json={
        "items": [{"product_id": 1, "quantity": 999999}],
        "guest_name": "G", "guest_phone": "0170", "guest_address": "Dhaka",
    })
    assert res.status_code == 400


def test_forecast_returns_12_months_for_any_of_167_items():
    res = client.post("/api/v1/auth/login", data={"username": "shopkeeper@supershop.local", "password": "ChangeMe123!"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    pred = client.post(
        "/api/v1/forecast/predict",
        json={"item": "whole milk", "year": 2015},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pred.status_code == 200
    assert len(pred.json()["monthly"]) == 12


def test_forecast_rejects_unknown_item():
    res = client.post("/api/v1/auth/login", data={"username": "shopkeeper@supershop.local", "password": "ChangeMe123!"})
    token = res.json()["access_token"]
    pred = client.post(
        "/api/v1/forecast/predict",
        json={"item": "definitely not a real product", "year": 2015},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pred.status_code == 404


def test_admin_can_promote_customer_role():
    admin_res = client.post("/api/v1/auth/login", data={"username": "admin@supershop.local", "password": "ChangeMe123!"})
    admin_token = admin_res.json()["access_token"]

    reg = client.post("/api/v1/auth/register", json={"email": "frank@test.com", "password": "password123"})
    user_id = reg.json()["id"]

    patch = client.patch(
        f"/api/v1/admin/users/{user_id}/role",
        json={"role": "shopkeeper"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert patch.status_code == 200
    assert patch.json()["role"] == "shopkeeper"

    # role change takes effect immediately, without needing a new token
    frank_res = client.post("/api/v1/auth/login", data={"username": "frank@test.com", "password": "password123"})
    frank_token = frank_res.json()["access_token"]
    forecast_res = client.get("/api/v1/forecast/items", headers={"Authorization": f"Bearer {frank_token}"})
    assert forecast_res.status_code == 200


def test_promo_code_applies_discount():
    admin_res = client.post("/api/v1/auth/login", data={"username": "admin@supershop.local", "password": "ChangeMe123!"})
    admin_token = admin_res.json()["access_token"]
    client.post(
        "/api/v1/admin/promo-codes",
        json={"code": "TESTCODE", "discount_type": "fixed", "discount_value": 50},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    order = client.post("/api/v1/orders", json={
        "items": [{"product_id": 1, "quantity": 1}],
        "guest_name": "G", "guest_phone": "0170", "guest_address": "Dhaka",
        "promo_code": "TESTCODE",
    })
    assert order.status_code == 201
    assert order.json()["discount_amount"] == 50


def test_admin_can_edit_inventory():
    admin_res = client.post("/api/v1/auth/login", data={"username": "admin@supershop.local", "password": "ChangeMe123!"})
    admin_token = admin_res.json()["access_token"]
    res = client.patch(
        "/api/v1/admin/products/2",
        json={"price": 321, "stock": 40},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["price"] == 321
    assert body["stock"] == 40


def test_inventory_edit_rejects_empty_payload():
    admin_res = client.post("/api/v1/auth/login", data={"username": "admin@supershop.local", "password": "ChangeMe123!"})
    admin_token = admin_res.json()["access_token"]
    res = client.patch(
        "/api/v1/admin/products/2", json={}, headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 400


def test_shopkeeper_cannot_edit_inventory():
    shop_res = client.post("/api/v1/auth/login", data={"username": "shopkeeper@supershop.local", "password": "ChangeMe123!"})
    shop_token = shop_res.json()["access_token"]
    res = client.patch(
        "/api/v1/admin/products/2", json={"price": 1}, headers={"Authorization": f"Bearer {shop_token}"}
    )
    assert res.status_code == 403
