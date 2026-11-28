/****************************************************
 * HSE PERFORMANCE DASHBOARD
 * Admin Dashboard Settings (Frontend)
 * Version: 1.0.0
 ****************************************************/

function dsModule() {
  const H = window.__hse;
  if (!H) return;
  const { apiRequest, state, $, escapeHTML, showMessage } = H;
  const L = window.__hseLoader;

  function renderContainer(html) {
    const container = $("other-page-content");
    if (!container) return;
    const ph = container.closest(".page-placeholder");
    if (ph) ph.classList.remove("page-placeholder");
    container.innerHTML = html;
  }

  function renderDenied() {
    renderContainer('<p class="message error">Access denied. Admin only.</p>');
  }

  /* =====================================================
     LOAD & RENDER SETTINGS
  ===================================================== */

  async function loadAndRender() {
    if (state.profile?.role?.toLowerCase() !== "admin") {
      return renderDenied();
    }

    renderContainer('<p>Loading settings...</p>');
    if (L) L.show("Loading settings...");

    try {
      const res = await apiRequest("settings.get");
      const settings = res.settings || {};
      
      const keyMsg = settings.key_message || {};
      const emgList = settings.emergency_info?.value || [
        { label: "Ambulance", value: "" },
        { label: "Fire", value: "" }
      ];

      renderContainer(`
        <div class="site-mgmt-header">
          <div>
            <h3>Dashboard Settings</h3>
            <p>Configure Key Message image and Emergency Contacts.</p>
          </div>
          <button class="btn-small" id="ds-back-btn">← Back</button>
        </div>

        <div class="ds-grid">
          <!-- KEY MESSAGE IMAGE -->
          <div class="panel">
            <div class="panel-header">
              <h3>Safety Slogan / Key Message</h3>
              <p>Upload a banner image (Max 1MB, PNG/JPG/WebP).</p>
            </div>
            <div class="ds-image-uploader">
              <div class="ds-preview" id="ds-msg-preview">
                ${keyMsg.image ? `<img src="${keyMsg.image}" />` : '<span>No image uploaded</span>'}
              </div>
              <input type="file" id="ds-msg-file" accept="image/png, image/jpeg, image/webp" style="display:none;" />
              <button class="btn-small" id="ds-msg-btn">Upload / Replace Image</button>
              <button class="btn-small btn-deactivate" id="ds-msg-del-btn" style="display:${keyMsg.image ? 'inline-block' : 'none'}">Delete Image</button>
            </div>
          </div>

          <!-- EMERGENCY INFO -->
          <div class="panel">
            <div class="panel-header">
              <h3>Emergency Information</h3>
              <p>Add custom labels and values.</p>
            </div>
            <div id="ds-emg-list" class="ds-emg-list"></div>
            <button class="btn-small" id="ds-emg-add-btn" style="margin-top:10px;">+ Add Contact</button>
            <div style="margin-top:15px; text-align:right;">
              <button class="primary-button" id="ds-emg-save-btn">Save Emergency Info</button>
            </div>
          </div>
        </div>
      `);

      if (L) L.hide();
      bindEvents(keyMsg, emgList);

    } catch (error) {
      if (L) L.hide();
      console.error(error);
      renderContainer('<p class="message error">Error loading settings.</p>');
    }
  }

  /* =====================================================
     EVENTS
  ===================================================== */

  function bindEvents(keyMsg, emgList) {
    // Back
    $("ds-back-btn").addEventListener("click", () => navigateTo("dashboard"));

    // Image Upload
    const fileInp = $("ds-msg-file");
    const msgBtn = $("ds-msg-btn");
    const delBtn = $("ds-msg-del-btn");
    const preview = $("ds-msg-preview");

    msgBtn.addEventListener("click", () => fileInp.click());

    fileInp.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 1024 * 1024) {
        return showMessage("File too large (max 1MB).", "error");
      }

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        if (L) L.show("Uploading image...");
        try {
          await apiRequest("settings.save", {
            data: {
              key: "key_message",
              imageBase64: base64.split(",")[1],
              mimeType: file.type
            }
          });
          showMessage("Image uploaded.", "success");
          if (L) L.hide();
          loadAndRender(); // reload
        } catch (err) {
          if (L) L.hide();
          showMessage("Upload failed: " + err.message, "error");
        }
      };
      reader.readAsDataURL(file);
    });

    delBtn.addEventListener("click", async () => {
      if (!confirm("Delete key message image?")) return;
      if (L) L.show("Deleting...");
      try {
        await apiRequest("settings.save", {
          data: { key: "key_message", value: "", imageBase64: "" }
        });
        showMessage("Image deleted.", "success");
        if (L) L.hide();
        loadAndRender();
      } catch (err) {
        if (L) L.hide();
        showMessage("Delete failed.", "error");
      }
    });

    // Emergency List
    const emgContainer = $("ds-emg-list");
    
    function renderEmgRows() {
      emgContainer.innerHTML = emgList.map((item, index) => `
        <div class="ds-emg-row" data-index="${index}">
          <input type="text" placeholder="Label (e.g. Fire)" value="${escapeHTML(item.label)}" class="emg-label" />
          <input type="text" placeholder="Value (e.g. 101)" value="${escapeHTML(item.value)}" class="emg-value" />
          <button class="btn-small btn-deactivate emg-del">✕</button>
        </div>
      `).join("");

      emgContainer.querySelectorAll(".emg-del").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = Number(e.target.closest(".ds-emg-row").dataset.index);
          emgList.splice(idx, 1);
          renderEmgRows();
        });
      });
    }
    renderEmgRows();

    $("ds-emg-add-btn").addEventListener("click", () => {
      emgList.push({ label: "", value: "" });
      renderEmgRows();
    });

    $("ds-emg-save-btn").addEventListener("click", async () => {
      const rows = emgContainer.querySelectorAll(".ds-emg-row");
      const newList = [];
      rows.forEach(r => {
        const label = r.querySelector(".emg-label").value.trim();
        const value = r.querySelector(".emg-value").value.trim();
        if (label || value) newList.push({ label, value });
      });

      if (L) L.show("Saving contacts...");
      try {
        await apiRequest("settings.save", {
          data: { key: "emergency_info", value: newList }
        });
        showMessage("Emergency info saved.", "success");
        if (L) L.hide();
      } catch (err) {
        if (L) L.hide();
        showMessage("Save failed.", "error");
      }
    });
  }

  return { render: loadAndRender };
}

window.__hseDashboardSettings = dsModule;