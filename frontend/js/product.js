async function loadProduct() {
  const id = new URLSearchParams(window.location.search).get("id");
  const main = document.getElementById("productMain");

  if (!id) {
    main.innerHTML = `<div class="empty-state">No product specified.</div>`;
    return;
  }

  let product, category;
  try {
    product = await apiFetch(`/products/${id}`);
    const categories = await apiFetch("/categories");
    category = categories.find((c) => c.id === product.category_id);
  } catch (err) {
    main.innerHTML = `<div class="empty-state">Couldn't load this product (${err.message})</div>`;
    return;
  }

  document.title = `${product.name} — DokanCast Mart`;

  main.innerHTML = `
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb small">
        <li class="breadcrumb-item"><a href="index.html">Home</a></li>
        ${category ? `<li class="breadcrumb-item"><a href="products.html?category=${category.slug}">${escapeHtml(category.name)}</a></li>` : ""}
        <li class="breadcrumb-item active">${escapeHtml(product.name)}</li>
      </ol>
    </nav>
    <div class="row g-4">
      <div class="col-md-5">
        <div class="product-card">${productImgTag(product)}</div>
      </div>
      <div class="col-md-7">
        <h1 class="h3">${escapeHtml(product.name)}</h1>
        ${category ? `<a href="products.html?category=${category.slug}" class="badge text-bg-secondary text-decoration-none mb-3">${escapeHtml(category.name)}</a>` : ""}
        <div class="fs-3 price mb-3">Tk ${product.price.toFixed(0)}</div>
        <p class="text-secondary">${escapeHtml(product.description)}</p>
        <p class="small ${product.stock < 10 ? "stock-badge low" : "text-secondary"}">
          ${product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </p>

        <div class="d-flex align-items-center gap-3 mt-4">
          <div class="qty-stepper">
            <button type="button" id="qtyMinus">&minus;</button>
            <input type="text" inputmode="numeric" pattern="[0-9]*" id="qtyInput" value="1">
            <button type="button" id="qtyPlus">+</button>
          </div>
          <button class="btn btn-primary" id="addToCartBtn" ${product.stock === 0 ? "disabled" : ""}>
            Add to cart
          </button>
        </div>
        <div class="small text-success mt-2 d-none" id="addedMsg">Added to cart ✓</div>
      </div>
    </div>`;

  const qtyInput = document.getElementById("qtyInput");
  qtyInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
  });
  document.getElementById("qtyMinus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, (parseInt(qtyInput.value) || 1) - 1);
  });
  document.getElementById("qtyPlus").addEventListener("click", () => {
    const max = product.stock;
    qtyInput.value = Math.min(max, (parseInt(qtyInput.value) || 1) + 1);
  });
  document.getElementById("addToCartBtn").addEventListener("click", () => {
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);
    addToCart(product, qty);
    const msg = document.getElementById("addedMsg");
    msg.classList.remove("d-none");
    setTimeout(() => msg.classList.add("d-none"), 1500);
  });
}

loadNavbar();
loadProduct();
