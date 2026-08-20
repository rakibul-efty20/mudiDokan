function redirectTarget() {
  const next = new URLSearchParams(window.location.search).get("next");
  // Guard against an open-redirect-style value — only allow same-site,
  // known page names, never an absolute URL some link could smuggle in.
  const allowed = ["index.html", "products.html", "cart.html", "checkout.html", "product.html"];
  return allowed.includes(next) ? next : "index.html";
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("loginError");
  errorEl.classList.add("d-none");
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "Logging in\u2026";

  try {
    await login(
      document.getElementById("loginEmail").value.trim(),
      document.getElementById("loginPassword").value
    );
    window.location.href = redirectTarget();
  } catch (err) {
    errorEl.textContent = err.message || "Login failed";
    errorEl.classList.remove("d-none");
    btn.disabled = false;
    btn.textContent = "Log in";
  }
}

document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
loadNavbar();
