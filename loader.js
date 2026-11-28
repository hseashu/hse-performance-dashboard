/****************************************************
 * HSE PERFORMANCE DASHBOARD
 * Universal Loader Utility
 * Version: 1.0.0
 *
 * Provides:
 *   - Full-screen blocking overlay
 *   - Inline button spinner
 *   - Skeleton loader rows for tables
 *   - Promise-bound auto-hide
 *
 * Usage:
 *   window.__hseLoader.show("Saving site...");
 *   window.__hseLoader.hide();
 *
 *   await window.__hseLoader.wrap(
 *     "Saving site...",
 *     apiRequest("sites.update", {...})
 *   );
 *
 *   window.__hseLoader.buttonBusy(btn, true, "Saving...");
 *   window.__hseLoader.buttonBusy(btn, false);
 ****************************************************/

(function () {
  let overlayEl = null;
  let overlayCount = 0;

  /* =====================================================
     1. OVERLAY
  ===================================================== */

  function ensureOverlay() {
    if (overlayEl && document.body.contains(overlayEl)) {
      return overlayEl;
    }

    overlayEl = document.createElement("div");
    overlayEl.id = "hse-loader-overlay";
    overlayEl.className = "hse-loader-overlay";
    overlayEl.innerHTML = `
      <div class="hse-loader-card">
        <div class="hse-loader-spinner"></div>
        <p class="hse-loader-text">Loading...</p>
        <div class="hse-loader-bar"><span></span></div>
      </div>
    `;

    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function show(message) {
    overlayCount++;
    const el = ensureOverlay();
    const text = el.querySelector(".hse-loader-text");
    if (text && message) text.textContent = message;
    el.classList.add("visible");
  }

  function hide() {
    if (overlayCount > 0) overlayCount--;

    if (overlayCount === 0 && overlayEl) {
      overlayEl.classList.remove("visible");
    }
  }

  async function wrap(message, promise) {
    show(message);
    try {
      return await promise;
    } finally {
      hide();
    }
  }

  /* =====================================================
     2. BUTTON BUSY
  ===================================================== */

  function buttonBusy(button, busy, text) {
    if (!button) return;

    if (busy) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent.trim();
      }
      button.disabled = true;
      button.classList.add("hse-btn-busy");
      if (text) button.textContent = text;
    } else {
      button.disabled = false;
      button.classList.remove("hse-btn-busy");
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  /* =====================================================
     3. SKELETON ROWS
  ===================================================== */

  function skeletonRows(container, rowCount, colCount) {
    if (!container) return;

    const rows = Math.max(1, rowCount || 3);
    const cols = Math.max(1, colCount || 4);

    container.innerHTML = Array.from({ length: rows })
      .map(() => `
        <tr class="hse-skeleton-row">
          ${Array.from({ length: cols })
            .map(() => '<td><span class="hse-skeleton-line"></span></td>')
            .join("")}
        </tr>
      `)
      .join("");
  }

  /* =====================================================
     4. EXPOSE
  ===================================================== */

  window.__hseLoader = {
    show,
    hide,
    wrap,
    buttonBusy,
    skeletonRows
  };
})();