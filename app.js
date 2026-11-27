
/****************************************************
 HSE PERFORMANCE DASHBOARD
 Frontend Application
 Version: 1.0.0
****************************************************/

/* ================================================
   1. FIREBASE CONFIGURATION
================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyA6bQjfYxiGq9nO_2g_RQ9pn0A0EPVEYIc",
  authDomain: "hse-performance-dashboard.firebaseapp.com",
  projectId: "hse-performance-dashboard",
  storageBucket: "hse-performance-dashboard.firebasestorage.app",
  messagingSenderId: "513478203045",
  appId: "1:513478203045:web:6eb0eda870223cc639df4c"
};

/* ================================================
   2. APPLICATION CONFIGURATION
================================================ */

const APP_CONFIG = {
  API_URL: "/api/proxy",
  APP_NAME: "HSE Performance Dashboard",
  VERSION: "1.0.0"
};

const state = {
  firebase: null,
  auth: null,
  user: null,
  profile: null,
  sites: [],
  selectedSite: "",
  selectedMonth: "",
  dashboard: null,
  currentPage: "dashboard",
  loading: false
};

/* ================================================
   3. DOM HELPERS
================================================ */

const $ = (id) => document.getElementById(id);

function showMessage(message, type = "success") {
  const container = $("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}

function setLoginMessage(message, type = "") {
  const element = $("login-message");
  if (!element) return;

  element.textContent = message;
  element.className = `message ${type}`;
}

function showLogin() {
  $("login-screen")?.classList.remove("hidden");
  $("app-screen")?.classList.add("hidden");
}

function showApplication() {
  $("login-screen")?.classList.add("hidden");
  $("app-screen")?.classList.remove("hidden");
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/* ================================================
   4. FIREBASE INITIALIZATION
================================================ */

async function initializeFirebase() {
  const version = "10.14.1";

  const [
    appModule,
    authModule
  ] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`)
  ]);

  const app = appModule.initializeApp(firebaseConfig);
  const auth = authModule.getAuth(app);

  await authModule.setPersistence(
    auth,
    authModule.browserLocalPersistence
  );

  state.firebase = {
    ...appModule,
    ...authModule
  };

  state.auth = auth;
}

/* ================================================
   5. API COMMUNICATION
================================================ */

async function apiRequest(action, payload = {}) {
  if (!state.auth?.currentUser) {
    throw new Error("AUTHENTICATION_REQUIRED");
  }

  const idToken = await state.auth.currentUser.getIdToken();

  const response = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store",
    body: JSON.stringify({
      action,
      idToken,
      ...payload
    })
  });

  if (!response.ok) {
    throw new Error(`API_HTTP_${response.status}`);
  }

  const result = await response.json();

  if (!result || result.ok !== true) {
    throw new Error(result?.error || result?.message || "API_REQUEST_FAILED");
  }

  return result;
}

/* ================================================
   6. USER AUTHENTICATION
================================================ */

async function login(email, password) {
  const button = $("login-button");

  try {
    button.disabled = true;
    button.textContent = "Signing in...";
    setLoginMessage("Verifying your account...");

    await state.firebase.signInWithEmailAndPassword(
      state.auth,
      email,
      password
    );

    const result = await apiRequest("auth.me");

    state.profile = result.user;

    await initializeUserInterface();

    showApplication();
    showMessage("Login successful");

  } catch (error) {
    console.error("Login error:", error);

    await state.firebase.signOut(state.auth);

    setLoginMessage(
      getFriendlyError(error),
      "error"
    );

  } finally {
    button.disabled = false;
    button.textContent = "Sign In";
  }
}

async function logout() {
  try {
    await state.firebase.signOut(state.auth);
  } catch (error) {
    console.error("Logout error:", error);
  }

  state.profile = null;
  state.sites = [];
  state.dashboard = null;

  showLogin();
  setLoginMessage("You have signed out.");
}

function getFriendlyError(error) {
  const code = error?.code || "";
  const message = error?.message || "";

  if (code.includes("user-not-found") ||
      code.includes("wrong-password") ||
      code.includes("invalid-credential")) {
    return "Incorrect email or password.";
  }

  if (code.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }

  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please try again later.";
  }

  if (message.includes("AUTHENTICATION_FAILED") ||
      message.includes("AUTHENTICATION_REQUIRED")) {
    return "Your account is inactive or not authorized.";
  }

  if (message.includes("API_")) {
    return "Unable to connect to the dashboard server.";
  }

  return "Login failed. Please check your credentials.";
}

/* ================================================
   7. USER INTERFACE INITIALIZATION
================================================ */

async function initializeUserInterface() {
  const profile = state.profile;

  if (!profile) throw new Error("USER_PROFILE_MISSING");

  const name = profile.name || profile.email || "User";
  const role = profile.role || "Site User";

  $("sidebar-user-name").textContent = name;
  $("sidebar-user-role").textContent = role;
  $("sidebar-avatar").textContent = name.charAt(0).toUpperCase();
  $("topbar-avatar").textContent = name.charAt(0).toUpperCase();
  $("welcome-heading").textContent = `Welcome, ${name}`;

  const isAdmin = role.toLowerCase() === "admin";

  $("admin-nav").classList.toggle("hidden", !isAdmin);

  if (!isAdmin) {
    state.selectedSite = profile.siteId || "";
  }

  $("current-date").textContent =
    new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  $("app-version").textContent = `Version ${APP_CONFIG.VERSION}`;

  state.selectedMonth = currentMonth();
  $("month-selector").value = state.selectedMonth;

  await loadSites();
}

/* ================================================
   8. SITE MANAGEMENT / SELECTION
================================================ */

async function loadSites() {
  const result = await apiRequest("sites.list");

  const list =
    result.sites ||
    result.data?.sites ||
    result.data ||
    [];

  state.sites = Array.isArray(list) ? list : [];

  const selector = $("site-selector");
  selector.innerHTML = "";

  if (state.profile.role.toLowerCase() === "admin") {
    selector.disabled = false;
  } else {
    selector.disabled = true;
  }

  state.sites.forEach(site => {
    const id = site.Site_ID || site.siteId || site.id;
    const name = site.Site_Name || site.siteName || site.name;

    if (!id) return;

    const option = document.createElement("option");
    option.value = id;
    option.textContent = name || id;

    selector.appendChild(option);
  });

  if (!state.selectedSite && state.sites.length) {
    state.selectedSite =
      state.sites[0].Site_ID ||
      state.sites[0].siteId ||
      state.sites[0].id;
  }

  if (state.selectedSite) {
    selector.value = state.selectedSite;
  }

  if (!state.selectedSite) {
    selector.innerHTML = '<option value="">No assigned site</option>';
    renderEmptyDashboard();
    return;
  }

  await loadDashboard();
}

/* ================================================
   9. DASHBOARD DATA
================================================ */

async function loadDashboard() {
  if (!state.selectedSite) return;

  const content = $("kpi-grid");
  content.innerHTML = "<p>Loading dashboard data...</p>";

  try {
    const result = await apiRequest("dashboard.get", {
      siteId: state.selectedSite,
      month: state.selectedMonth
    });

    state.dashboard = result.data || result.dashboard || result;

    renderDashboard(state.dashboard);

  } catch (error) {
    console.error("Dashboard loading error:", error);

    content.innerHTML =
      '<p class="message error">Unable to load dashboard data.</p>';

    showMessage("Dashboard data could not be loaded.", "error");
  }
}

/* ================================================
   10. DASHBOARD RENDERING
================================================ */

function findValue(source, keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return 0;
}

function renderDashboard(data) {
  if (!data || typeof data !== "object") {
    renderEmptyDashboard();
    return;
  }

  const monthly = data.monthly || data.Monthly || {};
  const overall = data.overall || data.Overall || {};

  const metrics = [
    {
      label: "Fatality",
      keys: ["Fatality", "fatality"],
      icon: "⚠"
    },
    {
      label: "LTI",
      keys: ["LTI", "lti"],
      icon: "✚"
    },
    {
      label: "MTC",
      keys: ["MTC", "mtc"],
      icon: "✚"
    },
    {
      label: "FAC",
      keys: ["FAC", "fac"],
      icon: "✓"
    },
    {
      label: "Near Miss",
      keys: ["Near_Miss", "nearMiss", "NearMiss"],
      icon: "!"
    },
    {
      label: "Unsafe Acts",
      keys: ["Unsafe_Acts", "unsafeActs"],
      icon: "⚡"
    },
    {
      label: "Unsafe Conditions",
      keys: ["Unsafe_Conditions", "unsafeConditions"],
      icon: "◈"
    },
    {
      label: "Manpower",
      keys: ["Manpower", "manpower"],
      icon: "♙"
    }
  ];

  $("kpi-grid").innerHTML = metrics.map(metric => {
    const value = findValue(monthly, metric.keys);

    return `
      <article class="kpi-card">
        <div class="kpi-icon">${metric.icon}</div>
        <div class="kpi-label">${metric.label}</div>
        <div class="kpi-value">${escapeHTML(value)}</div>
        <div class="kpi-description">Selected month</div>
      </article>
    `;
  }).join("");

  $("performance-table-body").innerHTML = metrics.map(metric => `
    <tr>
      <td>${metric.label}</td>
      <td>${escapeHTML(findValue(monthly, metric.keys))}</td>
      <td>${escapeHTML(findValue(overall, metric.keys))}</td>
    </tr>
  `).join("");

  renderActivities(data.activities || data.Activities || {});
  renderCompliance(data.compliance || data.Compliance || {});
  renderRecognition(data.recognition || data.Recognition || {});
  renderEmergency(data.emergency || data.Emergency || {});
}

/* ================================================
   11. ACTIVITIES
================================================ */

function renderActivities(activities) {
  const container = $("activity-summary");

  const items = [
    ["TBT", "TBT"],
    ["Safety Trainings", "Safety_Trainings"],
    ["Inspections", "Inspections"],
    ["Audits", "Audits"],
    ["Emergency Drills", "Emergency_Drills"]
  ];

  container.innerHTML = items.map(([label, key]) => `
    <div class="activity-item">
      <div class="activity-icon">✓</div>
      <div class="activity-info">
        <strong>${label}</strong>
        <small>Monthly activities</small>
      </div>
      <div class="activity-count">
        ${escapeHTML(activities[key] ?? activities[label] ?? 0)}
      </div>
    </div>
  `).join("");
}

/* ================================================
   12. COMPLIANCE
================================================ */

function renderCompliance(compliance) {
  const raised = Number(compliance.raised ?? compliance.Observations_Raised ?? 0);
  const closed = Number(compliance.closed ?? compliance.Observations_Closed ?? 0);

  const percentage = raised > 0
    ? Math.min(100, Math.round((closed / raised) * 100))
    : 100;

  $("compliance-summary").innerHTML = `
    <div class="compliance-stat">
      <div class="compliance-stat-header">
        <strong>Observation Closure</strong>
        <strong>${percentage}%</strong>
      </div>
      <div class="progress-track">
        <div class="progress-bar" style="width:${percentage}%"></div>
      </div>
    </div>

    <div class="compliance-details">
      <div class="compliance-detail">
        <small>Raised</small>
        <strong>${raised}</strong>
      </div>
      <div class="compliance-detail">
        <small>Closed</small>
        <strong>${closed}</strong>
      </div>
    </div>
  `;
}

/* ================================================
   13. RECOGNITION
================================================ */

function renderRecognition(recognition) {
  const name = recognition.Employee_Name ||
    recognition.employeeName ||
    recognition.name ||
    "No recognition published";

  const designation = recognition.Designation ||
    recognition.designation || "";

  const contractor = recognition.Contractor ||
    recognition.contractor || "";

  const photo = recognition.Photo_URL ||
    recognition.photoUrl || "";

  $("recognition-summary").innerHTML = `
    <div class="recognition-card">
      <div class="recognition-photo">
        ${photo ? `<img src="${escapeHTML(photo)}" alt="Safety performer">` : ""}
      </div>
      <div class="recognition-info">
        <span class="award-label">★ Best Safety Performer</span>
        <h4>${escapeHTML(name)}</h4>
        <p>${escapeHTML(designation)}</p>
        <p>${escapeHTML(contractor)}</p>
      </div>
    </div>
  `;
}

/* ================================================
   14. EMERGENCY INFORMATION
================================================ */

function renderEmergency(emergency) {
  const fields = [
    ["Emergency Contact 1", "Emergency_Contact_1_Number"],
    ["Emergency Contact 2", "Emergency_Contact_2_Number"],
    ["Ambulance", "Ambulance_Number"],
    ["Fire", "Fire_Number"],
    ["Hospital", "Nearest_Hospital"],
    ["Hospital Contact", "Hospital_Contact"],
    ["ERT", "Emergency_Response_Team"],
    ["Assembly Point", "Assembly_Point"]
  ];

  $("emergency-summary").innerHTML = `
    <div class="emergency-grid">
      ${fields.map(([label, key]) => `
        <div class="emergency-card">
          <small>${label}</small>
          <strong>${escapeHTML(emergency[key] || "Not configured")}</strong>
        </div>
      `).join("")}
    </div>
    <div class="emergency-message">
      <strong>Key Safety Message:</strong>
      ${escapeHTML(emergency.Key_Safety_Message || "Follow site emergency procedures.")}
    </div>
  `;
}

/* ================================================
   15. EMPTY DASHBOARD
================================================ */

function renderEmptyDashboard() {
  $("kpi-grid").innerHTML =
    "<p>No dashboard data available for this site.</p>";

  $("performance-table-body").innerHTML = "";
  $("activity-summary").innerHTML = "";
  $("compliance-summary").innerHTML = "";
  $("recognition-summary").innerHTML = "";
  $("emergency-summary").innerHTML = "";
}

/* ================================================
   16. NAVIGATION
================================================ */

function navigateTo(page) {
  state.currentPage = page;

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  const titles = {
    dashboard: ["Dashboard", "HSE Performance Overview"],
    "data-entry": ["Daily Data Entry", "Daily HSE reporting"],
    incidents: ["Incident Management", "Incident records and actions"],
    recognition: ["Safety Recognition", "Safety performer management"],
    emergency: ["Emergency Information", "Emergency response details"],
    sites: ["Site Management", "Project and site administration"],
    users: ["User Management", "Dashboard access management"],
    settings: ["Dashboard Settings", "Display and branding configuration"]
  };

  const title = titles[page] || ["Dashboard", "HSE Performance"];

  $("page-title").textContent = title[0];
  $("page-subtitle").textContent = title[1];

  const isDashboard = page === "dashboard";

  $("dashboard-page").classList.toggle("hidden", !isDashboard);
  $("other-page").classList.toggle("hidden", isDashboard);
  $("dashboard-context").classList.toggle("hidden", !isDashboard);

  if (!isDashboard) {
    $("other-page-heading").textContent = title[0];
    $("other-page-description").textContent =
      "This module will be connected to its backend operations in the next implementation stage.";
    $("other-page-content").innerHTML = "";
  }

  $("sidebar").classList.remove("open");
}

/* ================================================
   17. EVENT LISTENERS
================================================ */

function bindEvents() {
  $("login-form").addEventListener("submit", event => {
    event.preventDefault();

    login(
      $("login-email").value.trim(),
      $("login-password").value
    );
  });

  $("logout-button").addEventListener("click", logout);

  $("site-selector").addEventListener("change", async event => {
    state.selectedSite = event.target.value;
    await loadDashboard();
  });

  $("month-selector").addEventListener("change", async event => {
    state.selectedMonth = event.target.value;
    await loadDashboard();
  });

  $("sidebar-nav").addEventListener("click", event => {
    const button = event.target.closest("[data-page]");
    if (button) navigateTo(button.dataset.page);
  });

  $("menu-toggle").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });
}

/* ================================================
   18. SESSION RESTORATION
================================================ */

async function restoreSession(user = auth.currentUser) {
  if (!user) {
    console.warn("[AUTH] No Firebase user found after refresh.");
    showLoginScreen();
    return;
  }

  try {
    const idToken = await user.getIdToken();
    console.log("[AUTH] Firebase session restored.");

    const result = await apiRequest("auth.me");

    console.log("[AUTH] Backend auth.me response:", result);

    if (!result || result.ok !== true) {
      throw new Error(
        result?.error || result?.message || "Backend authentication failed"
      );
    }

    const profile = result.user || result.data?.user;

    if (!profile) {
      throw new Error("User profile missing in auth.me response");
    }

    state.profile = profile;
    await initializeUserInterface();

    console.log("[AUTH] Session restoration successful.");

  } catch (error) {
    console.error("[AUTH] Session restoration failed:", error);
    showLoginScreen();
  }
}



/* ================================================
   19. APPLICATION STARTUP
================================================ */

async function startApplication() {
  try {
    bindEvents();

    $("app-version").textContent = `Version ${APP_CONFIG.VERSION}`;

    await initializeFirebase();

    state.firebase.onAuthStateChanged(
      state.auth,
      restoreSession
    );

  } catch (error) {
    console.error("Application startup error:", error);

    setLoginMessage(
      "Application initialization failed. Please refresh.",
      "error"
    );
  }
}

startApplication();
                  
