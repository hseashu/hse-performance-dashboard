/****************************************************
 * HSE PERFORMANCE DASHBOARD
 * Site Management Module (Frontend)
 * Version: 1.0.0
 *
 * Handles:
 *   - Admin full site list (adminList)
 *   - Add new site (existing backend: sites.create)
 *   - Edit site (new backend: sites.update)
 *   - Activate/Deactivate (new backend: sites.toggle)
 *
 * Depends on globals exposed by app.js:
 *   window.__hse (apiRequest, state, $, escapeHTML, showMessage)
 ****************************************************/

function smModule() {
  const H = window.__hse;

  if (!H) {
    console.error("HSE runtime not initialized");
    return;
  }

  const { apiRequest, state, $, escapeHTML, showMessage } = H;

  /* =====================================================
     1. RENDERERS
  ===================================================== */

  function renderContainer(html) {
    const container = $("other-page-content");
    if (!container) return;

    const placeholder = container.closest(".page-placeholder");
    if (placeholder) {
      // Hide placeholder styling for full-width module UI
      placeholder.classList.remove("page-placeholder");
    }

    container.innerHTML = html;
  }

  function renderDenied() {
    renderContainer(
      '<p class="message error">Access denied. Admin only.</p>'
    );
  }

  function renderList(sites) {
    const rows = sites.map(site => {
      const isActive =
        String(site.status || "").toLowerCase() === "active";

      return `
        <tr data-site-id="${escapeHTML(site.siteId)}">
          <td><strong>${escapeHTML(site.siteName)}</strong><br>
              <small>${escapeHTML(site.siteId)}</small></td>
          <td>${escapeHTML(site.projectCapacity || "—")}</td>
          <td>${escapeHTML(site.location || "—")}</td>
          <td>${escapeHTML(site.state || "—")}</td>
          <td>${escapeHTML(site.country || "—")}</td>
          <td>${escapeHTML(site.startDate || "—")}</td>
          <td>${escapeHTML(site.lastLtiDate || "—")}</td>
          <td>
            <span class="status-pill ${isActive ? "active" : "inactive"}">
              ${isActive ? "Active" : "Inactive"}
            </span>
          </td>
          <td class="actions-cell">
            <button class="btn-small btn-edit" data-action="edit">Edit</button>
            <button class="btn-small ${isActive ? "btn-deactivate" : "btn-activate"}"
                    data-action="toggle">
              ${isActive ? "Deactivate" : "Activate"}
            </button>
          </td>
        </tr>
      `;
    }).join("");

    renderContainer(`
      <div class="site-mgmt-header">
        <div>
          <h3>All Project Sites</h3>
          <p>${sites.length} site(s) registered</p>
        </div>
        <button class="primary-button" id="sm-add-btn">+ Add New Site</button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Site</th>
              <th>Capacity</th>
              <th>Location</th>
              <th>State</th>
              <th>Country</th>
              <th>Start Date</th>
              <th>Last LTI</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `);

    bindListEvents(sites);
  }

  function renderEmpty() {
    renderContainer(`
      <div class="empty-state">
        <h3>No Sites Created</h3>
        <p>Create your first project site to get started.</p>
        <button class="primary-button" id="sm-add-btn">+ Add New Site</button>
      </div>
    `);

    $("sm-add-btn").addEventListener("click", () => renderForm(null));
  }

  function renderForm(site) {
    const isEdit = !!site;

    const value = (key, fallback = "") => {
      if (!site) return "";
      return site[key] !== undefined && site[key] !== null
        ? String(site[key])
        : fallback;
    };

    renderContainer(`
      <div class="site-mgmt-header">
        <div>
          <h3>${isEdit ? "Edit Site" : "Add New Site"}</h3>
          <p>${isEdit ? escapeHTML(site.siteName) : "Create a new project site"}</p>
        </div>
        <button class="btn-small" id="sm-back-btn">← Back</button>
      </div>

      <form id="sm-form" class="sm-form">
        <div class="sm-form-grid">
          <div class="sm-field">
            <label>Site Name *</label>
            <input type="text" name="siteName" maxlength="120"
                   value="${escapeHTML(value("siteName"))}" required>
          </div>

          <div class="sm-field">
            <label>Project Capacity</label>
            <input type="text" name="capacity" maxlength="100"
                   value="${escapeHTML(value("projectCapacity"))}">
          </div>

          <div class="sm-field">
            <label>Location *</label>
            <input type="text" name="location" maxlength="150"
                   value="${escapeHTML(value("location"))}" required>
          </div>

          <div class="sm-field">
            <label>State *</label>
            <input type="text" name="state" maxlength="100"
                   value="${escapeHTML(value("state"))}" required>
          </div>

          <div class="sm-field">
            <label>Country *</label>
            <input type="text" name="country" maxlength="100"
                   value="${escapeHTML(value("country") || "India")}" required>
          </div>

          <div class="sm-field">
            <label>Start Date</label>
            <input type="date" name="startDate"
                   value="${escapeHTML(value("startDate"))}">
          </div>
        </div>

        <div id="sm-form-msg" class="message"></div>

        <div class="sm-form-actions">
          <button type="button" class="btn-small" id="sm-cancel-btn">Cancel</button>
          <button type="submit" class="primary-button" id="sm-submit-btn">
            ${isEdit ? "Update Site" : "Create Site"}
          </button>
        </div>
      </form>
    `);

    $("sm-back-btn").addEventListener("click", () => reloadList());
    $("sm-cancel-btn").addEventListener("click", () => reloadList());
    $("sm-form").addEventListener("submit", event => {
      event.preventDefault();
      submitForm(site);
    });
  }

  /* =====================================================
     2. EVENTS
  ===================================================== */

  function bindListEvents(sites) {
    const addBtn = $("sm-add-btn");
    if (addBtn) addBtn.addEventListener("click", () => renderForm(null));

    const tbody = document.querySelector("#other-page-content tbody");
    if (!tbody) return;

    tbody.addEventListener("click", async event => {
      const btn = event.target.closest("[data-action]");
      if (!btn) return;

      const tr = btn.closest("tr");
      const siteId = tr?.dataset.siteId;
      if (!siteId) return;

      const site = sites.find(s => s.siteId === siteId);
      if (!site) return;

      if (btn.dataset.action === "edit") {
        renderForm(site);
      }

      if (btn.dataset.action === "toggle") {
        const isActive =
          String(site.status || "").toLowerCase() === "active";
        const target = isActive ? "Inactive" : "Active";
        await toggleSite(siteId, target, btn);
      }
    });
  }

  function setFormMsg(text, type) {
    const el = $("sm-form-msg");
    if (!el) return;
    el.textContent = text;
    el.className = "message " + (type || "");
  }

  /* =====================================================
     3. API CALLS
  ===================================================== */

  async function loadList() {
    if (state.profile?.role?.toLowerCase() !== "admin") {
      renderDenied();
      return;
    }

    try {
      renderContainer('<p>Loading sites...</p>');

      const result = await apiRequest("sites.adminList");
      const sites = Array.isArray(result.sites) ? result.sites : [];

      // Sync into global state so other modules see them
      state.sites = sites;

      if (!sites.length) {
        renderEmpty();
      } else {
        renderList(sites);
      }

    } catch (error) {
      console.error("sites.adminList failed:", error);
      renderContainer(
        '<p class="message error">Unable to load sites. ' +
        escapeHTML(error.message || "") + "</p>"
      );
    }
  }

  function reloadList() {
    return loadList();
  }

  async function submitForm(originalSite) {
    const form = $("sm-form");
    const submitBtn = $("sm-submit-btn");
    if (!form || !submitBtn) return;

    const fd = new FormData(form);
    const payload = {
      siteName: String(fd.get("siteName") || "").trim(),
      capacity: String(fd.get("capacity") || "").trim(),
      location: String(fd.get("location") || "").trim(),
      state: String(fd.get("state") || "").trim(),
      country: String(fd.get("country") || "").trim(),
      startDate: String(fd.get("startDate") || "").trim()
    };

    if (!payload.siteName || !payload.location || !payload.state || !payload.country) {
      setFormMsg("Please fill all required fields.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
      if (originalSite) {
        await apiRequest("sites.update", {
          site: { siteId: originalSite.siteId, ...payload }
        });
        showMessage("Site updated.", "success");
      } else {
        await apiRequest("sites.create", { site: payload });
        showMessage("Site created.", "success");
      }

      await loadList();

    } catch (error) {
      console.error("Save site failed:", error);
      setFormMsg(
        "Save failed: " + (error.message || "Unknown error"),
        "error"
      );

    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalSite ? "Update Site" : "Create Site";
    }
  }

  async function toggleSite(siteId, targetStatus, btn) {
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      await apiRequest("sites.toggle", {
        site: { siteId, status: targetStatus }
      });

      showMessage("Site " + targetStatus.toLowerCase() + ".", "success");
      await loadList();

    } catch (error) {
      console.error("sites.toggle failed:", error);
      showMessage(
        "Failed: " + (error.message || "Unknown error"),
        "error"
      );
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  /* =====================================================
     4. PUBLIC API
  ===================================================== */

  return {
    render() {
      return loadList();
    }
  };
}

/* =====================================================
   5. REGISTER GLOBALLY
===================================================== */

window.__hseSiteManagement = smModule;
