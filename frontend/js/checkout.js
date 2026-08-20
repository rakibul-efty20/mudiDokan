// Matches app/config.py's default — shown as a labeled estimate only,
// since the frontend has no endpoint to read the live server value from.
// The real discount is always whatever /orders actually returns.
const ESTIMATED_ACCOUNT_DISCOUNT_PERCENT = 5.0;

function renderSummary() {
  const cart = getCart();
  document.getElementById("summaryItems").innerHTML = cart.map((i) => `
    <div class="d-flex justify-content-between">
      <span class="text-truncate" style="max-width:70%;">${escapeHtml(i.name)} &times; ${i.quantity}</span>
      <span>Tk ${(i.price * i.quantity).toFixed(0)}</span>
    </div>`).join("");

  const subtotal = cartSubtotal();
  document.getElementById("sumSubtotal").textContent = `Tk ${subtotal.toFixed(0)}`;

  if (isLoggedIn()) {
    const est = subtotal * (ESTIMATED_ACCOUNT_DISCOUNT_PERCENT / 100);
    document.getElementById("sumDiscount").innerHTML = `&minus;Tk ${est.toFixed(0)} (est.)`;
    document.getElementById("sumTotal").textContent = `Tk ${(subtotal - est).toFixed(0)} (before any promo code)`;
  } else {
    document.getElementById("sumDiscountRow").classList.add("d-none");
    document.getElementById("sumTotal").textContent = `Tk ${subtotal.toFixed(0)} (before any promo code)`;
  }
}

function prefillGuestFieldsIfLoggedIn() {
  if (!isLoggedIn()) return;
  document.getElementById("contactHeading").textContent = "Delivery details";
  // Still collected even for account holders — there's no saved-address
  // feature yet, so every order needs a delivery address at checkout time.
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("checkoutError");
  errorEl.classList.add("d-none");

  const btn = document.getElementById("placeOrderBtn");
  btn.disabled = true;
  document.getElementById("placeOrderLabel").textContent = "Placing order…";

  const payload = {
    items: getCart().map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    guest_name: document.getElementById("guestName").value.trim() || null,
    guest_phone: document.getElementById("guestPhone").value.trim() || null,
    guest_address: document.getElementById("guestAddress").value.trim() || null,
    promo_code: document.getElementById("promoCode").value.trim() || null,
  };

  try {
    const order = await apiFetch("/orders", { method: "POST", body: payload, auth: true });
    sessionStorage.setItem("supershop_last_order", JSON.stringify(order));
    clearCart();
    window.location.href = "order-confirmation.html";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("d-none");
    btn.disabled = false;
    document.getElementById("placeOrderLabel").textContent = "Place order";
  }
}

function init() {
  const cart = getCart();
  if (cart.length === 0) {
    document.getElementById("checkoutEmpty").classList.remove("d-none");
    document.getElementById("checkoutContent").classList.add("d-none");
    return;
  }
  renderSummary();
  prefillGuestFieldsIfLoggedIn();
  document.getElementById("checkoutForm").addEventListener("submit", handleCheckoutSubmit);
}

loadNavbar();
init();
