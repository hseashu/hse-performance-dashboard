/****************************************************
 * HSE PERFORMANCE DASHBOARD
 * Training Topics Management (Frontend)
 * Version: 1.0.0
 *
 * Admin-only CRUD for training topics.
 * Exposed globally as window.__hseTrainingTopics
 ****************************************************/

function ttModule() {
  const H = window.__hse;
  if (!H) {
    console.error("HSE runtime not initialized");
    return;
  }

  const { apiRequest, state, $, escapeHTML, showMessage } = H;
  const L = window.__hseLoader;

  function renderContainer(html) {
    const container = $("other-page-content");
    if (!container) return;

    const placeholder = container.closest(".page-placeholder");
    if (placeholder) placeholder.classList.remove("page-placeholder");

    container.innerHTML = html;
  }

  function renderDenied() {
    renderContainer('<p class="message error">Access denied. Admin only.</p>');
  }

  function setMsg(id, text, type) {
    const el = $(id);
    if (!el) return;
    el.textContent = text || "";
    el.className = "message " + (type || "");
  }

  /* =====================================================
     1. LIST VIEW
  ===================================================== */

  function renderList(topics) {
    const rows = topics.map(t => {
      const isActive = String(t.status || "").toLowerCase() === "active";
      return `
        <tr data-topic-id="${escapeHTML(t.topicId)}">
          <td><strong>${escapeHTML(t.topicName)}</strong><br>
              <small>${escapeHTML(t.topicId)}</small></td>
          <td>
            <span class="status-pill ${isActive ? "active" : "inactive"}">
              ${isActive ? "Active" : "Inactive"}
            </span>
          </td>
          <td>${escapeHTML(t.createdAt || "—")}</td>
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
          <h3>Training Topics</h3>
          <p>${topics.length} topic(s) configured</p>
        </div>
        <button class="primary-button" id="tt-add-btn">+ Add New Topic</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Topic</th><th>Status</th><th>Created</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `);

    bindListEvents(topics);
  }

  function renderEmpty() {
    renderContainer(`
      <div class="empty-state">
        <h3>No Training Topics Yet</h3>
        <p>Add your first training topic to enable the training detail dropdown.</p>
        <button class="primary-button" id="tt-add-btn">+ Add New Topic</button>
      </div>
    `);
    $("tt-add-btn").addEventListener("click", () => renderForm(null));
  }

  function renderForm(topic) {
    const isEdit = !!topic;
    const val = topic ? escapeHTML(topic.topicName || "") : "";

    renderContainer(`
      <div class="site-mgmt-header">
        <div>
          <h3>${isEdit ? "Edit Topic" : "Add New Topic"}</h3>
          <p>${isEdit ? escapeHTML(topic.topicName) : "Create a new training topic"}</p>
        </div>
        <button class="btn-small" id="tt-back-btn">← Back</button>
      </div>
      <form id="tt-form" class="sm-form">
        <div class="sm-form-grid">
          <div class="sm-field">
            <label>Topic Name *</label>
            <input type="text" name="topicName" maxlength="150"
                   value="${val}" required>
          </div>
        </div>
        <div id="tt-form-msg" class="message"></div>
        <div class="sm-form-actions">
          <button type="button" class="btn-small" id="tt-cancel-btn">Cancel</button>
          <button type="submit" class="primary-button" id="tt-submit-btn">
            ${isEdit ? "Update Topic" : "Create Topic"}
          </button>
        </div>
      </form>
    `);

    $("tt-back-btn").addEventListener("click", () => loadList());
    $("tt-cancel-btn").addEventListener("click", () => loadList());
    $("tt-form").addEventListener("submit", e => {
      e.preventDefault();
      submitForm(topic);
    });
  }

  /* =====================================================
     2. EVENTS + SUBMIT
  ===================================================== */

  function bindListEvents(topics) {
    const addBtn = $("tt-add-btn");
    if (addBtn) addBtn.addEventListener("click", () => renderForm(null));

    const tbody = document.querySelector("#other-page-content tbody");
    if (!tbody) return;

    tbody.addEventListener("click", async event => {
      const btn = event.target.closest("[data-action]");
      if (!btn) return;

      const tr = btn.closest("tr");
      const topicId = tr?.dataset.topicId;
      if (!topicId) return;

      const topic = topics.find(t => t.topicId === topicId);
      if (!topic) return;

      if (btn.dataset.action === "edit") {
        renderForm(topic);
      }

      if (btn.dataset.action === "toggle") {
        const isActive = String(topic.status || "").toLowerCase() === "active";
        const target = isActive ? "Inactive" : "Active";
        await toggleTopic(topicId, target, btn);
      }
    });
  }

  async function submitForm(originalTopic) {
    const form = $("tt-form");
    const submitBtn = $("tt-submit-btn");
    if (!form || !submitBtn) return;

    const fd = new FormData(form);
    const topicName = String(fd.get("topicName") || "").trim();

    if (!topicName) {
      setMsg("tt-form-msg", "Topic name is required.", "error");
      return;
    }

    setMsg("tt-form-msg", "", "");
    if (L) L.show(originalTopic ? "Updating topic..." : "Creating topic...");
    if (L) L.buttonBusy(submitBtn, true, "Saving...");

    try {
      const payload = { topicName };
      if (originalTopic) payload.topicId = originalTopic.topicId;

      await apiRequest("trainingTopics.save", { topic: payload });

      showMessage(originalTopic ? "Topic updated." : "Topic created.", "success");
      if (L) L.hide();
      await loadList();

    } catch (error) {
      console.error("trainingTopics.save failed:", error);
      setMsg("tt-form-msg", "Save failed: " + (error.message || "Unknown"), "error");

    } finally {
      if (L) L.buttonBusy(submitBtn, false);
      if (L) L.hide();
    }
  }

  async function toggleTopic(topicId, targetStatus, btn) {
    if (L) L.show(targetStatus === "Active" ? "Activating topic..." : "Deactivating topic...");
    if (L) L.buttonBusy(btn, true, "Saving...");

    try {
      await apiRequest("trainingTopics.toggle", {
        topic: { topicId, status: targetStatus }
      });
      showMessage("Topic " + targetStatus.toLowerCase() + ".", "success");
      if (L) L.hide();
      await loadList();
    } catch (error) {
      console.error("trainingTopics.toggle failed:", error);
      showMessage("Failed: " + (error.message || "Unknown"), "error");
      if (L) L.buttonBusy(btn, false);
    } finally {
      if (L) L.hide();
    }
  }

  /* =====================================================
     3. LOAD
  ===================================================== */

  async function loadList() {
    if (state.profile?.role?.toLowerCase() !== "admin") {
      renderDenied();
      return;
    }

    try {
      renderContainer(`
        <div class="site-mgmt-header">
          <div><h3>Training Topics</h3><p>Loading...</p></div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Topic</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody id="tt-skeleton-body"></tbody>
          </table>
        </div>
      `);

      const skel = $("tt-skeleton-body");
      if (skel && L) L.skeletonRows(skel, 4, 4);

      const result = await apiRequest("trainingTopics.adminList");
      const topics = Array.isArray(result.topics) ? result.topics : [];

      if (!topics.length) renderEmpty();
      else renderList(topics);

    } catch (error) {
      console.error("trainingTopics.adminList failed:", error);
      renderContainer(
        '<p class="message error">Unable to load topics. ' +
        escapeHTML(error.message || "") + "</p>"
      );
    }
  }

  return {
    render() {
      return loadList();
    }
  };
}

window.__hseTrainingTopics = ttModule;