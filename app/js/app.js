import { isConfigured } from "./firebase-init.js";
import { login, logout, registerFromInvite, watchSession } from "./auth.js";
import { isDemo, enableDemo, disableDemo } from "./util/demo.js";
import { getEmployee } from "./db.js";
import { DEMO_UID } from "./demo-store.js";

const $ = (sel, root = document) => root.querySelector(sel);

const el = {
  loading: $("#loading"),
  unconfigured: $("#unconfigured"),
  loginScreen: $("#login-screen"),
  appScreen: $("#app-screen"),
  loginForm: $("#login-form"),
  registerForm: $("#register-form"),
  loginNote: $("#login-note"),
  registerNote: $("#register-note"),
  showRegister: $("#show-register"),
  showLogin: $("#show-login"),
  demoBtnUnconfigured: $("#demo-btn-unconfigured"),
  demoBtnLogin: $("#demo-btn-login"),
  demoBadge: $("#demo-badge"),
  userName: $("#user-name"),
  userRole: $("#user-role"),
  logoutBtn: $("#logout-btn"),
  nav: $("#app-nav"),
  viewRoot: $("#view-root"),
  appBurger: $("#app-burger"),
  appBody: $(".app-body"),
};

export const state = { employee: null, user: null };

wireAppChrome();
el.demoBtnUnconfigured.addEventListener("click", () => { enableDemo(); enterDemo(); });
el.demoBtnLogin.addEventListener("click", () => { enableDemo(); enterDemo(); });

if (isDemo()) {
  enterDemo();
} else if (!isConfigured) {
  el.loading.hidden = true;
  el.unconfigured.hidden = false;
} else {
  boot();
}

// Ting som er trygt å koble til uansett om Firebase er satt opp eller ikke.
function wireAppChrome() {
  el.appBurger.addEventListener("click", () => {
    const open = el.appBody.classList.toggle("nav-open");
    el.appBurger.setAttribute("aria-expanded", String(open));
  });
  el.nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) el.appBody.classList.remove("nav-open");
  });
  el.logoutBtn.addEventListener("click", () => {
    if (isDemo()) {
      disableDemo();
      location.reload();
      return;
    }
    logout();
  });
}

// Viser appen med eksempeldata, uten at Firebase er satt opp eller at noen har logget inn.
async function enterDemo() {
  el.loading.hidden = true;
  el.unconfigured.hidden = true;
  el.loginScreen.hidden = true;

  const employee = await getEmployee(DEMO_UID);
  state.employee = employee;
  state.user = { uid: DEMO_UID };

  el.demoBadge.hidden = false;
  applyEmployeeChrome(employee);
  el.appScreen.hidden = false;

  window.addEventListener("hashchange", router);
  router();
}

function applyEmployeeChrome(employee) {
  el.userName.textContent = employee.name;
  el.userRole.textContent = employee.role === "leder" ? "Leder" : "Vekter";
  el.userRole.classList.toggle("leder", employee.role === "leder");
  document.querySelectorAll("[data-leder-only]").forEach((n) => {
    n.style.display = employee.role === "leder" ? "" : "none";
  });
}

function boot() {
  el.showRegister.addEventListener("click", () => {
    el.loginForm.hidden = true;
    el.showRegister.hidden = true;
    el.registerForm.hidden = false;
    el.showLogin.hidden = false;
  });
  el.showLogin.addEventListener("click", () => {
    el.registerForm.hidden = true;
    el.showLogin.hidden = true;
    el.loginForm.hidden = false;
    el.showRegister.hidden = false;
  });

  el.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(el.loginForm);
    el.loginNote.textContent = "Logger inn…";
    el.loginNote.className = "form-note";
    try {
      await login(fd.get("email"), fd.get("password"));
      el.loginNote.textContent = "";
    } catch (err) {
      el.loginNote.textContent = friendlyAuthError(err);
      el.loginNote.className = "form-note err";
    }
  });

  el.registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(el.registerForm);
    el.registerNote.textContent = "Registrerer…";
    el.registerNote.className = "form-note";
    try {
      await registerFromInvite(fd.get("email"), fd.get("password"));
      el.registerNote.textContent = "";
    } catch (err) {
      el.registerNote.textContent = friendlyAuthError(err);
      el.registerNote.className = "form-note err";
    }
  });

  watchSession(async (employee, user) => {
    state.employee = employee;
    state.user = user;
    el.loading.hidden = true;

    if (!user) {
      el.appScreen.hidden = true;
      el.loginScreen.hidden = false;
      return;
    }
    if (!employee) {
      // Innlogget i Firebase Auth, men ingen ansattprofil (uvanlig tilstand)
      el.appScreen.hidden = true;
      el.loginScreen.hidden = false;
      el.loginNote.textContent = "Fant ingen ansattprofil for denne kontoen. Kontakt daglig leder.";
      el.loginNote.className = "form-note err";
      await logout();
      return;
    }

    el.loginScreen.hidden = true;
    el.appScreen.hidden = false;
    applyEmployeeChrome(employee);

    router();
  });

  window.addEventListener("hashchange", router);
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Feil e-post eller passord.";
  }
  if (code.includes("email-already-in-use")) return "Denne e-posten er allerede registrert. Logg inn i stedet.";
  if (code.includes("weak-password")) return "Passordet må ha minst 6 tegn.";
  return err.message || "Noe gikk galt. Prøv igjen.";
}

const routes = {
  vaktplan: () => import("./views/vaktplan.js"),
  instrukser: () => import("./views/instrukser.js"),
  avvik: () => import("./views/avvik.js"),
  makt: () => import("./views/makt.js"),
  team: () => import("./views/team.js"),
  arkiv: () => import("./views/arkiv.js"),
  lonn: () => import("./views/lonn.js"),
};

async function router() {
  if (!state.employee) return;
  const hash = location.hash.replace(/^#\/?/, "");
  const [base, ...rest] = hash.split("/").filter(Boolean);
  const route = base || "vaktplan";

  if (route === "arkiv" && state.employee.role !== "leder") {
    location.hash = "#/vaktplan";
    return;
  }
  if (route === "team" && rest[0] && state.employee.role !== "leder") {
    location.hash = "#/team";
    return;
  }

  document.querySelectorAll(".app-nav a").forEach((a) => {
    a.classList.toggle("on", a.dataset.route === route);
  });

  const loader = routes[route] || routes.vaktplan;
  el.viewRoot.innerHTML = "";
  try {
    const mod = await loader();
    await mod.render(el.viewRoot, { employee: state.employee, user: state.user, params: rest });
  } catch (err) {
    console.error(err);
    el.viewRoot.innerHTML = `<div class="empty">Klarte ikke å laste siden. Prøv å laste inn på nytt.</div>`;
  }
}
