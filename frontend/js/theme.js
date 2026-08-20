const THEME_KEY = "supershop_theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
  const icon = document.getElementById("themeIcon");
  if (icon) icon.textContent = theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"; // sun / moon
}

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-bs-theme");
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

// Applied immediately (not on DOMContentLoaded) to avoid a flash of the
// wrong theme while the rest of the page is still parsing.
applyTheme(getStoredTheme());
