function orderItemRow(item) {
  return `
    <div class="d-flex justify-content-between small py-1">
      <span>${escapeHtml(item.product_name)} &times; ${item.quantity}</span>
      <span>Tk ${item.line_total.toFixed(0)}</span>
    </div>`;
}

function renderConfirmation() {
  const raw = sessionStorage.getItem("supershop_last_order");
  const content = document.getElementById("confirmContent");

  if (!raw) {
    content.innerHTML = `
      <div class="empty-state">
        <p>No recent order found.</p>
        <a href="products.html" class="btn btn-primary">Browse products</a>
      </div>`;
    return;
  }

  const order = JSON.parse(raw);
  sessionStorage.removeItem("supershop_last_order"); // one-time view — refresh won't re-show stale data

  content.innerHTML = `
    <div class="text-center mb-4">
      <div style="font-size:40px;">✅</div>
      <h1 class="h4 mt-2">Order placed</h1>
      <p class="text-secondary small">Order #${order.id} &middot; cash on delivery</p>
    </div>
    <div class="card p-3 mb-3">
      ${order.items.map(orderItemRow).join("")}
      <hr>
      <div class="d-flex justify-content-between small"><span>Subtotal</span><span>Tk ${order.subtotal.toFixed(0)}</span></div>
      ${order.discount_amount > 0 ? `<div class="d-flex justify-content-between small text-success"><span>Discount</span><span>&minus;Tk ${order.discount_amount.toFixed(0)}</span></div>` : ""}
      <div class="d-flex justify-content-between fw-bold mt-2"><span>Total</span><span>Tk ${order.total.toFixed(0)}</span></div>
    </div>
    <a href="products.html" class="btn btn-primary w-100">Continue shopping</a>`;
}

loadNavbar();
renderConfirmation();
