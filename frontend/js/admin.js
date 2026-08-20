let allProducts = [];
let allCategories = [];
let editingProductId = null;

function checkAdminAccess() {
  const user = getCachedUser();
  const allowed = isLoggedIn() && user && user.role === "admin";
  document.getElementById("accessDenied").classList.toggle("d-none", allowed);
  document.getElementById("adminMain").classList.toggle("d-none", !allowed);
  return allowed;
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

function categoryName(categoryId) {
  return allCategories.find((c) => c.id === categoryId)?.name || "—";
}

function inventoryRowHtml(product) {
  if (product.id === editingProductId) {
    return `
      <tr>
        <td>${escapeHtml(product.name)}</td>
        <td class="text-secondary small">${escapeHtml(categoryName(product.category_id))}</td>
        <td><input type="text" inputmode="numeric" pattern="[0-9]*" class="form-control form-control-sm" id="editPrice" value="${product.price}" style="width:90px;"></td>
        <td><input type="text" inputmode="numeric" pattern="[0-9]*" class="form-control form-control-sm" id="editStock" value="${product.stock}" style="width:80px;"></td>
        <td class="text-end">
          <button class="btn btn-sm btn-primary" data-save-id="${product.id}">Save</button>
          <button class="btn btn-sm btn-outline-secondary" data-cancel-edit>Cancel</button>
        </td>
      </tr>`;
  }
  return `
    <tr>
      <td>${escapeHtml(product.name)}</td>
      <td class="text-secondary small">${escapeHtml(categoryName(product.category_id))}</td>
      <td>Tk ${product.price.toFixed(0)}</td>
      <td class="${product.stock < 10 ? "stock-badge low" : ""}">${product.stock}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" data-edit-id="${product.id}">Edit</button>
      </td>
    </tr>`;
}

function renderInventory() {
  const search = document.getElementById("invSearch").value.trim().toLowerCase();
  const categoryFilter = document.getElementById("invCategoryFilter").value;

  let filtered = allProducts;
  if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  if (categoryFilter) filtered = filtered.filter((p) => p.category_id === Number(categoryFilter));

  document.getElementById("invCount").textContent = `${filtered.length} of ${allProducts.length} products`;
  document.getElementById("inventoryBody").innerHTML = filtered.map(inventoryRowHtml).join("");
}

async function saveProductEdit(productId) {
  const price = parseInt(document.getElementById("editPrice").value, 10);
  const stock = parseInt(document.getElementById("editStock").value, 10);
  try {
    const updated = await apiFetch(`/admin/products/${productId}`, {
      method: "PATCH", auth: true, body: { price, stock },
    });
    const idx = allProducts.findIndex((p) => p.id === productId);
    allProducts[idx] = updated;
    editingProductId = null;
    renderInventory();
  } catch (err) {
    alert(`Couldn't save: ${err.message}`);
  }
}

function wireInventoryEvents() {
  ["invSearch"].forEach((id) => document.getElementById(id).addEventListener("input", renderInventory));
  document.getElementById("invCategoryFilter").addEventListener("change", renderInventory);

  // Event delegation on the table body — 167 rows is too many to attach
  // individual listeners to on every re-render.
  document.getElementById("inventoryBody").addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit-id]");
    const saveBtn = e.target.closest("[data-save-id]");
    const cancelBtn = e.target.closest("[data-cancel-edit]");

    if (editBtn) {
      editingProductId = Number(editBtn.dataset.editId);
      renderInventory();
    } else if (saveBtn) {
      saveProductEdit(Number(saveBtn.dataset.saveId));
    } else if (cancelBtn) {
      editingProductId = null;
      renderInventory();
    }
  });

  document.getElementById("inventoryBody").addEventListener("input", (e) => {
    if (e.target.id === "editPrice" || e.target.id === "editStock") {
      e.target.value = e.target.value.replace(/[^0-9]/g, "");
    }
  });
}

async function loadInventory() {
  try {
    [allProducts, allCategories] = await Promise.all([
      apiFetch("/products"),
      apiFetch("/categories"),
    ]);
    const filterSelect = document.getElementById("invCategoryFilter");
    allCategories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      filterSelect.appendChild(opt);
    });
    renderInventory();
  } catch (err) {
    document.getElementById("inventoryBody").innerHTML =
      `<tr><td colspan="5" class="empty-state">Couldn't load products (${err.message})</td></tr>`;
  }
}

// ---------------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------------

function promoRowHtml(promo) {
  const valueLabel = promo.discount_type === "percentage" ? `${promo.discount_value}%` : `Tk ${promo.discount_value}`;
  return `
    <tr>
      <td><code>${escapeHtml(promo.code)}</code></td>
      <td class="text-capitalize small">${promo.discount_type}</td>
      <td>${valueLabel}</td>
      <td>${promo.active ? `<span class="badge text-bg-success">Active</span>` : `<span class="badge text-bg-secondary">Inactive</span>`}</td>
      <td class="text-end">
        ${promo.active ? `<button class="btn btn-sm btn-outline-danger" data-deactivate="${promo.id}">Deactivate</button>` : ""}
      </td>
    </tr>`;
}

async function loadPromoCodes() {
  try {
    const promos = await apiFetch("/admin/promo-codes", { auth: true });
    document.getElementById("promoBody").innerHTML = promos.length
      ? promos.map(promoRowHtml).join("")
      : `<tr><td colspan="5" class="empty-state">No promo codes yet.</td></tr>`;
  } catch (err) {
    document.getElementById("promoBody").innerHTML =
      `<tr><td colspan="5" class="empty-state">Couldn't load promo codes (${err.message})</td></tr>`;
  }
}

async function handlePromoSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("promoError");
  errorEl.classList.add("d-none");
  try {
    await apiFetch("/admin/promo-codes", {
      method: "POST", auth: true,
      body: {
        code: document.getElementById("promoCodeInput").value.trim().toUpperCase(),
        discount_type: document.getElementById("promoTypeInput").value,
        discount_value: Number(document.getElementById("promoValueInput").value),
      },
    });
    document.getElementById("promoForm").reset();
    await loadPromoCodes();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("d-none");
  }
}

function wirePromoEvents() {
  document.getElementById("promoForm").addEventListener("submit", handlePromoSubmit);
  document.getElementById("promoValueInput").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
  });
  document.getElementById("promoBody").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-deactivate]");
    if (!btn) return;
    try {
      await apiFetch(`/admin/promo-codes/${btn.dataset.deactivate}/deactivate`, { method: "PATCH", auth: true });
      await loadPromoCodes();
    } catch (err) {
      alert(`Couldn't deactivate: ${err.message}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Users & roles
// ---------------------------------------------------------------------------

function userRowHtml(user, currentUserId) {
  const isSelf = user.id === currentUserId;
  return `
    <tr>
      <td>${escapeHtml(user.email)}</td>
      <td><span class="badge text-bg-secondary text-capitalize">${user.role}</span></td>
      <td class="small text-secondary">${new Date(user.created_at).toLocaleDateString()}</td>
      <td>
        ${isSelf
          ? `<span class="small text-secondary">Can't change your own role</span>`
          : `<div class="d-flex gap-2">
               <select class="form-select form-select-sm" style="width:140px;" data-role-select="${user.id}">
                 <option value="customer" ${user.role === "customer" ? "selected" : ""}>Customer</option>
                 <option value="shopkeeper" ${user.role === "shopkeeper" ? "selected" : ""}>Shopkeeper</option>
                 <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
               </select>
               <button class="btn btn-sm btn-outline-primary" data-save-role="${user.id}">Save</button>
             </div>`}
      </td>
    </tr>`;
}

async function loadUsers() {
  const me = getCachedUser();
  try {
    const users = await apiFetch("/admin/users", { auth: true });
    document.getElementById("usersBody").innerHTML = users.map((u) => userRowHtml(u, me.id)).join("");
  } catch (err) {
    document.getElementById("usersBody").innerHTML =
      `<tr><td colspan="4" class="empty-state">Couldn't load users (${err.message})</td></tr>`;
  }
}

function wireUsersEvents() {
  document.getElementById("usersBody").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-save-role]");
    if (!btn) return;
    const userId = btn.dataset.saveRole;
    const select = document.querySelector(`[data-role-select="${userId}"]`);
    try {
      await apiFetch(`/admin/users/${userId}/role`, { method: "PATCH", auth: true, body: { role: select.value } });
      await loadUsers();
    } catch (err) {
      alert(`Couldn't update role: ${err.message}`);
    }
  });
}

// ---------------------------------------------------------------------------

loadNavbar();
if (checkAdminAccess()) {
  wireInventoryEvents();
  wirePromoEvents();
  wireUsersEvents();
  loadInventory();
  loadPromoCodes();
  loadUsers();
}
