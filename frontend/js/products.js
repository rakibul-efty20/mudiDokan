function toastAddedToCart(name) {
  const el = document.createElement("div");
  el.className = "toast align-items-center text-bg-dark border-0 position-fixed bottom-0 end-0 m-4 show";
  el.style.zIndex = 1080;
  el.innerHTML = `<div class="d-flex"><div class="toast-body">Added "${escapeHtml(name)}" to cart</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

function productCardWithAddButton(product) {
  return `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="product-card">
        ${offBadgeHtml(product)}
        <a href="product.html?id=${product.id}" class="text-decoration-none text-reset">
          ${productImgTag(product)}
        </a>
        <div class="p-3">
          <a href="product.html?id=${product.id}" class="text-decoration-none text-reset">
            <div class="small text-truncate">${escapeHtml(product.name)}</div>
          </a>
          <div class="mb-2">
            ${product.original_price && product.original_price > product.price
              ? `<span class="original-price">Tk ${product.original_price.toFixed(0)}</span>` : ""}
            <span class="price">Tk ${product.price.toFixed(0)}</span>
          </div>
          <button class="add-to-bag-btn" data-add-id="${product.id}">+ Add to Bag</button>
          ${product.stock < 10 ? `<div class="small stock-badge low mt-1">Only ${product.stock} left</div>` : ""}
        </div>
      </div>
    </div>`;
}

function showCategoryBanner(category) {
  const wrap = document.getElementById("categoryBannerWrap");
  const img = document.getElementById("categoryBannerImg");
  const placeholder = document.getElementById("categoryBannerPlaceholder");
  const filename = `category-banner-${category.slug}.png`;

  placeholder.textContent = filename;
  placeholder.style.display = "none";
  img.style.display = "block";
  img.alt = `${category.name} banner`;
  img.onerror = () => {
    img.style.display = "none";
    placeholder.style.display = "flex";
  };
  img.src = `images/carousel/${filename}`;
  wrap.classList.remove("d-none");
}

function hideCategoryBanner() {
  document.getElementById("categoryBannerWrap").classList.add("d-none");
}

async function loadProducts() {
  const params = new URLSearchParams(window.location.search);
  const categorySlug = params.get("category");
  const search = params.get("search");

  const grid = document.getElementById("productsGrid");
  const titleEl = document.getElementById("pageTitle");
  const crumbEl = document.getElementById("pageTitleCrumb");

  try {
    let products;
    if (categorySlug) {
      products = await apiFetch(`/products?category_slug=${encodeURIComponent(categorySlug)}`);
      const categories = await apiFetch("/categories");
      const cat = categories.find((c) => c.slug === categorySlug);
      const label = cat ? cat.name : categorySlug;
      titleEl.textContent = label;
      crumbEl.textContent = label;
      document.title = `${label} — DokanCast Mart`;
      if (cat) showCategoryBanner(cat);
    } else {
      hideCategoryBanner();
      products = await apiFetch("/products");
      if (search) {
        const q = search.toLowerCase();
        products = products.filter((p) => p.name.toLowerCase().includes(q));
        titleEl.textContent = `Search: "${search}"`;
        crumbEl.textContent = "Search";
      } else {
        titleEl.textContent = "All products";
      }
    }

    if (products.length === 0) {
      grid.innerHTML = `<div class="empty-state">No products found${search ? ` for "${escapeHtml(search)}"` : ""}.</div>`;
      return;
    }

    grid.innerHTML = products.map(productCardWithAddButton).join("");
    grid.querySelectorAll("[data-add-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const product = products.find((p) => p.id === Number(btn.dataset.addId));
        addToCart(product, 1);
        toastAddedToCart(product.name);
      });
    });
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load products — is the API running? (${err.message})</div>`;
  }
}

loadNavbar();
loadProducts();
