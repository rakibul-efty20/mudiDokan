const TOKEN_KEY = "supershop_token";
const USER_KEY = "supershop_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

function getCachedUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function login(email, password) {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);
  const tokenData = await apiFetchForm("/auth/login", form);
  const me = await fetchMeWithToken(tokenData.access_token);
  setSession(tokenData.access_token, me);
  return me;
}

async function fetchMeWithToken(token) {
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Could not load account details");
  return res.json();
}

async function register(email, password) {
  await apiFetch("/auth/register", { method: "POST", body: { email, password } });
  return login(email, password);
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}
