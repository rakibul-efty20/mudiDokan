const CATEGORY_ICONS = {
  "Dairy & Eggs": "🥛",
  "Bakery": "🍞",
  "Fruits & Vegetables": "🥦",
  "Meat & Seafood": "🍗",
  "Beverages": "🥤",
  "Snacks & Confectionery": "🍫",
  "Pantry & Cooking Essentials": "🧂",
  "Household & Cleaning": "🧹",
  "Personal Care": "🧴",
  "Pet & Garden": "🌱",
  "Other": "📦",
};

function productCardHtml(product) {
  return `
    <div class="col-6 col-md-4 col-lg-3">
      <a href="product.html?id=${product.id}" class="text-decoration-none text-reset">
        <div class="product-card">
          ${productImgTag(product)}
          <div class="p-3">
            <div class="small text-truncate">${escapeHtml(product.name)}</div>
            <div class="price">Tk ${product.price.toFixed(0)}</div>
          </div>
        </div>
      </a>
    </div>`;
}

async function loadHome() {
  try {
    const categories = await apiFetch("/categories");
    document.getElementById("categoryTiles").innerHTML = categories.map((cat) => `
      <div class="col-6 col-md-4 col-lg-2">
        <a class="category-tile" href="products.html?category=${encodeURIComponent(cat.slug)}">
          <div style="font-size:28px;">${CATEGORY_ICONS[cat.name] || "🛒"}</div>
          <div class="cat-name">${escapeHtml(cat.name)}</div>
        </a>
      </div>`).join("");
  } catch (err) {
    document.getElementById("categoryTiles").innerHTML =
      `<div class="empty-state">Couldn't load categories — is the API running? (${err.message})</div>`;
  }

  try {
    const products = await apiFetch("/products");
    const featured = products.slice(0, 8);
    document.getElementById("featuredProducts").innerHTML = featured.map(productCardHtml).join("");
  } catch (err) {
    document.getElementById("featuredProducts").innerHTML =
      `<div class="empty-state">Couldn't load products (${err.message})</div>`;
  }
}

loadNavbar();
loadHome();
