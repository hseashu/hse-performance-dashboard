/****************************************************
 * HSE PERFORMANCE DASHBOARD
 * Daily Data Entry Module (Frontend)
 * Version: 2.0.0
 *
 * Tabs:
 *   1. Daily HSE Data  -> daily.save
 *   2. Activities      -> activities.saveMulti (new)
 *   3. Compliance      -> compliance.save
 *
 * Activities tab:
 *   - 5 count fields (TBT, Trainings, Inspections, Audits, Drills)
 *   - Training detail section (auto-shows when Trainings > 0)
 *     Topic dropdown (loaded from trainingTopics.list)
 *     Sessions, Participants, Duration (minutes)
 *     Live calculated Training Hours
 ****************************************************/

function deModule() {
  const H = window.__hse;
  if (!H) {
    console.error("HSE runtime not initialized");
    return;
  }

  const { apiRequest, state, $, escapeHTML, showMessage } = H;
  const L = window.__hseLoader;

  let activeTab = "daily";
  let trainingTopicsCache = null;

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

  function renderContainer(html) {
    const container = $("other-page-content");
    if (!container) return;
    const ph = container.closest(".page-placeholder");
    if (ph) ph.classList.remove("page-placeholder");
    container.innerHTML = html;
  }

  /* =====================================================
     2. SHELL + TABS
  ===================================================== */

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
          <p>Site: <strong>${escapeHTML(siteId)}</strong></p>
        </div>
        <div class="de-tabs">
          <button class="de-tab active" data-tab="daily">Daily HSE</button>
          <button class="de-tab" data-tab="activities">Activities</button>
          <button class="de-tab" data-tab="compliance">Compliance</button>
        </div>
      </div>
      <div id="de-tab-content"></div>
    `);

    document.querySelectorAll(".de-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
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
    const c = $("de-tab-content");
    if (!c) return;

    c.innerHTML = `
      <form id="de-daily-form" class="de-form">
        <div class="de-form-grid">
          <div class="sm-field"><label>Date *</label>
            <input type="date" name="date" value="${todayISO()}" required></div>
          <div class="sm-field"><label>Fatality</label>
            <input type="number" name="Fatality" min="0" value="0"></div>
          <div class="sm-field"><label>LTI</label>
            <input type="number" name="LTI" min="0" value="0"></div>
          <div class="sm-field"><label>MTC</label>
            <input type="number" name="MTC" min="0" value="0"></div>
          <div class="sm-field"><label>FAC</label>
            <input type="number" name="FAC" min="0" value="0"></div>
          <div class="sm-field"><label>Near Miss</label>
            <input type="number" name="Near_Miss" min="0" value="0"></div>
          <div class="sm-field"><label>Unsafe Acts</label>
            <input type="number" name="Unsafe_Acts" min="0" value="0"></div>
          <div class="sm-field"><label>Unsafe Conditions</label>
            <input type="number" name="Unsafe_Conditions" min="0" value="0"></div>
          <div class="sm-field"><label>Manpower</label>
            <input type="number" name="Manpower" min="0" value="0"></div>
          <div class="sm-field"><label>Working Hours (per person)</label>
            <input type="number" name="Working_Hours" min="0" max="24" step="0.5" value="8"></div>
          <div class="sm-field de-field-wide"><label>Remarks</label>
            <textarea name="Remarks" rows="2" maxlength="1000"></textarea></div>
        </div>
        <div id="de-daily-msg" class="message"></div>
        <div class="sm-form-actions">
          <button type="submit" class="primary-button" id="de-daily-submit">Save Daily Record</button>
        </div>
      </form>
      <div class="de-calc-preview">
        <strong>Daily Manhours:</strong> <span id="de-manhours">0</span>
        <small>(Manpower × Working Hours — calculated on server)</small>
      </div>
    `;

    const form = $("de-daily-form");
    const preview = $("de-manhours");
    const update = () => {
      const fd = new FormData(form);
      const m = numberOrZero(fd.get("Manpower"));
      const h = numberOrZero(fd.get("Working_Hours"));
      if (preview) preview.textContent = (m * h).toLocaleString();
    };
    form.addEventListener("input", update);
    update();
    form.addEventListener("submit", submitDaily);
  }

  async function submitDaily(event) {
    event.preventDefault();
    const form = $("de-daily-form");
    const btn = $("de-daily-submit");
    const siteId = currentSiteId();
    if (!siteId) return setMsg("de-daily-msg", "No site selected.", "error");

    const fd = new FormData(form);
    const date = String(fd.get("date") || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return setMsg("de-daily-msg", "Please select a valid date.", "error");
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
      return setMsg("de-daily-msg", "Working Hours cannot exceed 24.", "error");
    }

    setMsg("de-daily-msg", "", "");
    if (L) L.show("Saving daily record...");
    if (L) L.buttonBusy(btn, true, "Saving...");

    try {
      await apiRequest("daily.save", { siteId, date, data });
      setMsg("de-daily-msg", "Daily record saved successfully.", "success");
      showMessage("Daily record saved.", "success");
      if (L) L.hide();
      await refreshDashboard();
    } catch (error) {
      console.error("daily.save failed:", error);
      setMsg("de-daily-msg", "Save failed: " + (error.message || "Unknown"), "error");
    } finally {
      if (L) L.buttonBusy(btn, false);
      if (L) L.hide();
    }
  }

  /* =====================================================
     4. TAB 2 — ACTIVITIES (5 counts + training detail)
  ===================================================== */

  async function renderActivitiesTab() {
    const c = $("de-tab-content");
    if (!c) return;

    // Load topics once (cached).
    if (!trainingTopicsCache) {
      try {
        const res = await apiRequest("trainingTopics.list");
        trainingTopicsCache = Array.isArray(res.topics) ? res.topics : [];
      } catch (error) {
        console.warn("trainingTopics.list failed:", error);
        trainingTopicsCache = [];
      }
    }

    c.innerHTML = `
      <form id="de-act-form" class="de-form">
        <div class="de-form-grid">
          <div class="sm-field">
            <label>Date *</label>
            <input type="date" name="date" value="${todayISO()}" required>
          </div>
        </div>

        <div class="de-section-title">HSE Activity Counts</div>

        <div class="de-form-grid">
          <div class="sm-field">
            <label>Toolbox Talks Conducted</label>
            <input type="number" name="tbt" min="0" value="0">
          </div>
          <div class="sm-field">
            <label>Safety Trainings</label>
            <input type="number" name="trainings" min="0" value="0" id="de-trainings-input">
          </div>
          <div class="sm-field">
            <label>Safety Inspections</label>
            <input type="number" name="inspections" min="0" value="0">
          </div>
          <div class="sm-field">
            <label>Safety Audits</label>
            <input type="number" name="audits" min="0" value="0">
          </div>
          <div class="sm-field">
            <label>Emergency Drills</label>
            <input type="number" name="drills" min="0" value="0">
          </div>
        </div>

        <div id="de-training-section" class="de-training-section hidden">
          <div class="de-section-title">Training Detail</div>

          ${trainingTopicsCache.length === 0
            ? '<p class="message error">No active training topics found. Ask an admin to add topics first.</p>'
            : `
              <div class="de-form-grid">
                <div class="sm-field">
                  <label>Training Topic *</label>
                  <select name="topicId" id="de-training-topic">
                    <option value="">— Select topic —</option>
                    ${trainingTopicsCache.map(t =>
                      `<option value="${escapeHTML(t.topicId)}">${escapeHTML(t.topicName)}</option>`
                    ).join("")}
                  </select>
                </div>
                <div class="sm-field">
                  <label>Sessions *</label>
                  <input type="number" name="sessions" min="1" value="1" id="de-training-sessions">
                </div>
                <div class="sm-field">
                  <label>Participants (per session) *</label>
                  <input type="number" name="participants" min="1" value="1" id="de-training-participants">
                </div>
                <div class="sm-field">
                  <label>Duration (minutes) *</label>
                  <input type="number" name="durationMinutes" min="1" value="30" id="de-training-duration">
                </div>
              </div>
              <div class="de-calc-preview">
                <strong>Training Hours:</strong> <span id="de-training-hours">0</span>
                <small>(Sessions × Participants × Duration / 60)</small>
              </div>
            `
          }
        </div>

        <div class="de-form-grid">
          <div class="sm-field de-field-wide">
            <label>Remarks (optional)</label>
            <textarea name="remarks" rows="2" maxlength="1000"></textarea>
          </div>
        </div>

        <div id="de-act-msg" class="message"></div>

        <div class="sm-form-actions">
          <button type="submit" class="primary-button" id="de-act-submit">
            Save Activities
          </button>
        </div>
      </form>
    `;

    const form = $("de-act-form");
    const trainingSection = $("de-training-section");
    const trainingsInput = $("de-trainings-input");

    const toggleTraining = () => {
      const n = numberOrZero(trainingsInput.value);
      trainingSection.classList.toggle("hidden", n <= 0);
      updateTrainingHours();
    };

    const updateTrainingHours = () => {
      const s = numberOrZero($("de-training-sessions")?.value);
      const p = numberOrZero($("de-training-participants")?.value);
      const d = numberOrZero($("de-training-duration")?.value);
      const hours = Math.round((s * p * d / 60) * 100) / 100;
      const el = $("de-training-hours");
      if (el) el.textContent = hours.toFixed(2);
    };

    trainingsInput.addEventListener("input", toggleTraining);
    ["de-training-sessions", "de-training-participants", "de-training-duration"]
      .forEach(id => {
        const el = $(id);
        if (el) el.addEventListener("input", updateTrainingHours);
      });

    toggleTraining();
    form.addEventListener("submit", submitActivities);
  }

  async function submitActivities(event) {
    event.preventDefault();
    const form = $("de-act-form");
    const btn = $("de-act-submit");
    const siteId = currentSiteId();
    if (!siteId) return setMsg("de-act-msg", "No site selected.", "error");

    const fd = new FormData(form);
    const date = String(fd.get("date") || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return setMsg("de-act-msg", "Please select a valid date.", "error");
    }

    const data = {
      tbt: numberOrZero(fd.get("tbt")),
      trainings: numberOrZero(fd.get("trainings")),
      inspections: numberOrZero(fd.get("inspections")),
      audits: numberOrZero(fd.get("audits")),
      drills: numberOrZero(fd.get("drills")),
      remarks: String(fd.get("remarks") || "").trim()
    };

    if (data.tbt + data.trainings + data.inspections + data.audits + data.drills === 0) {
      return setMsg("de-act-msg", "Enter at least one activity count greater than 0.", "error");
    }

    if (data.trainings > 0) {
      const topicId = String(fd.get("topicId") || "").trim();
      const sessions = numberOrZero(fd.get("sessions"));
      const participants = numberOrZero(fd.get("participants"));
      const durationMinutes = numberOrZero(fd.get("durationMinutes"));

      if (!topicId) return setMsg("de-act-msg", "Training Topic is required.", "error");
      if (sessions < 1) return setMsg("de-act-msg", "Sessions must be at least 1.", "error");
      if (participants < 1) return setMsg("de-act-msg", "Participants must be at least 1.", "error");
      if (durationMinutes < 1) return setMsg("de-act-msg", "Duration must be at least 1 minute.", "error");

      data.trainingDetail = { topicId, sessions, participants, durationMinutes };
    }

    setMsg("de-act-msg", "", "");
    if (L) L.show("Saving activities...");
    if (L) L.buttonBusy(btn, true, "Saving...");

    try {
      const result = await apiRequest("activities.saveMulti", { siteId, date, data });
      const hoursText = result.trainingHours ? ` Training: ${result.trainingHours} hrs.` : "";
      setMsg("de-act-msg", "Activities saved." + hoursText, "success");
      showMessage("Activities saved.", "success");

      form.reset();
      const dateInput = form.querySelector('input[name="date"]');
      if (dateInput) dateInput.value = todayISO();
      const ts = $("de-training-section");
      if (ts) ts.classList.add("hidden");

      if (L) L.hide();
      await refreshDashboard();
    } catch (error) {
      console.error("activities.saveMulti failed:", error);
      setMsg("de-act-msg", "Save failed: " + (error.message || "Unknown"), "error");
    } finally {
      if (L) L.buttonBusy(btn, false);
      if (L) L.hide();
    }
  }

  /* =====================================================
     5. TAB 3 — COMPLIANCE
  ===================================================== */

  function renderComplianceTab() {
    const c = $("de-tab-content");
    if (!c) return;

    c.innerHTML = `
      <form id="de-comp-form" class="de-form">
        <div class="de-form-grid">
          <div class="sm-field"><label>Date *</label>
            <input type="date" name="date" value="${todayISO()}" required></div>
          <div class="sm-field"><label>Observations Closed *</label>
            <input type="number" name="observationsClosed" min="0" value="0" required></div>
          <div class="sm-field de-field-wide"><label>Remarks</label>
            <textarea name="remarks" rows="2" maxlength="1000"></textarea></div>
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
    const btn = $("de-comp-submit");
    const siteId = currentSiteId();
    if (!siteId) return setMsg("de-comp-msg", "No site selected.", "error");

    const fd = new FormData(form);
    const date = String(fd.get("date") || "").trim();
    const observationsClosed = numberOrZero(fd.get("observationsClosed"));
    const remarks = String(fd.get("remarks") || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return setMsg("de-comp-msg", "Please select a valid date.", "error");
    }

    setMsg("de-comp-msg", "", "");
    if (L) L.show("Saving compliance record...");
    if (L) L.buttonBusy(btn, true, "Saving...");

    try {
      await apiRequest("compliance.save", {
        siteId, date, data: { observationsClosed, remarks }
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
      setMsg("de-comp-msg", "Save failed: " + (error.message || "Unknown"), "error");
    } finally {
      if (L) L.buttonBusy(btn, false);
      if (L) L.hide();
    }
  }

  /* =====================================================
     6. DASHBOARD REFRESH
  ===================================================== */

  async function refreshDashboard() {
    try {
      if (typeof window.__hseReloadDashboard === "function") {
        await window.__hseReloadDashboard();
      }
    } catch (error) {
      console.warn("Dashboard refresh skipped:", error);
    }
  }

  return { render: renderShell };
}

window.__hseDailyEntry = deModule;