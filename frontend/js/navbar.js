async function loadNavbar() {
  const mount = document.getElementById("navbarMount");
  if (!mount) return;

  const res = await fetch("partials/navbar.html");
  mount.innerHTML = await res.text();

  wireThemeToggle();
  wireAuthArea();
  wireSearch();
  updateCartBadge();
  await loadCategoryLinks();
  fixBodyPaddingForFixedNavbar();
}

function fixBodyPaddingForFixedNavbar() {
  const nav = document.querySelector(".site-navbar-fixed");
  if (!nav) return;
  const apply = () => { document.body.style.paddingTop = `${nav.offsetHeight}px`; };
  apply();
  window.addEventListener("resize", apply);
}

function wireThemeToggle() {
  const btn = document.getElementById("themeToggleBtn");
  applyTheme(getStoredTheme()); // re-apply now the icon element exists
  btn?.addEventListener("click", toggleTheme);
}

function wireAuthArea() {
  const loggedOut = document.getElementById("authAreaLoggedOut");
  const loggedIn = document.getElementById("authAreaLoggedIn");
  const user = getCachedUser();

  const loginLink = loggedOut?.querySelector("a");
  if (loginLink) {
    loginLink.href = `login.html?next=${encodeURIComponent(window.location.pathname.split("/").pop() || "index.html")}`;
  }

  if (isLoggedIn() && user) {
    loggedOut.classList.add("d-none");
    loggedIn.classList.remove("d-none");
    document.getElementById("navUserEmail").textContent = user.email;
    document.getElementById("navUserRole").textContent = `Role: ${user.role}`;
    document.getElementById("navLogoutBtn").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
    if (user.role === "shopkeeper" || user.role === "admin") {
      document.getElementById("dashboardNavItem")?.classList.remove("d-none");
    }
    if (user.role === "admin") {
      document.getElementById("adminNavItem")?.classList.remove("d-none");
    }
  } else {
    loggedOut.classList.remove("d-none");
    loggedIn.classList.add("d-none");
  }
}

function wireSearch() {
  const form = document.getElementById("navSearchForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("navSearchInput").value.trim();
    if (q) window.location.href = `products.html?search=${encodeURIComponent(q)}`;
  });
}

async function loadCategoryLinks() {
  const menu = document.getElementById("categoryDropdownMenu");
  try {
    const categories = await apiFetch("/categories");
    categories.forEach((cat) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.className = "dropdown-item";
      a.href = `products.html?category=${encodeURIComponent(cat.slug)}`;
      a.textContent = cat.name;
      li.appendChild(a);
      menu.appendChild(li);
    });
  } catch {
    // Catalog endpoint unreachable — nav still works, just without category
    // links; every page's own loader will surface the real error.
  }
}
