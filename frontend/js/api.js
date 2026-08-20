// Same-origin default — works because the FastAPI backend serves this
// frontend itself via StaticFiles. Change this one line if you ever host
// the frontend separately from the API.
const API_BASE_URL = "";
const API_PREFIX = "/api/v1";

/**
 * Wraps fetch with the API prefix, JSON handling, and auth header injection.
 * Throws an Error with a readable message on non-2xx responses so callers
 * can just try/catch instead of manually checking res.ok everywhere.
 */
async function apiFetch(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body / not JSON — fine for some 204s, not fine if !res.ok (handled below)
  }

  if (!res.ok) {
    throw new Error(describeApiError(data) || `Request failed (${res.status})`);
  }
  return data;
}

function describeApiError(body) {
  if (!body || !body.detail) return null;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) {
    return body.detail.map((e) => `${(e.loc || []).slice(-1)[0] ?? "field"}: ${e.msg}`).join("; ");
  }
  return null;
}

async function apiFetchForm(path, formBody) {
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(describeApiError(data) || `Request failed (${res.status})`);
  return data;
}

// --- shared HTML-building helpers, used across home/products/product/cart ---

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function productImgTag(product) {
  return `<img src="images/products/${product.image_filename}" alt="${escapeHtml(product.name)}"
            onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'placeholder-thumb', textContent:'${escapeHtml(product.name)}'}))">`;
}
