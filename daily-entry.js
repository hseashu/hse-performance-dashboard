/****************************************************
 * HSE PERFORMANCE DASHBOARD
 * Daily Data Entry Module (Frontend)
 * Version: 1.0.0
 *
 * Tabs:
 *   1. Daily HSE Data  -> daily.save
 *   2. Activities      -> activities.save
 *   3. Compliance      -> compliance.save
 *
 * Depends on:
 *   window.__hse (apiRequest, state, $, escapeHTML, showMessage)
 *   window.__hseLoader (show, hide, buttonBusy)
 ****************************************************/

function deModule() {
  const H = window.__hse;
  if (!H) {
    console.error("HSE runtime not initialized");
    return;
  }

  const { apiRequest, state, $, escapeHTML, showMessage } = H;
  const L = window.__hseLoader;

  const ACTIVITY_TYPES = [
    "Toolbox Talks Conducted",
    "Safety Trainings",
    "Safety Inspections",
    "Safety Audits",
    "Emergency Drills"
  ];

  let activeTab = "daily"; // "daily" | "activities" | "compliance"

  /* =====================================================
     1. HELPERS
  ===================================================== */

  function todayISO() {
    const now = new Date();
    const tz = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const d = new Date(tz);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function currentSiteId() {
    if (state.profile?.role?.toLowerCase() === "admin") {
      return state.selectedSite || "";
    }
    return state.profile?.siteId || "";
  }

  function setMsg(id, text, type) {
    const el = $(id);
    if (!el) return;
    el.textContent = text || "";
    el.className = "message " + (type || "");
  }

  function numberOrZero(v) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  /* =====================================================
     2. RENDER SHELL (tabs + forms)
  ===================================================== */

  function renderContainer(html) {
    const container = $("other-page-content");
    if (!container) return;

    const placeholder = container.closest(".page-placeholder");
    if (placeholder) placeholder.classList.remove("page-placeholder");

    container.innerHTML = html;
  }

  function renderShell() {
    const siteId = currentSiteId();

    if (!siteId) {
      renderContainer(
        '<p class="message error">No site selected. Please select a project site from the top bar.</p>'
      );
      return;
    }

    renderContainer(`
      <div class="de-header">
        <div>
          <h3>Daily Data Entry</h3>
          <p>Site: <strong id="de-site-label">${escapeHTML(siteId)}</strong></p>
        </div>
        <div class="de-tabs">
          <button class="de-tab active" data-tab="daily">Daily HSE</button>
          <button class="de-tab" data-tab="activities">Activities</button>
          <button class="de-tab" data-tab="compliance">Compliance</button>
        </div>
      </div>

      <div id="de-tab-content"></div>
    `);

    document.querySelectorAll(".de-tab").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        activeTab = tabBtn.dataset.tab;
        document.querySelectorAll(".de-tab").forEach(b =>
          b.classList.toggle("active", b.dataset.tab === activeTab)
        );
        renderTabContent();
      });
    });

    renderTabContent();
  }

  function renderTabContent() {
    if (activeTab === "daily") return renderDailyTab();
    if (activeTab === "activities") return renderActivitiesTab();
    if (activeTab === "compliance") return renderComplianceTab();
  }

  /* =====================================================
     3. TAB 1 — DAILY HSE
  ===================================================== */

  function renderDailyTab() {
    const container = $("de-tab-content");
    if (!container) return;

    container.innerHTML = `
      <form id="de-daily-form" class="de-form">
        <div class="de-form-grid">
          <div class="sm-field">
            <label>Date *</label>
            <input type="date" name="date" value="${todayISO()}" required>
          </div>

          <div class="sm-field">
            <label>Fatality</label>
            <input type="number" name="Fatality" min="0" value="0">
          </div>

          <div class="sm-field">
            <label>LTI</label>
            <input type="number" name="LTI" min="0" value="0">
          </div>

          <div class="sm-field">
            <label>MTC</label>
            <input type="number" name="MTC" min="0" value="0">
          </div>

          <div class="sm-field">
            <label>FAC</label>
            <input type="number" name="FAC" min="0" value="0">
          </div>

          <div class="sm-field">
            <label>Near Miss</label>
            <input type="number" name="Near_Miss" min="0" value="0">
          </div>

          <div class="sm-field">
            <label>Unsafe Acts</label>
            <input type="number" name="Unsafe_Acts" min="0" value="0">
          </div>

          <div class="sm-field">
            <label>Unsafe Conditions</label>
            <input type="number" name="Unsafe_Conditions" min="0" value="0">
          </div>

          <div class="sm-field">
            <label>Manpower</label>
            <input type="number" name="Manpower" min="0" value="0">
          </div>

          <div class="sm-field">
            <label>Working Hours (per person)</label>
            <input type="number" name="Working_Hours" min="0" max="24" step="0.5" value="8">
          </div>

          <div class="sm-field de-field-wide">
            <label>Remarks</label>
            <textarea name="Remarks" rows="2" maxlength="1000"></textarea>
          </div>
        </div>

        <div id="de-daily-msg" class="message"></div>

        <div class="sm-form-actions">
          <button type="submit" class="primary-button" id="de-daily-submit">
            Save Daily Record
          </button>
        </div>
      </form>

      <div class="de-calc-preview" id="de-calc-preview">
        <strong>Daily Manhours:</strong> <span id="de-manhours">0</span>
        <small>(Manpower × Working Hours — calculated on server)</small>
      </div>
    `;

    const form = $("de-daily-form");
    const manHours = $("de-manhours");

    const updatePreview = () => {
      const fd = new FormData(form);
      const m = numberOrZero(fd.get("Manpower"));
      const h = numberOrZero(fd.get("Working_Hours"));
      if (manHours) manHours.textContent = (m * h).toLocaleString();
    };

    form.addEventListener("input", updatePreview);
    updatePreview();

    form.addEventListener("submit", submitDaily);
  }

  async function submitDaily(event) {
    event.preventDefault();

    const form = $("de-daily-form");
    const submitBtn = $("de-daily-submit");
    const siteId = currentSiteId();

    if (!siteId) {
      setMsg("de-daily-msg", "No site selected.", "error");
      return;
    }

    const fd = new FormData(form);
    const date = String(fd.get("date") || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setMsg("de-daily-msg", "Please select a valid date.", "error");
      return;
    }

    const data = {
      Fatality: numberOrZero(fd.get("Fatality")),
      LTI: numberOrZero(fd.get("LTI")),
      MTC: numberOrZero(fd.get("MTC")),
      FAC: numberOrZero(fd.get("FAC")),
      Near_Miss: numberOrZero(fd.get("Near_Miss")),
      Unsafe_Acts: numberOrZero(fd.get("Unsafe_Acts")),
      Unsafe_Conditions: numberOrZero(fd.get("Unsafe_Conditions")),
      Manpower: numberOrZero(fd.get("Manpower")),
      Working_Hours: numberOrZero(fd.get("Working_Hours")),
      Remarks: String(fd.get("Remarks") || "").trim()
    };

    if (data.Working_Hours > 24) {
      setMsg("de-daily-msg", "Working Hours cannot exceed 24.", "error");
      return;
    }

    setMsg("de-daily-msg", "", "");
    if (L) L.show("Saving daily record...");
    if (L) L.buttonBusy(submitBtn, true, "Saving...");

    try {
      await apiRequest("daily.save", {
        siteId,
        date,
        data
      });

      setMsg("de-daily-msg", "Daily record saved successfully.", "success");
      showMessage("Daily record saved.", "success");

      if (L) L.hide();
      await refreshDashboard();

    } catch (error) {
      console.error("daily.save failed:", error);
      setMsg(
        "de-daily-msg",
        "Save failed: " + (error.message || "Unknown error"),
        "error"
      );

    } finally {
      if (L) L.buttonBusy(submitBtn, false);
      if (L) L.hide();
    }
  }

  /* =====================================================
     4. TAB 2 — ACTIVITIES
  ===================================================== */

  function renderActivitiesTab() {
    const container = $("de-tab-content");
    if (!container) return;

    container.innerHTML = `
      <form id="de-act-form" class="de-form">
        <div class="de-form-grid">
          <div class="sm-field">
            <label>Date *</label>
            <input type="date" name="date" value="${todayISO()}" required>
          </div>

          <div class="sm-field">
            <label>Activity Type *</label>
            <select name="activityType" required>
              ${ACTIVITY_TYPES.map(t => `<option value="${t}">${t}</option>`).join("")}
            </select>
          </div>

          <div class="sm-field">
            <label>Count *</label>
            <input type="number" name="count" min="0" value="0" required>
          </div>

          <div class="sm-field de-field-wide">
            <label>Remarks</label>
            <textarea name="remarks" rows="2" maxlength="1000"></textarea>
          </div>
        </div>

        <div id="de-act-msg" class="message"></div>

        <div class="sm-form-actions">
          <button type="submit" class="primary-button" id="de-act-submit">
            Save Activity
          </button>
        </div>
      </form>
    `;

    $("de-act-form").addEventListener("submit", submitActivity);
  }

  async function submitActivity(event) {
    event.preventDefault();

    const form = $("de-act-form");
    const submitBtn = $("de-act-submit");
    const siteId = currentSiteId();

    if (!siteId) {
      setMsg("de-act-msg", "No site selected.", "error");
      return;
    }

    const fd = new FormData(form);
    const date = String(fd.get("date") || "").trim();
    const activityType = String(fd.get("activityType") || "").trim();
    const count = numberOrZero(fd.get("count"));
    const remarks = String(fd.get("remarks") || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setMsg("de-act-msg", "Please select a valid date.", "error");
      return;
    }

    if (!activityType) {
      setMsg("de-act-msg", "Activity type is required.", "error");
      return;
    }

    if (count < 0) {
      setMsg("de-act-msg", "Count cannot be negative.", "error");
      return;
    }

    setMsg("de-act-msg", "", "");
    if (L) L.show("Saving activity...");
    if (L) L.buttonBusy(submitBtn, true, "Saving...");

    try {
      await apiRequest("activities.save", {
        siteId,
        date,
        data: { activityType, count, remarks }
      });

      setMsg("de-act-msg", "Activity saved successfully.", "success");
      showMessage("Activity saved.", "success");

      form.reset();
      const dateInput = form.querySelector('input[name="date"]');
      if (dateInput) dateInput.value = todayISO();

      if (L) L.hide();
      await refreshDashboard();

    } catch (error) {
      console.error("activities.save failed:", error);
      setMsg(
        "de-act-msg",
        "Save failed: " + (error.message || "Unknown error"),
        "error"
      );

    } finally {
      if (L) L.buttonBusy(submitBtn, false);
      if (L) L.hide();
    }
  }

  /* =====================================================
     5. TAB 3 — COMPLIANCE
  ===================================================== */

  function renderComplianceTab() {
    const container = $("de-tab-content");
    if (!container) return;

    container.innerHTML = `
      <form id="de-comp-form" class="de-form">
        <div class="de-form-grid">
          <div class="sm-field">
            <label>Date *</label>
            <input type="date" name="date" value="${todayISO()}" required>
          </div>

          <div class="sm-field">
            <label>Observations Closed *</label>
            <input type="number" name="observationsClosed" min="0" value="0" required>
          </div>

          <div class="sm-field de-field-wide">
            <label>Remarks</label>
            <textarea name="remarks" rows="2" maxlength="1000"></textarea>
          </div>
        </div>

        <p class="de-hint">
          Observations Raised is calculated automatically from Unsafe Acts + Unsafe Conditions in the Daily Log.
        </p>

        <div id="de-comp-msg" class="message"></div>

        <div class="sm-form-actions">
          <button type="submit" class="primary-button" id="de-comp-submit">
            Save Compliance Record
          </button>
        </div>
      </form>
    `;

    $("de-comp-form").addEventListener("submit", submitCompliance);
  }

  async function submitCompliance(event) {
    event.preventDefault();

    const form = $("de-comp-form");
    const submitBtn = $("de-comp-submit");
    const siteId = currentSiteId();

    if (!siteId) {
      setMsg("de-comp-msg", "No site selected.", "error");
      return;
    }

    const fd = new FormData(form);
    const date = String(fd.get("date") || "").trim();
    const observationsClosed = numberOrZero(fd.get("observationsClosed"));
    const remarks = String(fd.get("remarks") || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setMsg("de-comp-msg", "Please select a valid date.", "error");
      return;
    }

    setMsg("de-comp-msg", "", "");
    if (L) L.show("Saving compliance record...");
    if (L) L.buttonBusy(submitBtn, true, "Saving...");

    try {
      await apiRequest("compliance.save", {
        siteId,
        date,
        data: { observationsClosed, remarks }
      });

      setMsg("de-comp-msg", "Compliance record saved successfully.", "success");
      showMessage("Compliance record saved.", "success");

      form.reset();
      const dateInput = form.querySelector('input[name="date"]');
      if (dateInput) dateInput.value = todayISO();

      if (L) L.hide();
      await refreshDashboard();

    } catch (error) {
      console.error("compliance.save failed:", error);
      setMsg(
        "de-comp-msg",
        "Save failed: " + (error.message || "Unknown error"),
        "error"
      );

    } finally {
      if (L) L.buttonBusy(submitBtn, false);
      if (L) L.hide();
    }
  }

  /* =====================================================
     6. DASHBOARD REFRESH (silent)
  ===================================================== */

  async function refreshDashboard() {
    try {
      // Reload dashboard in the background if user is on dashboard state.
      // Uses existing loadDashboard() function from app.js if exposed.
      if (typeof window.__hseReloadDashboard === "function") {
        await window.__hseReloadDashboard();
      }
    } catch (error) {
      console.warn("Dashboard refresh skipped:", error);
    }
  }

  /* =====================================================
     7. PUBLIC API
  ===================================================== */

  return {
    render() {
      renderShell();
    }
  };
}

window.__hseDailyEntry = deModule;