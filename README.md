# MudiDokan

A full-stack e-commerce grocery platform combining a customer storefront, role-based staff dashboards and machine learning-powered seasonal demand forecasting — built with FastAPI, SQLite, and vanilla JavaScript.

## Screenshots

**Storefront**

| Home | Home |
|---|---|
| ![Home](images/screenshots/ss1.png) | ![Home](images/screenshots/ss2.png) |

| Category browsing (Bakery) |
|---|
| ![Category page](images/screenshots/ss3.png) |

| Cart | Checkout | Promo code & discount |
|---|---|---|
| ![Cart](images/screenshots/ss4.png) | ![Checkout](images/screenshots/ss5.png) | ![Discount applied](images/screenshots/ss6.png) |

**Shopkeeper & Admin**

| Sales dashboard & seasonal forecast |
|---|
| ![Dashboard](images/screenshots/ss7.png) |

| Inventory management | Promo code management | Role management |
|---|---|---|
| ![Inventory](images/screenshots/ss8.png) | ![Promo codes](images/screenshots/ss9.png) | ![User roles](images/screenshots/ss10.png) |

## Overview

MudiDokan is a grocery e-commerce platform with three tiers of access — customers, shopkeepers, and administrators — built around a 167-item product catalog. Beyond standard storefront functionality, it includes a Random Forest-based forecasting engine that predicts monthly demand for every item in the catalog, giving shopkeepers a data-driven view of seasonal sales patterns alongside real-time revenue tracking.

## Key Features

**Customer Storefront**
- Product catalog browsing by category or search, with promotional banners per category
- Shopping cart with persistent local state
- Guest checkout or registered-account checkout with an automatic loyalty discount
- Promo code support at checkout
- Light and dark themes

**Shopkeeper Dashboard**
- Revenue tracking: total, monthly, and weekly earnings
- Seasonal demand forecasting for any of the 167 catalog items, visualized as a monthly breakdown

**Admin Panel**
- Inventory management: live price and stock editing across the full catalog
- Promo code creation and deactivation
- User role management (customer / shopkeeper / admin)

## Machine Learning

The forecasting engine allows shopkeepers to anticipate demand across the full product catalog ahead of seasonal peaks, rather than relying on historical intuition alone.

**Dataset.** Trained on a real transaction log of 38,765 grocery purchases spanning January 2014 to December 2015 (24 months), covering all 167 catalog items at the individual transaction level.

**Feature Engineering**
- Raw transactions were aggregated into a monthly demand grid — 167 items × 24 months, 4,008 records — explicitly including months with zero recorded sales, so the model learns genuine absence of demand rather than only observed activity.
- Month is encoded cyclically via sine/cosine transforms, so December and January are represented as numerically adjacent rather than as distant integers twelve apart.
- Manufacture year is retained as a linear trend feature.
- Item identity is one-hot encoded across all 167 products, giving each item its own learned baseline and seasonal signature rather than sharing a generalized pattern with the rest of the catalog.

**Model**
- Random Forest Regressor (scikit-learn), 300 estimators, max depth 15, minimum 2 samples per leaf.
- Trained on the full 170-dimensional feature space — 167 item indicators plus month sine, month cosine, and year — with no dimensionality reduction, so every catalog item receives an individually learned demand curve.
- Evaluated on an 80/20 train-test split: **R² of 0.74**, **mean absolute error of 5.5 units/month**.

**Inference.** At request time, item and year are held constant while month is varied across all twelve values, producing a complete seasonal demand curve per prediction. This is surfaced on the shopkeeper dashboard as a month-by-month breakdown alongside a projected annual total.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy, SQLite |
| Authentication | JWT (JSON Web Tokens), bcrypt password hashing |
| Machine Learning | scikit-learn (Random Forest Regressor), pandas |
| Frontend | HTML5, CSS3, vanilla JavaScript, Bootstrap 5 |
| API Documentation | OpenAPI / Swagger (via FastAPI) |

## Project Structure

```
supershop-api/
├── app/
│   ├── main.py                 # Application entry point, middleware, routing
│   ├── config.py                # Environment-based configuration
│   ├── database.py              # SQLAlchemy engine and session management
│   ├── db_models.py              # ORM models: User, Product, Category, Order, PromoCode
│   ├── schemas.py                 # Pydantic request/response schemas
│   ├── auth.py                     # JWT issuance, password hashing, RBAC dependencies
│   ├── forecast_model.py            # Trained model wrapper and prediction logic
│   ├── categories.py                 # Product category taxonomy
│   ├── seed.py                        # Database seeding (catalog, demo accounts)
│   └── routers/
│       ├── auth.py                     # Registration, login, session
│       ├── catalog.py                   # Category and product browsing
│       ├── orders.py                     # Checkout and order processing
│       ├── forecast.py                    # Demand prediction endpoints
│       └── admin.py                        # Inventory, promo codes, role management, earnings
├── frontend/
│   ├── index.html, products.html, product.html, cart.html, checkout.html,
│   │   order-confirmation.html, login.html, register.html
│   ├── dashboard.html            # Shopkeeper/admin analytics
│   ├── admin.html                 # Admin control panel
│   ├── partials/navbar.html        # Shared navigation component
│   ├── css/style.css                # Theming and layout
│   └── js/                            # Page controllers and shared utilities
├── models/
│   └── grocery_forecast_full.pkl  # Trained forecasting model
├── tests/
│   └── test_api.py                 # Backend test suite
├── product-images.txt              # Product image asset manifest
├── carousel-images.txt              # Banner/carousel image asset manifest
├── requirements.txt
├── Dockerfile
└── .env.example
```

## Getting Started

**Prerequisites:** Python 3.10+

```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload
```

The application will be available at `http://127.0.0.1:8000/`. Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@supershop.local` | `ChangeMe123!` |
| Shopkeeper | `shopkeeper@supershop.local` | `ChangeMe123!` |

## API Reference

| Endpoint | Access |
|---|---|
| `POST /api/v1/auth/register`, `/login`, `GET /auth/me` | Public |
| `GET /api/v1/categories`, `GET /products` | Public |
| `POST /api/v1/orders` | Public (guest or authenticated) |
| `POST /api/v1/forecast/predict`, `GET /forecast/items` | Shopkeeper, Admin |
| `GET /api/v1/earnings` | Shopkeeper, Admin |
| `GET/PATCH /api/v1/admin/users/*`, `/admin/promo-codes/*`, `/admin/products/*` | Admin |

Full request and response schemas are available via the interactive documentation at `/docs`.

## Architecture Notes

- **Role-based access control** is enforced at the API layer: each protected endpoint verifies the requesting user's role directly against the database on every request, rather than trusting role information embedded in the JWT. This ensures a role change takes effect immediately, on the user's next request.
- **Cart state** is managed client-side for a responsive shopping experience; the server independently validates stock and recalculates totals at checkout, making it the sole source of truth for pricing and inventory.
- **Discounts are additive** — an authenticated account's automatic discount and an applied promo code both apply to the same order, capped so the total discount cannot exceed the order subtotal.
- **The forecasting model** is trained on the full product catalog rather than a reduced feature set, allowing every item — not just top sellers — to have its own predicted seasonal curve.
- **Passwords are hashed with bcrypt directly**, without an intermediate abstraction layer, for a minimal and well-audited dependency surface.

## Roadmap

- Real payment gateway integration (currently cash on delivery)
- Delivery tracking and order status lifecycle
- Multi-language support
- Saved delivery addresses for registered accounts
- Product review and rating system
