const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatTk(n) {
  return `Tk ${Math.round(n).toLocaleString()}`;
}

function checkAccess() {
  const user = getCachedUser();
  const allowed = isLoggedIn() && user && (user.role === "shopkeeper" || user.role === "admin");
  document.getElementById("accessDenied").classList.toggle("d-none", allowed);
  document.getElementById("dashboardMain").classList.toggle("d-none", !allowed);
  return allowed;
}

async function loadEarnings() {
  try {
    const data = await apiFetch("/earnings", { auth: true });
    document.getElementById("statTotal").textContent = formatTk(data.total_earnings);
    document.getElementById("statMonth").textContent = formatTk(data.this_month);
    document.getElementById("statWeek").textContent = formatTk(data.this_week);
    document.getElementById("statOrders").textContent = data.order_count;
  } catch (err) {
    ["statTotal", "statMonth", "statWeek", "statOrders"].forEach((id) => {
      document.getElementById(id).textContent = "—";
    });
    document.getElementById("earningsCards").insertAdjacentHTML(
      "afterend",
      `<div class="alert alert-danger small">Couldn't load earnings: ${err.message}</div>`
    );
  }
}

async function loadCatalog() {
  try {
    const data = await apiFetch("/forecast/items", { auth: true });
    const list = document.getElementById("itemOptions");
    data.all_items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item;
      list.appendChild(opt);
    });
    document.getElementById("catalogCount").textContent = `(${data.all_items.length} items)`;
  } catch {
    document.getElementById("catalogCount").textContent = "(catalog unavailable)";
  }
}

function renderChart(result) {
  const values = result.monthly.map((m) => m.quantity);
  const maxVal = Math.max(...values, 1);
  const peakMonth = result.monthly.reduce((a, b) => (b.quantity > a.quantity ? b : a));

  const barsEl = document.getElementById("chartBars");
  const labelsEl = document.getElementById("chartLabels");
  barsEl.innerHTML = "";
  labelsEl.innerHTML = "";

  result.monthly.forEach((m) => {
    const bar = document.createElement("div");
    bar.className = "chart-bar" + (m.month === peakMonth.month ? " is-peak" : "");
    bar.style.height = "0%";
    const valueLabel = document.createElement("span");
    valueLabel.className = "bar-value";
    valueLabel.textContent = m.quantity;
    bar.appendChild(valueLabel);
    barsEl.appendChild(bar);
    requestAnimationFrame(() => {
      bar.style.height = `${Math.max((m.quantity / maxVal) * 100, 2)}%`;
    });

    const label = document.createElement("span");
    label.textContent = MONTH_LABELS[m.month - 1];
    labelsEl.appendChild(label);
  });

  document.getElementById("chartTotal").textContent =
    `${result.total} units predicted for ${result.year} · peak: ${MONTH_LABELS[peakMonth.month - 1]}`;

  document.getElementById("chartEmpty").classList.add("d-none");
  document.getElementById("chartReady").classList.remove("d-none");
}

async function handleForecastSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("forecastError");
  errorEl.classList.add("d-none");
  const btn = document.getElementById("forecastBtn");
  btn.disabled = true;
  document.getElementById("forecastBtnLabel").textContent = "Forecasting\u2026";

  try {
    const result = await apiFetch("/forecast/predict", {
      method: "POST",
      auth: true,
      body: {
        item: document.getElementById("itemInput").value.trim(),
        year: Number(document.getElementById("yearInput").value),
      },
    });
    renderChart(result);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    document.getElementById("forecastBtnLabel").textContent = "Forecast the year";
  }
}

document.getElementById("yearInput").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, "");
});

loadNavbar();
if (checkAccess()) {
  loadEarnings();
  loadCatalog();
  document.getElementById("forecastForm").addEventListener("submit", handleForecastSubmit);
}
