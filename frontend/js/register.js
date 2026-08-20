async function handleRegisterSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("registerError");
  errorEl.classList.add("d-none");
  const btn = document.getElementById("registerBtn");
  btn.disabled = true;
  btn.textContent = "Creating account\u2026";

  try {
    await register(
      document.getElementById("regEmail").value.trim(),
      document.getElementById("regPassword").value
    );
    window.location.href = "index.html";
  } catch (err) {
    errorEl.textContent = err.message || "Registration failed";
    errorEl.classList.remove("d-none");
    btn.disabled = false;
    btn.textContent = "Create account";
  }
}

document.getElementById("registerForm").addEventListener("submit", handleRegisterSubmit);
loadNavbar();
