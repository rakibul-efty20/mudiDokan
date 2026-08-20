# Supershop API — Complete (Phases 1–4)

FastAPI + SQLite backend, full customer storefront, shopkeeper dashboard,
and admin panel. All four phases are done — nothing left deferred except
what was explicitly scoped out from the start (see "Explicitly out of
scope" below).

```
supershop-api/
├── app/                        # unchanged from Phase 1 — see below
├── frontend/
│   ├── index.html               # home: hero, category tiles, featured products
│   ├── products.html             # all products / by category / search results
│   ├── product.html               # single product, quantity stepper, add to cart
│   ├── cart.html                   # view/edit cart (localStorage-backed)
│   ├── checkout.html                # guest or account checkout, promo code
│   ├── order-confirmation.html       # post-checkout summary
│   ├── login.html / register.html     # auth pages
│   ├── dashboard.html                  # shopkeeper/admin: earnings + forecast (role-gated)
│   ├── admin.html                       # admin only: inventory, promo codes, role control
│   ├── partials/navbar.html            # shared navbar, injected into every page
│   ├── css/style.css                    # Bootstrap theme override, light/dark
│   └── js/                               # api.js, auth.js, cart.js, theme.js,
│                                            navbar.js + one file per page
├── models/grocery_forecast_full.pkl
├── tests/test_api.py           # 20 backend tests
├── product-images.txt          # 167 expected image filenames
├── requirements.txt
├── Dockerfile
└── .env.example
```

Backend (`app/`) is Phase 1's structure plus one addition: `PATCH
/admin/products/{id}` for inventory editing (added in Phase 4 — see below).
Everything else about the backend is unchanged since Phase 1.

## 1–2. Setup and run

Identical to Phase 1 — nothing new to install, the frontend is static files
the backend already serves.

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload
```

Open **http://127.0.0.1:8000/** — that's the real storefront now, not the
Phase 1 placeholder.

## 3. Try it (real tested flow)

```
Browse   -> GET /api/v1/products?category_slug=bakery       (10 items)
Product  -> GET /api/v1/products/1                            (UHT-milk, Tk 240)
Register -> POST /api/v1/auth/register {"email":"jane.doe@gmail.com",...}
Login    -> POST /api/v1/auth/login (form-encoded)
Checkout (guest)      -> subtotal 605, discount 0,  total 605
Checkout (logged in)  -> subtotal 240, discount 12 (5%), total 228

Dashboard (shopkeeper) -> GET /api/v1/earnings   -> {"total_earnings":720,"this_month":720,"this_week":720,"order_count":1}
                       -> POST /api/v1/forecast/predict {"item":"whole milk","year":2015} -> 1469.2 units/year, 12 months
Dashboard (customer)   -> same two calls -> 403, both of them (server-enforced, not just a hidden nav link)

Admin: edit inventory  -> PATCH /admin/products/5 {"price":150,"stock":60} -> updated, confirmed in response
Admin: create promo    -> POST /admin/promo-codes {"code":"UITEST20",...}  -> created, then deactivated successfully
Admin: change a role   -> PATCH /admin/users/{id}/role                     -> takes effect on that user's next request
Shopkeeper: same admin calls -> 403, 403 (inventory and user-list both blocked)
```

**Gotcha worth knowing**: `email-validator` (used by Pydantic's `EmailStr`)
correctly rejects `.test`, `.example`, `.invalid`, and `.localhost` domains
as non-deliverable (RFC 2606 reserved names) — so registering with something
like `test@test.com` fails validation. Not a bug; use a realistic-looking
domain (`@gmail.com`, `@yourdomain.com`, etc.) when testing registration.

## The shopkeeper/admin dashboard (Phase 3)

`dashboard.html` — visible in the navbar only when logged in as
`shopkeeper` or `admin` (the link itself is hidden for customers, via
`js/navbar.js`). Two things worth understanding about how it's protected
and how the forecast renders:

- **The role check is client-side UX, not the real security boundary.**
  `dashboard.html` redirects a customer (or anyone logged out) to an
  access-denied state, but that's just so they don't see a broken page —
  the actual protection is the `/earnings` and `/forecast/*` endpoints
  themselves returning `403` for a customer token regardless of what the
  page does. Verified above ("Dashboard (customer)").
- **Same bar-chart pattern as the standalone `grocery-forecast-api`
  project**, restyled to pull colors from Bootstrap's theme variables
  (`var(--bs-primary)`) instead of hardcoded hex, so it follows the
  light/dark toggle correctly instead of clashing with whichever theme is
  active.

## The admin panel (Phase 4)

`admin.html` — visible in the navbar only for the `admin` role specifically
(not shopkeeper; enforced both in `js/navbar.js`, which hides the link, and
server-side, which is what actually matters). Three tabs:

- **Inventory** — all 167 products, searchable, filterable by category,
  inline price/stock editing. This needed a genuinely new backend endpoint
  that didn't exist before this phase: `PATCH /admin/products/{id}`
  (`app/routers/admin.py`) — "inventory editing" was named as an admin
  capability from the start of this whole project, but nothing let you
  actually *edit* a product until now, only list them. Partial updates work
  (send just `stock`, price stays untouched) via Pydantic's
  `exclude_unset=True`; an explicit `null` for a required field is filtered
  out rather than crashing the DB write, and an empty `{}` payload is
  rejected with `400` rather than silently no-op'ing.
- **Promo Codes** — create (percentage or fixed Tk) and deactivate. Reuses
  the Phase 1 `/admin/promo-codes` endpoints as-is, no backend changes
  needed here.
- **Users & Roles** — every user, current role, and a role-change control.
  Reuses Phase 1's `PATCH /admin/users/{id}/role`. The row for your own
  account has no dropdown — the backend already blocked self-role-changes
  (`400`), and the UI matches that instead of showing a control that would
  just fail.

167 rows is enough that the inventory table uses **event delegation** (one
click listener on the `<tbody>`, not 167+ individual ones) — re-rendering
the whole table on every edit is cheap; attaching hundreds of listeners
repeatedly isn't.

## 4. Run the tests

```powershell
pytest tests/ -v
```

20 tests: everything from Phases 1–3 (auth, RBAC on every protected route,
catalog seeding, checkout math, forecasting, role promotion taking effect
immediately) plus three new ones for inventory editing — a successful
partial update, empty-payload rejection, and confirming shopkeeper (not
just customer) is blocked from it. The storefront/dashboard/admin pages
themselves are static files with no server-side logic of their own to unit
test; their correctness was verified by tracing the exact API calls each
page's JS makes against the live server (see "Try it" above — those are
real responses, not illustrative ones).

## How the storefront works

- **No framework, no build step** — plain HTML/CSS/JS, Bootstrap 5.3 from
  CDN. Multi-page rather than a single-page app: each `.html` file is a
  real page; state that needs to survive navigation (cart, auth token,
  theme) lives in `localStorage`, not in memory.
- **Navbar is a partial**, not duplicated 8 times — `partials/navbar.html`
  is fetched and injected into a `<div id="navbarMount">` on every page by
  `js/navbar.js`, which also builds the category links and search box from
  the live `/categories` endpoint (so it can't drift from the real catalog)
  and swaps between logged-in/logged-out states.
- **Cart is client-side only** until checkout — items are captured
  `{product_id, name, price, image_filename, quantity}` at add-to-cart time
  so cart/checkout render without extra round-trips. The server re-validates
  stock and computes the real total at order time regardless of what the
  client displayed — the client-side numbers are a preview, not the source
  of truth.
- **Account discount shown at checkout is a labeled estimate** (`(est.)`) —
  the frontend has no endpoint to read the live discount percentage from,
  so it mirrors `config.py`'s default (5%) for the preview, but the actual
  order response is always what's authoritative. If you change
  `ACCOUNT_DISCOUNT_PERCENT` in `.env`, update the constant at the top of
  `js/checkout.js` to match, or the preview will be wrong (the real charged
  total won't be — that always comes from the server).
- **Guest checkout requires name/phone/address**; a logged-in account still
  fills the same fields (no saved-address feature yet) but gets the
  discount automatically — enforced server-side, not just hidden in the UI.
- **Order confirmation is one-time-view**: the just-placed order is read
  from `sessionStorage` and immediately cleared, so refreshing
  `order-confirmation.html` correctly shows "no recent order" instead of
  replaying stale data.
- **Images**: broken/missing product images fall back to a text placeholder
  automatically (`onerror` handler) rather than showing a broken-image icon
  — safe to run right now before any real images exist.

## API reference (grouped by who can call it)

| Endpoint | Access |
|---|---|
| `POST /auth/register`, `/login`, `GET /auth/me` | Anyone |
| `GET /categories`, `GET /products[?category_slug=]` | Anyone |
| `POST /orders` | Anyone (guest needs name/phone/address; logged-in gets 5% off automatically) |
| `POST /forecast/predict`, `GET /forecast/items` | Shopkeeper, Admin |
| `GET /earnings` | Shopkeeper, Admin |
| `GET/PATCH /admin/users/*`, `/admin/promo-codes/*` | Admin only |

Full request/response shapes are in `/docs` — not duplicated here since
they'd just go stale against it.

## Product images

`product-images.txt` lists all 167 expected filenames (e.g. `whole-milk.jpg`),
grouped by category, generated from the actual seeded data. Drop matching
images into `frontend/images/products/` — pages already handle missing
images gracefully (see "How the storefront works" below), so the site works
fine before you do this, it just shows text placeholders instead of photos.

## Notes / decisions worth knowing about

- **All 167 items are individually modeled** (vs. 7 in the earlier
  standalone forecast API) — dropped the top-10 feature cutoff, feeding the
  model all 167 one-hot columns instead. R²=0.74, MAE=5.5 units/month —
  slightly *better* than the top-10 version, since nothing useful was being
  thrown away this time.
- **Prices started as placeholder, now editable.** The source dataset has
  no price column — `app/seed.py` originally assigns each item a price from
  a per-category range (e.g. Meat & Seafood: 200–800 Tk) using a seeded
  random draw, so the *starting* numbers are plausible, not real. Real
  prices now go through the admin panel's Inventory tab (Phase 4) rather
  than editing `seed.py` and reseeding.
- **Categories are my grouping, not the dataset's** — the raw data has no
  category field. All 167 items are verified assigned exactly once
  (`python -m app.categories` re-checks this) across 11 groups. Rename or
  regroup in `app/categories.py` if you want different ones — both `seed.py`
  and the storefront's category tiles read from there indirectly (via the
  seeded DB), so a reseed is all it takes to propagate a change.
- **Passwords use `bcrypt` directly, not `passlib`.** `passlib`'s bcrypt
  backend is broken against `bcrypt>=4.1` (reads a `__about__.__version__`
  attribute that no longer exists) — confirmed by hitting the actual error
  while building this. Skipped the broken abstraction layer entirely rather
  than pin an old bcrypt to work around someone else's bug.
- **Role is read fresh from the DB on every request**, never trusted from
  the JWT payload — the token only carries a user ID. An admin's role change
  takes effect on the promoted user's *next request*, not after their old
  token expires. Tested explicitly (see test suite).
- **Discounts stack.** Logged-in account discount + a promo code both apply
  if both are present, capped so total discount can't exceed the subtotal.
- **JWT secret is a placeholder** (`dev-secret-change-this-in-production` in
  `config.py`). Set `JWT_SECRET` in `.env` to something real before this is
  anything but local/demo use.
- **Email validation rejects reserved test domains** — see "Try it" above.

