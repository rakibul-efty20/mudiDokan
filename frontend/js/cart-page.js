function cartItemRow(item) {
  return `
    <div class="d-flex align-items-center gap-3 border rounded-3 p-2" data-row-id="${item.product_id}">
      <div style="width:64px;height:64px;flex-shrink:0;" class="product-card">
        ${productImgTag({ name: item.name, image_filename: item.image_filename })}
      </div>
      <div class="flex-grow-1">
        <a href="product.html?id=${item.product_id}" class="text-reset text-decoration-none small fw-medium">${escapeHtml(item.name)}</a>
        <div class="small text-secondary">Tk ${item.price.toFixed(0)} each</div>
      </div>
      <div class="qty-stepper">
        <button type="button" data-minus="${item.product_id}">&minus;</button>
        <input type="text" inputmode="numeric" pattern="[0-9]*" value="${item.quantity}" data-qty-input="${item.product_id}">
        <button type="button" data-plus="${item.product_id}">+</button>
      </div>
      <div class="fw-medium" style="width:80px;text-align:right;">Tk ${(item.price * item.quantity).toFixed(0)}</div>
      <button class="btn btn-sm btn-outline-danger" data-remove="${item.product_id}">&times;</button>
    </div>`;
}

function renderCartPage() {
  const cart = getCart();
  const emptyEl = document.getElementById("cartEmpty");
  const contentEl = document.getElementById("cartContent");

  if (cart.length === 0) {
    emptyEl.classList.remove("d-none");
    contentEl.classList.add("d-none");
    return;
  }
  emptyEl.classList.add("d-none");
  contentEl.classList.remove("d-none");

  document.getElementById("cartItems").innerHTML = cart.map(cartItemRow).join("");
  const subtotal = cartSubtotal();
  document.getElementById("summarySubtotal").textContent = `Tk ${subtotal.toFixed(0)}`;
  document.getElementById("discountHint").textContent = isLoggedIn()
    ? "Your account discount will be applied at checkout."
    : "Log in before checkout for an automatic account discount, or apply a promo code at checkout.";

  document.querySelectorAll("[data-plus]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const item = cart.find((i) => i.product_id === Number(btn.dataset.plus));
      updateCartQuantity(item.product_id, item.quantity + 1);
      renderCartPage();
    })
  );
  document.querySelectorAll("[data-minus]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const item = cart.find((i) => i.product_id === Number(btn.dataset.minus));
      updateCartQuantity(item.product_id, item.quantity - 1);
      renderCartPage();
    })
  );
  document.querySelectorAll("[data-qty-input]").forEach((input) =>
    input.addEventListener("change", () => {
      const qty = Math.max(0, parseInt(input.value) || 0);
      updateCartQuantity(Number(input.dataset.qtyInput), qty);
      renderCartPage();
    })
  );
  document.querySelectorAll("[data-remove]").forEach((btn) =>
    btn.addEventListener("click", () => {
      removeFromCart(Number(btn.dataset.remove));
      renderCartPage();
    })
  );
}

loadNavbar();
renderCartPage();
