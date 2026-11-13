const message = document.querySelector("#auth-message");
const adminMessage = document.querySelector("#admin-message");
const loginForm = document.querySelector("#login-panel");
const registerForm = document.querySelector("#register-panel");
const otpForm = document.querySelector("#otp-panel");
const otpResendButton = document.querySelector("#otp-resend");
const otpResendStatus = document.querySelector("#otp-resend-status");
const signedInPanel = document.querySelector("#signed-in-panel");
const adminPanel = document.querySelector("#admin-panel");
const adminUserList = document.querySelector("#admin-user-list");
const activeUsersTab = document.querySelector("#active-users-tab");
const archivedUsersTab = document.querySelector("#archived-users-tab");
const backupsTab = document.querySelector("#backups-tab");
const adminBackups = document.querySelector("#admin-backups");
const backupList = document.querySelector("#backup-list");
const securityInfo = document.querySelector("#security-info");
const loginTab = document.querySelector("#login-tab");
const registerTab = document.querySelector("#register-tab");
const appNavigation = document.querySelector("#app-navigation");
const dashboardLink = document.querySelector("#dashboard-link");
const reportsLink = document.querySelector("#reports-link");
const adminLink = document.querySelector("#admin-link");
const implementationReportLink = document.querySelector("#implementation-report-link");
const mobileNavigation = document.querySelector("#mobile-navigation");
const mobileDashboardLink = document.querySelector("#mobile-dashboard-link");
const mobileReportsLink = document.querySelector("#mobile-reports-link");
const mobileAdminLink = document.querySelector("#mobile-admin-link");
const logoutButton = document.querySelector("#logout-button");
const mobileLogoutButton = document.querySelector("#mobile-logout-button");
const operationsDashboard = document.querySelector("#operations-dashboard");
const implementationReportPage = document.querySelector("#implementation-report-page");
const implementationReportContent = document.querySelector("#implementation-report-content");
const implementationReportError = document.querySelector("#implementation-report-error");
const dashboardContent = document.querySelector("#dashboard-content");
const dashboardError = document.querySelector("#dashboard-error");
const dashboardTitle = document.querySelector("#operations-title");
const dashboardEyebrow = operationsDashboard.querySelector(".eyebrow");
const dashboardSubtitle = document.querySelector("#dashboard-subtitle");
let pendingEmail = "";
let otpExpiryTimer = null;
let otpExpiresAt = 0;
let dashboardRole = "";
let dashboardData = null;
let reportData = null;
let reportFilter = "";

function showMessage(text, isError = false) {
  const target = !document.body.classList.contains("authenticated")
    ? message
    : adminPanel.hidden
      ? dashboardError
      : adminMessage;
  if (!target) return;
  target.textContent = text;
  target.classList.toggle("error", isError);
  target.hidden = false;
}

function requireSignIn(messageText = "Your sign-in session has expired. Please sign in again.") {
  dashboardRole = "";
  if (appNavigation) appNavigation.hidden = true;
  if (mobileNavigation) mobileNavigation.hidden = true;
  if (operationsDashboard) operationsDashboard.hidden = true;
  if (adminPanel) adminPanel.hidden = true;
  if (implementationReportPage) implementationReportPage.hidden = true;
  history.replaceState(null, "", "/");
  showPanel("login");
  showMessage(messageText, true);
}

function hideMessage() {
  if (message) {
    message.textContent = "";
    message.classList.remove("error");
    message.hidden = true;
  }
}

function showPanel(panel) {
  const authenticated = panel === "signed-in" || panel === "admin";
  document.body.classList.toggle("authenticated", authenticated);
  if (loginForm) loginForm.hidden = panel !== "login";
  if (registerForm) registerForm.hidden = panel !== "register";
  if (otpForm) otpForm.hidden = panel !== "otp";
  if (signedInPanel) signedInPanel.hidden = !authenticated;
  if (appNavigation) appNavigation.hidden = !authenticated;
  if (mobileNavigation) mobileNavigation.hidden = !authenticated;
  if (adminPanel) adminPanel.hidden = panel !== "admin";
  if (operationsDashboard) operationsDashboard.hidden = true;
  if (implementationReportPage) implementationReportPage.hidden = true;
  if (panel === "login" || panel === "register" || panel === "otp") {
    if (operationsDashboard) operationsDashboard.hidden = true;
    if (implementationReportPage) implementationReportPage.hidden = true;
  }
  if (loginTab) {
    loginTab.classList.toggle("active", panel === "login" || panel === "otp");
    loginTab.setAttribute("aria-selected", String(panel === "login" || panel === "otp"));
  }
  if (registerTab) {
    registerTab.classList.toggle("active", panel === "register");
    registerTab.setAttribute("aria-selected", String(panel === "register"));
  }
  if (panel !== "otp") hideMessage();
}

async function api(path, data, method = "POST") {
  const options = {
    method,
    headers: { "Content-Type": "application/json" }
  };
  if (method !== "GET" && data !== undefined) options.body = JSON.stringify(data);
  const response = await fetch(path, options);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`The server returned an invalid response (${response.status}).`);
  }
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}

function showSignedIn(user, redirect = true) {
  dashboardRole = user.role;
  const nameEl = document.querySelector("#signed-in-name");
  const roleEl = document.querySelector("#signed-in-role");
  if (nameEl) {
    nameEl.dataset.userId = user.id;
    nameEl.textContent = user.username;
  }
  if (roleEl) roleEl.textContent = roleLabel(user.role);

  if (user.role === "main_admin") {
    showPanel("admin");
  } else {
    showPanel("signed-in");
  }

  const isHighRole = ["main_admin", "hall_master", "hall_president"].includes(user.role);
  if (reportsLink) reportsLink.hidden = !isHighRole;
  if (adminLink) adminLink.hidden = user.role !== "main_admin";
  if (implementationReportLink) implementationReportLink.hidden = user.role !== "main_admin";
  if (mobileReportsLink) mobileReportsLink.hidden = !isHighRole;
  if (mobileAdminLink) mobileAdminLink.hidden = user.role !== "main_admin";

  if (redirect) {
    const destination = user.role === "main_admin" ? "/admin" : "/dashboard";
    navigateTo(destination, true);
  } else {
    renderCurrentRoute(true);
  }
}

function navigateTo(path, replace = false) {
  if (replace) history.replaceState(null, "", path);
  else history.pushState(null, "", path);
  renderCurrentRoute(true);
}

function bindNavigation(link, destination) {
  if (!link) return;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigateTo(destination);
  });
}

function roleLabel(role) {
  return {
    main_admin: "Main Admin (Porter)",
    hall_master: "Hall Master / Mistress",
    hall_president: "Hall President",
    student: "Student"
  }[role] ?? "Student";
}

// --- FORM EVENT LISTENERS (LOGIN & OTP HANDLERS) ---

if (loginTab) {
  loginTab.addEventListener("click", () => showPanel("login"));
}

if (registerTab) {
  registerTab.addEventListener("click", () => showPanel("register"));
}

const backToLoginButton = document.querySelector("#back-to-login");
if (backToLoginButton) {
  backToLoginButton.addEventListener("click", () => {
    showPanel("login");
    pendingEmail = "";
    if (otpExpiryTimer) clearInterval(otpExpiryTimer);
    if (otpResendButton) {
      otpResendButton.disabled = true;
      otpResendButton.textContent = "Resend code";
    }
  });
}

function startOtpExpiryCountdown(expiresInSeconds = 300) {
  if (otpExpiryTimer) clearInterval(otpExpiryTimer);
  otpExpiresAt = Date.now() + expiresInSeconds * 1000;
  const update = () => {
    const remaining = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
    if (otpResendButton) {
      otpResendButton.disabled = remaining > 0;
      otpResendButton.textContent = remaining > 0
        ? `Resend code in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
        : "Resend code";
    }
    if (!remaining && otpExpiryTimer) {
      clearInterval(otpExpiryTimer);
      otpExpiryTimer = null;
      if (otpResendStatus) otpResendStatus.textContent = "Your code expired. Request a fresh code to continue.";
    }
  };
  update();
  otpExpiryTimer = setInterval(update, 1000);
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emailInput = loginForm.querySelector("input[type='email'], input[name='email']");
    const passwordInput = loginForm.querySelector("input[type='password'], input[name='password']");

    const email = emailInput?.value?.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      showMessage("Please enter both your email address and password.", true);
      return;
    }

    const submitBtn = loginForm.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.disabled = true;

    try {
      hideMessage();
      const result = await api("/api/auth/login", { email, password });
      pendingEmail = email;
      const otpEmail = document.querySelector("#otp-email");
      const otpInput = otpForm?.querySelector("input[name='code']");
      if (otpEmail) otpEmail.textContent = email;
      if (otpInput) otpInput.value = "";
      showPanel("otp");
      startOtpExpiryCountdown(result.expiresInSeconds);
      showMessage(result.demoCode
        ? `${result.message} Code: ${result.demoCode}`
        : result.message || "Verification code sent. Check your email for the 6-digit code.");
      otpInput?.focus();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

if (otpResendButton) {
  otpResendButton.addEventListener("click", async () => {
    if (!pendingEmail || Date.now() < otpExpiresAt) return;
    const password = loginForm?.querySelector("input[name='password']")?.value;
    if (!password) {
      showMessage("Return to sign in and enter your password before requesting another code.", true);
      return;
    }

    otpResendButton.disabled = true;
    otpResendButton.textContent = "Sending code…";
    try {
      const result = await api("/api/auth/resend-otp", {
        email: pendingEmail,
        password
      });
      const otpInput = otpForm?.querySelector("input[name='code']");
      if (otpInput) otpInput.value = "";
      showMessage(result.demoCode
        ? `${result.message} Code: ${result.demoCode}`
        : result.message || "A new verification code was sent.");
      startOtpExpiryCountdown(result.expiresInSeconds);
      otpInput?.focus();
    } catch (error) {
      showMessage(error.message, true);
      otpResendButton.disabled = false;
      otpResendButton.textContent = "Resend code";
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const submitButton = registerForm.querySelector("button[type='submit']");
    if (submitButton) submitButton.disabled = true;

    try {
      const result = await api("/api/auth/register", {
        username: formData.get("username"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role")
      });
      const loginEmail = loginForm?.querySelector("input[name='email']");
      if (loginEmail) loginEmail.value = String(formData.get("email") ?? "");
      registerForm.reset();
      showPanel("login");
      showMessage(result.message || "Account created. Sign in to continue.");
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

if (otpForm) {
  const otpInput = otpForm.querySelector("input[name='code'], input[type='text']");
  if (otpInput) {
    otpInput.addEventListener("input", () => {
      otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
    });
  }

// Navigation listeners are shared by desktop and mobile controls.
bindNavigation(dashboardLink, "/dashboard");
bindNavigation(reportsLink, "/reports");
bindNavigation(adminLink, "/admin");
bindNavigation(implementationReportLink, "/implementation-report");
bindNavigation(mobileDashboardLink, "/dashboard");
bindNavigation(mobileReportsLink, "/reports");
bindNavigation(mobileAdminLink, "/admin");

  otpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = otpInput?.value?.trim();

    if (!code || !/^\d{6}$/.test(code)) {
      showMessage("Please enter the full 6-digit verification code.", true);
      otpInput?.focus();
      otpInput?.select();
      return;
    }

    const submitBtn = otpForm.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.disabled = true;

    try {
      hideMessage();
      const result = await api("/api/auth/verify-otp", { email: pendingEmail, code });
      if (otpExpiryTimer) clearInterval(otpExpiryTimer);
      otpExpiryTimer = null;
      const passwordInput = loginForm?.querySelector("input[name='password']");
      if (passwordInput) passwordInput.value = "";
      showSignedIn(result.user);
    } catch (error) {
      showMessage(error.message, true);
      otpInput?.focus();
      otpInput?.select();
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

function addText(parent, tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function renderDashboard(data) {
  dashboardData = data;
  dashboardContent.replaceChildren();
  dashboardTitle.textContent = data.role === "student" ? "Student dashboard" : "Hostel dashboard";
  dashboardSubtitle.textContent = data.role === "student"
    ? "View your Haven Hall registration status."
    : "Hostel occupancy and resident overview.";

  if (data.role === "student") {
    const registration = data.registration;
    const card = document.createElement("article");
    card.className = "student-record";
    addText(card, "p", "card-kicker", "HAVEN HALL REGISTRATION");
    addText(card, "h3", "", registration ? `Registration ${registration.status.replaceAll("_", " ")}` : "No registration yet");
    if (registration) {
      const details = document.createElement("div");
      details.className = "student-record-details";
      for (const [label, value] of [
        ["Name", registration.student_name],
        ["Email", registration.student_email],
        ["Hall", registration.hall_name],
        ["Room", registration.room_number ?? "Not assigned"]
      ]) {
        addText(details, "p", "", `${label}: ${value || "Not provided"}`);
      }
      card.append(details);
    }
    if (!registration || registration.status === "checked_out") renderResidentRegistrationForm(card);
    dashboardContent.append(card);
    return;
  }

  const stats = data.stats ?? {};
  const metrics = [
    ["Check-ins", stats.checked_in, "check-ins"],
    ["Pending", stats.pending, "pending"],
    ["Check-outs", stats.checked_out, "check-outs"],
    ["Available beds", stats.available_beds, "available-beds"],
    ["Occupancy", `${stats.occupancy_percent ?? 0}%`, "occupancy"]
  ];
  const grid = document.createElement("div");
  grid.className = "metric-grid";
  for (const [label, value, page] of metrics) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "metric-card";
    card.dataset.dashboardPage = page;
    card.setAttribute("aria-label", `Open ${label.toLowerCase()} details`);
    addText(card, "span", "metric-label", label);
    addText(card, "strong", "metric-value", String(value ?? 0));
    grid.append(card);
  }
  dashboardContent.append(grid);

  const columns = document.createElement("div");
  columns.className = "dashboard-columns";
  const roomCard = document.createElement("article");
  roomCard.className = "dashboard-card";
  addText(roomCard, "h3", "dashboard-card-title", "Rooms");
  const roomList = document.createElement("div");
  roomList.className = "room-list";
  for (const room of data.rooms ?? []) {
    const row = document.createElement("div");
    row.className = "room-row";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "room-link";
    open.dataset.roomId = String(room.id);
    open.textContent = room.room_number;
    row.append(open);
    const meter = document.createElement("span");
    meter.className = "room-meter";
    const fill = document.createElement("span");
    fill.style.width = `${room.capacity ? Math.min(100, room.occupied / room.capacity * 100) : 0}%`;
    meter.append(fill);
    row.append(meter);
    addText(row, "small", "", `${room.occupied}/${room.capacity} occupied · ${room.available} free`);
    roomList.append(row);
  }
  roomCard.append(roomList);
  columns.append(roomCard);

  const residentCard = document.createElement("article");
  residentCard.className = "dashboard-card";
  addText(residentCard, "h3", "dashboard-card-title", "Resident activity");
  const residentTabs = document.createElement("nav");
  residentTabs.className = "dashboard-nav";
  for (const [filter, label] of [
    ["all", "All"],
    ["pending", "Pending"],
    ["checked_in", "Checked in"],
    ["checked_out", "Checked out"]
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dashboard-tab";
    button.dataset.dashboardFilter = filter;
    button.textContent = label;
    residentTabs.append(button);
  }
  residentCard.append(residentTabs);
  const residents = document.createElement("div");
  residents.dataset.residentList = "true";
  residentCard.append(residents);
  columns.append(residentCard);
  dashboardContent.append(columns);
  renderResidentList("all");
}

async function renderCurrentRoute() {
  if (!dashboardRole) {
    showPanel("login");
    return;
  }

  const isAdmin = dashboardRole === "main_admin";
  const dashboardDetail = location.pathname.match(/^\/dashboard\/(check-ins|pending|check-outs|available-beds|occupancy)$/);
  const roomDetail = location.pathname.match(/^\/dashboard\/rooms\/(\d+)$/);
  const route = ["/dashboard", "/reports", "/admin", "/implementation-report"].includes(location.pathname) ||
      dashboardDetail || roomDetail
    ? location.pathname
    : isAdmin ? "/admin" : "/dashboard";
  if (!isAdmin && (["/admin", "/implementation-report"].includes(route) || dashboardDetail || roomDetail)) {
    history.replaceState(null, "", "/dashboard");
    await renderCurrentRoute();
    return;
  }
  if (!isAdmin && route === "/reports" && dashboardRole === "student") {
    history.replaceState(null, "", "/dashboard");
    await renderCurrentRoute();
    return;
  }
  if (route !== location.pathname) history.replaceState(null, "", route);

  operationsDashboard.hidden = true;
  adminPanel.hidden = true;
  implementationReportPage.hidden = true;
  if (route === "/admin") {
    showPanel("admin");
    await loadAdminTab("active");
    return;
  }
  if (route === "/reports") {
    showPanel("signed-in");
    operationsDashboard.hidden = false;
    await loadReports();
    return;
  }
  if (route === "/implementation-report") {
    showPanel("signed-in");
    await loadImplementationReport();
    return;
  }
  showPanel("signed-in");
  operationsDashboard.hidden = false;
  await loadDashboard();
  if (dashboardDetail && dashboardData) renderDashboardDetail(dashboardDetail[1]);
  if (roomDetail) await loadRoomDetails(roomDetail[1]);
}

function renderDashboardDetail(detail) {
  if (!dashboardData || dashboardData.role === "student") return;
  const labels = {
    "check-ins": "Check-ins",
    pending: "Pending registrations",
    "check-outs": "Check-outs",
    "available-beds": "Rooms with available beds",
    occupancy: "Room occupancy"
  };
  dashboardTitle.textContent = labels[detail] ?? "Dashboard details";
  dashboardSubtitle.textContent = "Select a room or resident to view details.";
  dashboardContent.replaceChildren();
  const back = document.createElement("button");
  back.type = "button";
  back.className = "button dashboard-back";
  back.dataset.action = "dashboard-back";
  back.textContent = "Back to dashboard";
  dashboardContent.append(back);

  if (detail === "available-beds" || detail === "occupancy") {
    const rooms = detail === "available-beds"
      ? dashboardData.rooms.filter((room) => room.available > 0)
      : dashboardData.rooms;
    const grid = document.createElement("div");
    grid.className = "resident-room-grid";
    for (const room of rooms) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "resident-room-button";
      button.dataset.roomId = String(room.id);
      addText(button, "strong", "", `Room ${room.room_number}`);
      addText(button, "span", "", `${room.occupied}/${room.capacity} occupied`);
      addText(button, "small", "", `${room.available} available bed(s)`);
      const meter = document.createElement("span");
      meter.className = "room-meter";
      const fill = document.createElement("span");
      fill.style.width = `${room.capacity ? Math.min(100, room.occupied / room.capacity * 100) : 0}%`;
      meter.append(fill);
      button.append(meter);
      grid.append(button);
    }
    if (!rooms.length) addText(grid, "p", "admin-empty", "No rooms match this view.");
    dashboardContent.append(grid);
    return;
  }

  const residents = detail === "check-ins"
    ? dashboardData.residents
    : detail === "pending"
      ? dashboardData.pending
      : dashboardData.checkedOut;
  renderResidentDetailList(residents ?? []);
}

function renderResidentDetailList(residents) {
  const container = document.createElement("div");
  container.className = "dashboard-detail-page";
  if (!residents.length) {
    addText(container, "p", "admin-empty", "No residents to show.");
    dashboardContent.append(container);
    return;
  }
  const canManage = !dashboardData?.readOnly && dashboardRole !== "hall_president";
  for (const resident of residents) {
    const card = document.createElement("article");
    card.className = "dashboard-card detail-record";
    addText(card, "h3", "dashboard-card-title", resident.student_name);
    addText(card, "p", "detail-summary", `${resident.student_email} · ${resident.status.replaceAll("_", " ")}`);
    addText(card, "p", "", `${resident.hall_name} · ${resident.room_number ? `Room ${resident.room_number}` : "No room assigned"}`);
    if (canManage && resident.status !== "checked_out") {
      const actions = document.createElement("div");
      actions.className = "resident-actions detail-actions";
      const roomSelect = document.createElement("select");
      roomSelect.dataset.action = "assign-room";
      roomSelect.dataset.registrationId = String(resident.id);
      roomSelect.setAttribute("aria-label", `Room for ${resident.student_name}`);
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = resident.room_number ? `Room ${resident.room_number}` : "Assign room";
      roomSelect.append(placeholder);
      for (const room of dashboardData.rooms ?? []) {
        const option = document.createElement("option");
        option.value = String(room.id);
        option.textContent = `${room.room_number} (${room.available} free)`;
        roomSelect.append(option);
      }
      actions.append(roomSelect);
      const action = document.createElement("button");
      action.type = "button";
      action.className = "admin-action";
      action.dataset.action = resident.status === "checked_in" ? "check-out" : "check-in";
      action.dataset.registrationId = String(resident.id);
      action.textContent = resident.status === "checked_in" ? "Check out" : "Check in";
      actions.append(action);
      card.append(actions);
    }
    container.append(card);
  }
  dashboardContent.append(container);
}

function renderResidentRegistrationForm(parent) {
  const form = document.createElement("form");
  form.className = "resident-registration-form";
  form.dataset.action = "register-resident";
  addText(form, "h3", "dashboard-card-title", "Apply for Haven Hall");
  for (const [name, label, type, required] of [
    ["studentName", "Full name", "text", true],
    ["phone", "Phone number", "tel", false],
    ["emergencyContactName", "Emergency contact name", "text", false],
    ["emergencyContactPhone", "Emergency contact phone", "tel", false]
  ]) {
    const field = document.createElement("label");
    field.textContent = label;
    const input = document.createElement("input");
    input.name = name;
    input.type = type;
    input.required = required;
    field.append(input);
    form.append(field);
  }
  const genderField = document.createElement("label");
  genderField.textContent = "Gender";
  const gender = document.createElement("select");
  gender.name = "gender";
  gender.required = true;
  for (const [value, label] of [
    ["", "Choose gender"],
    ["female", "Female"],
    ["male", "Male"],
    ["other", "Other"],
    ["prefer_not_to_say", "Prefer not to say"]
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    gender.append(option);
  }
  genderField.append(gender);
  form.append(genderField);
  const notesField = document.createElement("label");
  notesField.textContent = "Notes (optional)";
  const notes = document.createElement("textarea");
  notes.name = "notes";
  notes.maxLength = 1000;
  notesField.append(notes);
  form.append(notesField);
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "button button-primary";
  submit.textContent = "Submit registration";
  form.append(submit);
  parent.append(form);
}

function showDashboardMessage(text, isError = false) {
  dashboardError.textContent = text;
  dashboardError.classList.toggle("error", isError);
  dashboardError.hidden = !text;
}

function renderResidentList(filter) {
  const list = dashboardContent.querySelector("[data-resident-list]");
  if (!list || !dashboardData) return;
  list.replaceChildren();
  for (const tab of dashboardContent.querySelectorAll("[data-dashboard-filter]")) {
    tab.classList.toggle("active", tab.dataset.dashboardFilter === filter);
    tab.setAttribute("aria-pressed", String(tab.dataset.dashboardFilter === filter));
  }
  if (filter === "rooms") {
    for (const room of dashboardData.rooms ?? []) {
      const row = document.createElement("div");
      row.className = "room-row";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "room-link";
      open.dataset.roomId = String(room.id);
      open.textContent = `Room ${room.room_number}`;
      row.append(open);
      addText(row, "span", "", `${room.occupied}/${room.capacity} occupied`);
      addText(row, "small", "", `${room.available} free bed(s)`);
      list.append(row);
    }
    if (!dashboardData.rooms?.length) addText(list, "p", "admin-empty", "No rooms to show.");
    return;
  }
  const residents = filter === "all"
    ? dashboardData.recent ?? []
    : dashboardData[filter === "checked_in" ? "residents" : filter === "checked_out" ? "checkedOut" : filter] ?? [];
  if (!residents.length) {
    addText(list, "p", "admin-empty", "No residents to show.");
    return;
  }
  const canManage = !dashboardData.readOnly && dashboardRole !== "hall_president";
  const rows = document.createElement("div");
  rows.className = "recent-list";
  for (const resident of residents) {
    const row = document.createElement("article");
    row.className = "recent-row";
    const identity = document.createElement("div");
    identity.className = "recent-info";
    addText(identity, "strong", "", resident.student_name);
    addText(identity, "small", "", `${resident.status.replaceAll("_", " ")} · ${resident.student_email}`);
    row.append(identity);
    if (canManage && resident.status !== "checked_out") {
      const actions = document.createElement("div");
      actions.className = "resident-actions";
      const roomSelect = document.createElement("select");
      roomSelect.dataset.action = "assign-room";
      roomSelect.dataset.registrationId = String(resident.id);
      roomSelect.setAttribute("aria-label", `Room for ${resident.student_name}`);
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = resident.room_number ? `Room ${resident.room_number}` : "Assign room";
      roomSelect.append(defaultOption);
      for (const room of dashboardData.rooms ?? []) {
        const option = document.createElement("option");
        option.value = String(room.id);
        option.textContent = `${room.room_number} (${room.available} free)`;
        roomSelect.append(option);
      }
      actions.append(roomSelect);
      const action = document.createElement("button");
      action.type = "button";
      action.className = "admin-action";
      action.dataset.action = resident.status === "checked_in" ? "check-out" : "check-in";
      action.dataset.registrationId = String(resident.id);
      action.textContent = resident.status === "checked_in" ? "Check out" : "Check in";
      actions.append(action);
      row.append(actions);
    }
    rows.append(row);
  }
  list.append(rows);
}

async function loadRoomDetails(roomId) {
  try {
    const result = await api(`/api/rooms/${roomId}`, undefined, "GET");
    dashboardContent.replaceChildren();
    dashboardTitle.textContent = `Room ${result.room.room_number}`;
    dashboardSubtitle.textContent = `${result.room.occupied}/${result.room.capacity} occupied · ${result.room.pending} pending`;
    const page = document.createElement("section");
    page.className = "dashboard-detail-page";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "button dashboard-back";
    back.dataset.action = "dashboard-back";
    back.textContent = "Back to dashboard";
    page.append(back);
    const card = document.createElement("article");
    card.className = "dashboard-card";
    addText(card, "h3", "dashboard-card-title", `Room ${result.room.room_number}`);
    addText(card, "p", "detail-summary", `${result.room.occupied}/${result.room.capacity} occupied · ${result.room.pending} pending`);
    for (const resident of result.residents) {
      addText(card, "p", "", `${resident.student_name} · ${resident.status.replaceAll("_", " ")}`);
    }
    page.append(card);
    dashboardContent.append(page);
  } catch (error) {
    showDashboardMessage(error.message, true);
  }
}

async function loadDashboard() {
  dashboardError.hidden = true;
  try {
    renderDashboard(await api("/api/dashboard", undefined, "GET"));
    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.className = "button dashboard-back";
    refresh.dataset.action = "refresh-dashboard";
    refresh.textContent = "Refresh dashboard";
    dashboardContent.prepend(refresh);
  } catch (error) {
    if (error.message === "Sign in required.") {
      requireSignIn();
      return;
    }
    dashboardError.textContent = error.message;
    dashboardError.hidden = false;
  }
}

if (dashboardContent) {
  dashboardContent.addEventListener("click", async (event) => {
    const pageButton = event.target.closest("button[data-dashboard-page]");
    if (pageButton) {
      navigateTo(`/dashboard/${pageButton.dataset.dashboardPage}`);
      return;
    }

    const filterButton = event.target.closest("[data-dashboard-filter]");
    if (filterButton) {
      renderResidentList(filterButton.dataset.dashboardFilter);
      return;
    }

    const roomButton = event.target.closest("button[data-room-id]");
    if (roomButton) {
      navigateTo(`/dashboard/rooms/${roomButton.dataset.roomId}`);
      return;
    }

    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) return;
    try {
      if (actionButton.dataset.action === "dashboard-back") {
        navigateTo("/dashboard");
        return;
      }
      if (actionButton.dataset.action === "refresh-dashboard") {
        await loadDashboard();
        showDashboardMessage("Dashboard refreshed.");
        return;
      }
      const registrationId = actionButton.dataset.registrationId;
      if (actionButton.dataset.action === "check-in" || actionButton.dataset.action === "check-out") {
        const path = actionButton.dataset.action === "check-in" ? "check-in" : "check-out";
        const result = await api(`/api/registrations/${registrationId}/${path}`, {});
        await loadDashboard();
        showDashboardMessage(result.message);
      }
    } catch (error) {
      showDashboardMessage(error.message, true);
    }
  });

  dashboardContent.addEventListener("change", async (event) => {
    const roomSelect = event.target.closest("select[data-action='assign-room']");
    if (!roomSelect || !roomSelect.value) return;
    try {
      const result = await api(
        `/api/registrations/${roomSelect.dataset.registrationId}/room`,
        { roomId: Number(roomSelect.value) },
        "PATCH"
      );
      await loadDashboard();
      showDashboardMessage(result.message);
    } catch (error) {
      showDashboardMessage(error.message, true);
    }
  });

  dashboardContent.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-action='register-resident']");
    if (!form) return;
    event.preventDefault();
    const submit = form.querySelector("button[type='submit']");
    submit.disabled = true;
    try {
      const result = await api("/api/registrations", Object.fromEntries(new FormData(form)));
      await loadDashboard();
      showDashboardMessage(result.message);
    } catch (error) {
      showDashboardMessage(error.message, true);
    } finally {
      submit.disabled = false;
    }
  });
}

function showAdminMessage(text, isError = false) {
  if (!adminMessage) return;
  adminMessage.textContent = text;
  adminMessage.classList.toggle("error", isError);
  adminMessage.hidden = false;
}

function roleName(role) {
  return {
    main_admin: "Main Admin",
    hall_master: "Hall Master / Mistress",
    hall_president: "Hall President",
    student: "Student"
  }[role] ?? role;
}

function addTableCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = text ?? "";
  row.append(cell);
  return cell;
}

function renderUsers(users, archived = false) {
  adminUserList.replaceChildren();
  if (!users.length) {
    addText(adminUserList, "p", "admin-empty", archived ? "No archived users." : "No active users.");
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "admin-user-table-wrap";
  const table = document.createElement("table");
  table.className = "admin-user-table";
  const headings = archived
    ? ["Name", "Email", "Role", "Archived", "Actions"]
    : ["Name", "Email", "Role", "Requested role", "Created", "Actions"];
  const thead = document.createElement("thead");
  const headingRow = document.createElement("tr");
  for (const heading of headings) addText(headingRow, "th", "", heading);
  thead.append(headingRow);
  table.append(thead);
  const body = document.createElement("tbody");
  for (const user of users) {
    const row = document.createElement("tr");
    row.className = "admin-user-row";
    row.dataset.userId = String(user.id);
    addTableCell(row, user.username);
    addTableCell(row, user.email);
    addTableCell(row, roleName(user.role));
    if (archived) {
      addTableCell(row, user.archived_at ?? "");
      const actions = document.createElement("td");
      const restore = document.createElement("button");
      restore.type = "button";
      restore.className = "admin-action";
      restore.dataset.action = "restore";
      restore.textContent = "Restore";
      actions.append(restore);
      row.append(actions);
    } else {
      const requested = addTableCell(row, "");
      if (user.requested_role) {
        requested.append(document.createTextNode(roleName(user.requested_role)));
        const requestLabel = document.createElement("small");
        requestLabel.className = "admin-role-request";
        requestLabel.textContent = "Awaiting approval";
        requested.append(requestLabel);
      }
      addTableCell(row, user.created_at ?? "");
      const actions = document.createElement("td");
      const protectedAccount = user.role === "main_admin";
      if (protectedAccount) {
        actions.className = "admin-protected-cell";
        actions.textContent = "Protected";
      } else {
        const role = document.createElement("select");
        role.setAttribute("aria-label", `Role for ${user.username}`);
        role.dataset.action = "role";
        role.dataset.previousRole = user.role;
        for (const [value, label] of [
          ["student", "Student"],
          ["hall_president", "Hall President"],
          ["hall_master", "Hall Master / Mistress"]
        ]) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          option.selected = user.role === value;
          role.append(option);
        }
        actions.append(role);
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "admin-action";
        edit.dataset.action = "edit";
        edit.textContent = "Edit";
        actions.append(edit);
        for (const [action, label, danger] of [
          ["archive", "Archive", false],
          ["delete", "Delete", true]
        ]) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `admin-action${danger ? " danger" : ""}`;
          button.dataset.action = action;
          button.textContent = label;
          actions.append(button);
        }
      }
      row.append(actions);
      if (!protectedAccount) {
        const editorRow = document.createElement("tr");
        editorRow.className = "admin-user-editor-row";
        editorRow.hidden = true;
        const editorCell = document.createElement("td");
        editorCell.colSpan = headings.length;
        const form = document.createElement("form");
        form.className = "admin-user-edit-form";
        form.dataset.action = "update";
        for (const [name, label, type, value] of [
          ["username", "Name", "text", user.username],
          ["email", "Email", "email", user.email],
          ["password", "New password (optional)", "password", ""]
        ]) {
          const field = document.createElement("label");
          field.textContent = label;
          const input = document.createElement("input");
          input.name = name;
          input.type = type;
          input.value = value;
          input.required = name !== "password";
          if (name === "password") input.minLength = 8;
          field.append(input);
          form.append(field);
        }
        const save = document.createElement("button");
        save.type = "submit";
        save.className = "admin-action";
        save.textContent = "Save changes";
        form.append(save);
        editorCell.append(form);
        editorRow.append(editorCell);
        body.append(row, editorRow);
      } else {
        body.append(row);
      }
      continue;
    }
    body.append(row);
  }
  table.append(body);
  wrapper.append(table);
  adminUserList.append(wrapper);
}

async function loadAdminTab(tab) {
  if (!adminPanel || dashboardRole !== "main_admin") return;
  activeUsersTab.classList.toggle("active", tab === "active");
  archivedUsersTab.classList.toggle("active", tab === "archived");
  backupsTab.classList.toggle("active", tab === "backups");
  activeUsersTab.setAttribute("aria-selected", String(tab === "active"));
  archivedUsersTab.setAttribute("aria-selected", String(tab === "archived"));
  backupsTab.setAttribute("aria-selected", String(tab === "backups"));
  adminUserList.hidden = tab === "backups";
  adminBackups.hidden = tab !== "backups";
  adminMessage.hidden = true;
  try {
    if (tab === "active" || tab === "archived") {
      const result = await api(tab === "active" ? "/api/admin/users" : "/api/admin/archived-users", undefined, "GET");
      renderUsers(result.users, tab === "archived");
      return;
    }
    const [backupResult, securityResult] = await Promise.all([
      api("/api/admin/backups", undefined, "GET"),
      api("/api/admin/security", undefined, "GET")
    ]);
    renderBackups(backupResult.backups);
    securityInfo.replaceChildren();
    addText(securityInfo, "h3", "dashboard-card-title", "Password security");
    addText(securityInfo, "p", "", `${securityResult.algorithm}: ${securityResult.salt}`);
    addText(securityInfo, "p", "", securityResult.pepper);
    addText(securityInfo, "p", "", securityResult.paymentData);
  } catch (error) {
    showAdminMessage(error.message, true);
  }
}

function renderBackups(backups) {
  backupList.replaceChildren();
  if (!backups.length) {
    addText(backupList, "p", "admin-empty", "No backups yet.");
    return;
  }
  for (const backup of backups) {
    const row = document.createElement("div");
    row.className = "admin-user-row";
    addText(row, "span", "backup-meta", `${new Date(backup.createdAt).toLocaleString()} · ${backup.sizeBytes} bytes`);
    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "admin-action";
    restore.dataset.action = "restore-backup";
    restore.dataset.backupId = backup.id;
    restore.textContent = "Restore";
    row.append(restore);
    backupList.append(row);
  }
}

if (activeUsersTab) activeUsersTab.addEventListener("click", () => loadAdminTab("active"));
if (archivedUsersTab) archivedUsersTab.addEventListener("click", () => loadAdminTab("archived"));
if (backupsTab) backupsTab.addEventListener("click", () => loadAdminTab("backups"));

if (adminUserList) {
  adminUserList.addEventListener("change", async (event) => {
    const select = event.target.closest("select[data-action='role']");
    if (!select) return;
    const row = select.closest("[data-user-id]");
    try {
      await api(`/api/admin/users/${row.dataset.userId}/role`, { role: select.value }, "PATCH");
      await loadAdminTab("active");
      showAdminMessage("User role updated.");
    } catch (error) {
      select.value = select.dataset.previousRole;
      showAdminMessage(error.message, true);
    }
  });

  adminUserList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const row = button.closest("[data-user-id]");
    const userId = row?.dataset.userId;
    try {
      if (button.dataset.action === "edit") {
        row.nextElementSibling.hidden = !row.nextElementSibling.hidden;
        return;
      }
      if (button.dataset.action === "restore") {
        await api(`/api/admin/archived-users/${userId}/restore`, {});
        await loadAdminTab("archived");
        showAdminMessage("Archived account restored.");
        return;
      }
      if (button.dataset.action === "archive" || button.dataset.action === "delete") {
        const action = button.dataset.action;
        if (!confirm(`${action === "archive" ? "Archive" : "Permanently delete"} this account?`)) return;
        const endpoint = action === "archive"
          ? `/api/admin/users/${userId}/archive`
          : `/api/admin/users/${userId}`;
        const result = await api(endpoint, action === "delete" ? undefined : {}, action === "delete" ? "DELETE" : "POST");
        await loadAdminTab("active");
        showAdminMessage(result.message);
      }
    } catch (error) {
      showAdminMessage(error.message, true);
    }
  });

  adminUserList.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-action='update']");
    if (!form) return;
    event.preventDefault();
    const row = form.closest("tr").previousElementSibling;
    const values = Object.fromEntries(new FormData(form));
    if (!values.password) delete values.password;
    try {
      const result = await api(`/api/admin/users/${row.dataset.userId}`, values, "PATCH");
      await loadAdminTab("active");
      showAdminMessage(result.message);
    } catch (error) {
      showAdminMessage(error.message, true);
    }
  });
}

const createBackupButton = document.querySelector("#create-backup-button");
if (createBackupButton) {
  createBackupButton.addEventListener("click", async () => {
    createBackupButton.disabled = true;
    try {
      const result = await api("/api/admin/backups", {});
      await loadAdminTab("backups");
      showAdminMessage(result.message);
    } catch (error) {
      showAdminMessage(error.message, true);
    } finally {
      createBackupButton.disabled = false;
    }
  });
}

if (backupList) {
  backupList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action='restore-backup']");
    if (!button || !confirm("Restore this backup's user roles and settings?")) return;
    try {
      const result = await api(`/api/admin/backups/${button.dataset.backupId}/restore`, {});
      await loadAdminTab("backups");
      showAdminMessage(result.message);
    } catch (error) {
      showAdminMessage(error.message, true);
    }
  });
}

async function signOut(event) {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await api("/api/auth/logout", {});
    dashboardRole = "";
    pendingEmail = "";
    history.replaceState(null, "", "/");
    showPanel("login");
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    button.disabled = false;
  }
}
if (logoutButton) logoutButton.addEventListener("click", signOut);
if (mobileLogoutButton) mobileLogoutButton.addEventListener("click", signOut);

async function loadReports() {
  dashboardError.hidden = true;
  try {
    const report = await api("/api/reports", undefined, "GET");
    reportData = report;
    dashboardTitle.textContent = "Hostel reports";
    dashboardSubtitle.textContent = report.revenueNote;
    dashboardContent.replaceChildren();
    renderReports(report);
  } catch (error) {
    dashboardError.textContent = error.message;
    dashboardError.hidden = false;
  }
}

function renderReports(report) {
  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "button dashboard-back";
  refresh.dataset.action = "refresh-reports";
  refresh.textContent = "Refresh reports";
  dashboardContent.append(refresh);
  const summary = document.createElement("div");
  summary.className = "metric-grid report-summary";
  for (const item of report.statusSummary ?? []) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "metric-card";
    card.dataset.reportFilter = item.status;
    card.setAttribute("aria-label", `Show ${roleName(item.status)} residents`);
    addText(card, "span", "metric-label", roleName(item.status));
    addText(card, "strong", "metric-value", String(item.count));
    summary.append(card);
  }
  dashboardContent.append(summary);

  const residentCard = document.createElement("article");
  residentCard.className = "dashboard-card report-breakdown";
  addText(residentCard, "h3", "dashboard-card-title", reportFilter
    ? `${roleName(reportFilter)} residents`
    : "Resident records");
  const clearFilter = document.createElement("button");
  clearFilter.type = "button";
  clearFilter.className = "admin-action";
  clearFilter.dataset.reportFilter = "";
  clearFilter.textContent = "Show all";
  residentCard.append(clearFilter);
  const residents = reportFilter
    ? report[reportFilter === "checked_in"
      ? "residents"
      : reportFilter === "checked_out"
        ? "checkouts"
        : reportFilter] ?? []
    : [...(report.residents ?? []), ...(report.pending ?? []), ...(report.checkouts ?? [])];
  if (!residents.length) addText(residentCard, "p", "admin-empty", "No records for this status.");
  for (const resident of residents) {
    const row = document.createElement("p");
    row.className = "recent-row";
    row.textContent = `${resident.student_name} · ${resident.student_email} · ${resident.status.replaceAll("_", " ")} · ${resident.room_number ? `Room ${resident.room_number}` : "No room assigned"}`;
    residentCard.append(row);
  }
  dashboardContent.append(residentCard);

  const rooms = document.createElement("article");
  rooms.className = "dashboard-card report-breakdown";
  addText(rooms, "h3", "dashboard-card-title", "Room occupancy");
  for (const room of report.rooms ?? []) {
    const row = document.createElement("div");
    row.className = "room-row";
    addText(row, "strong", "", `Room ${room.room_number}`);
    addText(row, "span", "", `${room.occupied}/${room.capacity} occupied`);
    addText(row, "small", "", `$${(room.monthly_rate_cents / 100).toFixed(2)} / month`);
    rooms.append(row);
  }
  dashboardContent.append(rooms);

  const activity = document.createElement("article");
  activity.className = "dashboard-card report-breakdown";
  addText(activity, "h3", "dashboard-card-title", "Recent check-in activity");
  if (!report.checkinActivity?.length) addText(activity, "p", "admin-empty", "No check-ins recorded in the last 30 days.");
  for (const item of report.checkinActivity ?? []) addText(activity, "p", "", `${item.day}: ${item.count} check-in(s)`);
  dashboardContent.append(activity);
}

if (dashboardContent) {
  dashboardContent.addEventListener("click", async (event) => {
    const reportButton = event.target.closest("[data-report-filter]");
    if (reportButton && reportData) {
      reportFilter = reportButton.dataset.reportFilter;
      dashboardContent.replaceChildren();
      renderReports(reportData);
      return;
    }
    const actionButton = event.target.closest("[data-action='refresh-reports']");
    if (actionButton) {
      reportFilter = "";
      await loadReports();
    }
  });
}

async function loadImplementationReport() {
  implementationReportError.hidden = true;
  implementationReportPage.hidden = false;
  implementationReportContent.replaceChildren();
  addText(implementationReportContent, "p", "implementation-report-paragraph", "Haven Hostel Management provides role-based hostel operations, OTP-protected sign-in, resident registration, room allocation, check-in/out, reporting, encrypted configuration backups, and account recovery.");
  try {
    const [security, users] = await Promise.all([
      api("/api/admin/security", undefined, "GET"),
      api("/api/admin/users", undefined, "GET")
    ]);
    const section = document.createElement("section");
    section.className = "implementation-report-section dashboard-card";
    addText(section, "h3", "dashboard-card-title", "Security and accounts");
    addText(section, "p", "implementation-report-paragraph", `${security.algorithm} password hashing; AUTH_PEPPER configured: ${security.pepperConfigured}. ${security.pepper}`);
    addText(section, "p", "implementation-report-meta", `${users.users.length} active accounts. Sensitive credentials are not displayed.`);
    implementationReportContent.append(section);
  } catch (error) {
    implementationReportError.textContent = error.message;
    implementationReportError.hidden = false;
  }
}

if (window) {
  window.addEventListener("popstate", () => renderCurrentRoute());
}

async function restoreSession() {
  try {
    const response = await fetch("/api/auth/me");
    const result = await response.json();
    if (!response.ok || !result.user) {
      showPanel("login");
      return;
    }
    showSignedIn(result.user, false);
  } catch {
    showPanel("login");
  }
}

restoreSession();