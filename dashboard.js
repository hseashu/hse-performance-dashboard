/****************************************************
 * HSE PERFORMANCE DASHBOARD
 * Full-Screen Board Renderer (Frontend)
 * Version: 3.0.0
 ****************************************************/

function dashModule() {
  const H = window.__hse;
  if (!H) return;
  const { apiRequest, state, $, escapeHTML, showMessage } = H;
  const L = window.__hseLoader;

  const fmt = (n) => Number(n || 0).toLocaleString();
  const getV = (obj, keys, def = 0) => {
    if (!obj) return def;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return def;
  };

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen failed:", err);
    }
  }

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

    // Safe Manhours logic (Manpower * Working_Hours)
    const mManhours = getV(mStats, ['Daily_Manhours', 'Manhours']) || 0;
    const oManhours = getV(oStats, ['Daily_Manhours', 'Manhours']) || 0;

    const siteName = data.site?.siteName || state.selectedSite || "Project Site";
    const monthStr = data.period?.currentMonth || "";

    // Compliance calc
    const mRaised = m.observationsRaised || 0;
    const mClosed = m.observationsClosed || 0;
    const mClosurePct = mRaised > 0 ? Math.min(100, Math.round((mClosed / mRaised) * 100)) : 0;

    const oRaised = o.observationsRaised || 0;
    const oClosed = o.observationsClosed || 0;
    const oClosurePct = oRaised > 0 ? Math.min(100, Math.round((oClosed / oRaised) * 100)) : 0;

    const board = $("dashboard-page");
    if (!board) return;

    board.innerHTML = `
      <div class="hse-board">
        
        <header class="hb-header">
          <div class="hb-header-text">
            <h1>SITE HSE PERFORMANCE BOARD</h1>
            <p>Project: ${escapeHTML(siteName)} | Month: ${escapeHTML(monthStr)}</p>
          </div>
          <button class="hb-fs-btn" id="hb-fullscreen-btn" title="Toggle Fullscreen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
        </header>

        <div class="hb-subheader">
          <span>SAFETY FIRST – ZERO HARM</span>
        </div>

        <div class="hb-grid">
          
          <!-- COLUMN 1 -->
          <div class="hb-col">
            <!-- Safe Manhours Cards -->
            <div class="hb-manhours-wrap">
              <div class="hb-mh-card">
                <div class="hb-mh-title">Safe Manhours</div>
                <div class="hb-mh-val">${fmt(mManhours)}</div>
                <div class="hb-mh-sub">This Month</div>
              </div>
              <div class="hb-mh-card blue">
                <div class="hb-mh-title">Safe Manhours</div>
                <div class="hb-mh-val">${fmt(oManhours)}</div>
                <div class="hb-mh-sub">Entire Project</div>
              </div>
            </div>

            <div class="hb-panel hb-stats-panel">
              <div class="hb-panel-title">Monthly HSE Statistics</div>
              <table class="hb-table">
                <thead>
                  <tr>
                    <th>Particulars</th>
                    <th>Entire Project</th>
                    <th>Current Month</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Fatality</td><td class="val">${fmt(getV(oStats, ['Fatality']))}</td><td class="val">${fmt(getV(mStats, ['Fatality']))}</td></tr>
                  <tr><td>Lost Time Injury (LTI)</td><td class="val">${fmt(getV(oStats, ['LTI']))}</td><td class="val">${fmt(getV(mStats, ['LTI']))}</td></tr>
                  <tr><td>Medical Treatment Case</td><td class="val">${fmt(getV(oStats, ['MTC']))}</td><td class="val">${fmt(getV(mStats, ['MTC']))}</td></tr>
                  <tr><td>First Aid Case</td><td class="val">${fmt(getV(oStats, ['FAC']))}</td><td class="val">${fmt(getV(mStats, ['FAC']))}</td></tr>
                  <tr><td>Near Miss</td><td class="val">${fmt(getV(oStats, ['Near_Miss']))}</td><td class="val">${fmt(getV(mStats, ['Near_Miss']))}</td></tr>
                  <tr><td>Unsafe Acts / Cond.</td><td class="val">${fmt(getV(oStats, ['Unsafe_Acts']) + getV(oStats, ['Unsafe_Conditions']))}</td><td class="val">${fmt(getV(mStats, ['Unsafe_Acts']) + getV(mStats, ['Unsafe_Conditions']))}</td></tr>
                </tbody>
              </table>
            </div>

            <div class="hb-panel hb-training-panel">
              <div class="hb-panel-title">Training View</div>
              <table class="hb-table">
                <thead><tr><th>Metric</th><th>Entire Project</th><th>Current Month</th></tr></thead>
                <tbody>
                  <tr><td>Sessions</td><td class="val">${fmt(oTrain.sessions)}</td><td class="val">${fmt(mTrain.sessions)}</td></tr>
                  <tr><td>Participants</td><td class="val">${fmt(oTrain.participants)}</td><td class="val">${fmt(mTrain.participants)}</td></tr>
                  <tr><td>Hours</td><td class="val">${fmt(oTrain.hours)}</td><td class="val">${fmt(mTrain.hours)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- COLUMN 2 -->
          <div class="hb-col">
            <div class="hb-panel hb-act-panel">
              <div class="hb-panel-title">HSE Activities</div>
              <table class="hb-table">
                <thead><tr><th>Activity</th><th>Entire Project</th><th>Current Month</th></tr></thead>
                <tbody>
                  <tr><td>Toolbox Talks</td><td class="val">${fmt(getV(oAct, ['Toolbox Talks Conducted']))}</td><td class="val">${fmt(getV(mAct, ['Toolbox Talks Conducted']))}</td></tr>
                  <tr><td>Safety Trainings</td><td class="val">${fmt(getV(oAct, ['Safety Trainings']))}</td><td class="val">${fmt(getV(mAct, ['Safety Trainings']))}</td></tr>
                  <tr><td>Inspections</td><td class="val">${fmt(getV(oAct, ['Safety Inspections']))}</td><td class="val">${fmt(getV(mAct, ['Safety Inspections']))}</td></tr>
                  <tr><td>Audits</td><td class="val">${fmt(getV(oAct, ['Safety Audits']))}</td><td class="val">${fmt(getV(mAct, ['Safety Audits']))}</td></tr>
                  <tr><td>Emergency Drills</td><td class="val">${fmt(getV(oAct, ['Emergency Drills']))}</td><td class="val">${fmt(getV(mAct, ['Emergency Drills']))}</td></tr>
                </tbody>
              </table>
            </div>

            <div class="hb-panel hb-comp-panel">
              <div class="hb-panel-title">HSE Compliance</div>
              <table class="hb-table">
                <thead><tr><th>Metric</th><th>Entire Project</th><th>Current Month</th></tr></thead>
                <tbody>
                  <tr><td>Obs. Raised</td><td class="val">${fmt(oRaised)}</td><td class="val">${fmt(mRaised)}</td></tr>
                  <tr><td>Obs. Closed</td><td class="val">${fmt(oClosed)}</td><td class="val">${fmt(mClosed)}</td></tr>
                  <tr>
                    <td>Closure %</td>
                    <td class="val" style="color:#1e7a3d">${oClosurePct}%</td>
                    <td class="val" style="color:#1e7a3d">${mClosurePct}%</td>
                  </tr>
                </tbody>
              </table>
              <div class="hb-bar-wrap" style="padding: 8px;">
                <div class="hb-bar-head"><span>Current Month Progress</span><span>${mClosurePct}%</span></div>
                <div class="hb-bar"><div class="fill" style="width:${mClosurePct}%"></div></div>
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
                <div><strong>Assembly:</strong> ${escapeHTML(data.emergency?.Assembly_Point || "—")}</div>
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

        <footer class="hb-footer">
          <span>Updated: ${new Date().toLocaleDateString('en-GB')}</span>
        </footer>
      </div>
    `;

    const fsBtn = $("hb-fullscreen-btn");
    if (fsBtn) fsBtn.addEventListener("click", toggleFullscreen);
    
    document.addEventListener("fullscreenchange", () => {
      document.body.classList.toggle("is-fullscreen", !!document.fullscreenElement);
    });
  }

  function renderEmpty() {
    const board = $("dashboard-page");
    if (board) board.innerHTML = `<p style="padding:20px;text-align:center;">No dashboard data available. Please select a site.</p>`;
  }

  return { render, renderEmpty };
}

window.__hseDashboard = dashModule;