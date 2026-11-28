/****************************************************
 * HSE PERFORMANCE DASHBOARD
 * Full-Screen Board Renderer (Frontend)
 * Version: 2.0.0
 * 
 * Depends on:
 *   window.__hse (apiRequest, state, $, escapeHTML, showMessage)
 *   window.__hseLoader (show, hide)
 ****************************************************/

function dashModule() {
  const H = window.__hse;
  if (!H) return;
  const { apiRequest, state, $, escapeHTML, showMessage } = H;
  const L = window.__hseLoader;

  // Format numbers (e.g., 1000 -> 1,000)
  const fmt = (n) => Number(n || 0).toLocaleString();
  
  // Get value from object with multiple possible keys
  const getV = (obj, keys, def = 0) => {
    if (!obj) return def;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return def;
  };

  /* =====================================================
     1. FULLSCREEN TOGGLE
  ===================================================== */
  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen failed:", err);
    }
  }

  /* =====================================================
     2. RENDER MAIN BOARD
  ===================================================== */
  function render(data) {
    if (!data) return renderEmpty();

    const m = data.monthly || {};
    const o = data.overall || {};
    
    const mStats = m.statistics || {};
    const oStats = o.statistics || {};
    
    const mAct = m.activities || {};
    const oAct = o.activities || {};
    
    const mTrain = m.training || { sessions: 0, participants: 0, hours: 0 };
    const oTrain = o.training || { sessions: 0, participants: 0, hours: 0 };

    const siteName = data.site?.siteName || state.selectedSite || "Project Site";
    const monthStr = data.period?.currentMonth || "";

    const board = $("dashboard-page");
    if (!board) return;

    board.innerHTML = `
      <div class="hse-board">
        
        <!-- HEADER -->
        <header class="hb-header">
          <div class="hb-header-text">
            <h1>SITE HSE STATISTICS BOARD</h1>
            <p>Project: ${escapeHTML(siteName)} | Month: ${escapeHTML(monthStr)}</p>
          </div>
          <button class="hb-fs-btn" id="hb-fullscreen-btn" title="Toggle Fullscreen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
        </header>

        <div class="hb-subheader">
          <span>SAFETY FIRST – ZERO HARM</span>
        </div>

        <!-- MAIN GRID -->
        <div class="hb-grid">
          
          <!-- COLUMN 1 -->
          <div class="hb-col">
            <div class="hb-panel hb-stats-panel">
              <div class="hb-panel-title">Monthly HSE Statistics</div>
              <table class="hb-table">
                <thead><tr><th>Particulars</th><th>Current Month</th></tr></thead>
                <tbody>
                  <tr><td>Fatality</td><td class="val">${fmt(getV(mStats, ['Fatality', 'fatality']))}</td></tr>
                  <tr><td>Lost Time Injury (LTI)</td><td class="val">${fmt(getV(mStats, ['LTI', 'lti']))}</td></tr>
                  <tr><td>Medical Treatment Case</td><td class="val">${fmt(getV(mStats, ['MTC', 'mtc']))}</td></tr>
                  <tr><td>First Aid Case</td><td class="val">${fmt(getV(mStats, ['FAC', 'fac']))}</td></tr>
                  <tr><td>Near Miss</td><td class="val">${fmt(getV(mStats, ['Near_Miss', 'nearMiss']))}</td></tr>
                  <tr><td>Unsafe Acts / Cond.</td><td class="val">${fmt(getV(mStats, ['Unsafe_Acts']) + getV(mStats, ['Unsafe_Conditions']))}</td></tr>
                </tbody>
              </table>
            </div>

            <div class="hb-panel hb-training-panel">
              <div class="hb-panel-title">Training View</div>
              <div class="hb-training-grid">
                <div class="hb-train-col">
                  <h4>This Month</h4>
                  <div class="hb-train-row"><span>Sessions</span><span>${fmt(mTrain.sessions)}</span></div>
                  <div class="hb-train-row"><span>Participants</span><span>${fmt(mTrain.participants)}</span></div>
                  <div class="hb-train-row"><span>Hours</span><span>${fmt(mTrain.hours)}</span></div>
                </div>
                <div class="hb-train-col">
                  <h4>Cumulative</h4>
                  <div class="hb-train-row"><span>Sessions</span><span>${fmt(oTrain.sessions)}</span></div>
                  <div class="hb-train-row"><span>Participants</span><span>${fmt(oTrain.participants)}</span></div>
                  <div class="hb-train-row"><span>Hours</span><span>${fmt(oTrain.hours)}</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- COLUMN 2 -->
          <div class="hb-col">
            <div class="hb-panel hb-act-panel">
              <div class="hb-panel-title">HSE Activities</div>
              <table class="hb-table">
                <thead><tr><th>Activity</th><th>Count</th></tr></thead>
                <tbody>
                  <tr><td>Toolbox Talks Conducted</td><td class="val">${fmt(getV(mAct, ['Toolbox Talks Conducted']))}</td></tr>
                  <tr><td>Safety Trainings</td><td class="val">${fmt(getV(mAct, ['Safety Trainings']))}</td></tr>
                  <tr><td>Safety Inspections</td><td class="val">${fmt(getV(mAct, ['Safety Inspections']))}</td></tr>
                  <tr><td>Safety Audits</td><td class="val">${fmt(getV(mAct, ['Safety Audits']))}</td></tr>
                  <tr><td>Emergency Drills</td><td class="val">${fmt(getV(mAct, ['Emergency Drills']))}</td></tr>
                </tbody>
              </table>
            </div>

            <div class="hb-panel hb-comp-panel">
              <div class="hb-panel-title">HSE Compliance</div>
              <div class="hb-comp-bars">
                <div class="hb-bar-wrap">
                  <div class="hb-bar-head"><span>Observation Closure</span><span>${m.closurePercentage || 0}%</span></div>
                  <div class="hb-bar"><div class="fill" style="width:${m.closurePercentage || 0}%"></div></div>
                </div>
                <div class="hb-bar-wrap">
                  <div class="hb-bar-head"><span>Observations Closed</span><span>${fmt(m.observationsClosed)} / ${fmt(m.observationsRaised)}</span></div>
                  <div class="hb-bar"><div class="fill blue" style="width:100%"></div></div>
                </div>
              </div>
            </div>
          </div>

          <!-- COLUMN 3 -->
          <div class="hb-col">
            <div class="hb-panel hb-recognition-panel">
              <div class="hb-panel-title">Safety Recognition</div>
              <div class="hb-rec-box">
                <div class="hb-medal">★</div>
                <div class="hb-rec-text">
                  <strong>Best Safety Performer</strong>
                  <p>${escapeHTML(data.recognition?.Employee_Name || data.recognition?.name || "To be announced")}</p>
                </div>
              </div>
            </div>

            <div class="hb-panel hb-emergency-panel">
              <div class="hb-panel-title">Emergency Information</div>
              <div class="hb-emg-grid">
                <div><strong>Ambulance:</strong> ${escapeHTML(data.emergency?.Ambulance_Number || "—")}</div>
                <div><strong>Fire:</strong> ${escapeHTML(data.emergency?.Fire_Number || "—")}</div>
                <div><strong>Hospital:</strong> ${escapeHTML(data.emergency?.Nearest_Hospital || "—")}</div>
                <div><strong>Assembly Point:</strong> ${escapeHTML(data.emergency?.Assembly_Point || "—")}</div>
              </div>
            </div>

            <div class="hb-panel hb-msg-panel">
              <div class="hb-panel-title">Key Safety Message</div>
              <div class="hb-msg-text">
                ${escapeHTML(data.emergency?.Key_Safety_Message || "Work Safe, Go Home Safe")}
              </div>
            </div>
          </div>

        </div>

        <!-- FOOTER -->
        <footer class="hb-footer">
          <span>Updated: ${new Date().toLocaleDateString('en-GB')} | By Site HSE Dept</span>
        </footer>
      </div>
    `;

    // Bind fullscreen
    const fsBtn = $("hb-fullscreen-btn");
    if (fsBtn) fsBtn.addEventListener("click", toggleFullscreen);
    
    // Fullscreen exit on click anywhere (mobile friendly)
    document.addEventListener("fullscreenchange", () => {
      const isFull = !!document.fullscreenElement;
      document.body.classList.toggle("is-fullscreen", isFull);
    });
  }

  function renderEmpty() {
    const board = $("dashboard-page");
    if (board) board.innerHTML = `<p style="padding:20px;text-align:center;">No dashboard data available. Please select a site.</p>`;
  }

  return { render, renderEmpty };
}

window.__hseDashboard = dashModule;