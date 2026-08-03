import { listEmployees, getEmployee, updateEmployeeAdmin, deleteEmployee, createInvite, listInvites, deleteInvite } from "../db.js";
import { initials, esc, fmtDate } from "../util/format.js";

export async function render(root, { employee, params }) {
  const isLeder = employee.role === "leder";
  const uid = params?.[0];
  if (isLeder && uid) return renderDetail(root, uid, employee);
  return renderList(root, employee, isLeder);
}

async function renderList(root, employee, isLeder) {
  root.innerHTML = `<div class="empty">Laster team…</div>`;
  const [employees, invites] = await Promise.all([
    listEmployees(),
    isLeder ? listInvites() : Promise.resolve([]),
  ]);

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Team</h1>
        <p class="lede">${isLeder ? "Trykk på en ansatt for å se uniform og kurs." : "Oversikt over teamet i DeSec."}</p>
      </div>
      ${isLeder ? `<button class="btn btn-solid btn-sm" id="invite-btn" type="button">+ Inviter ansatt</button>` : ""}
    </div>

    ${isLeder ? `<div class="panel" id="invite-panel" hidden></div>` : ""}

    <div class="team-grid" id="team-grid"></div>

    ${isLeder && invites.length ? `
      <h2 style="margin:32px 0 16px;">Ventende invitasjoner</h2>
      <div class="card-list" id="invite-list"></div>
    ` : ""}
  `;

  const grid = root.querySelector("#team-grid");
  grid.innerHTML = employees.map((e) => `
    <div class="person${isLeder ? " clickable" : ""}" data-uid="${e.uid}">
      <div class="person-av">${initials(e.name)}</div>
      <div class="person-name">${esc(e.name)}</div>
      <span class="badge${e.role === "leder" ? " leder" : ""}">${e.role === "leder" ? "Leder" : "Vekter"}</span>
    </div>
  `).join("");

  if (isLeder) {
    grid.querySelectorAll(".person").forEach((card) => {
      card.addEventListener("click", () => { location.hash = `#/team/${card.dataset.uid}`; });
    });

    const invitePanel = root.querySelector("#invite-panel");
    root.querySelector("#invite-btn").addEventListener("click", () => {
      invitePanel.hidden = !invitePanel.hidden;
      if (!invitePanel.hidden) renderInviteForm(invitePanel);
    });

    const inviteList = root.querySelector("#invite-list");
    if (inviteList) {
      inviteList.innerHTML = invites.map((inv) => `
        <div class="card">
          <div>
            <div class="card-title">${esc(inv.name)} · ${esc(inv.id)}</div>
            <div class="card-sub">${inv.role === "leder" ? "Leder" : "Vekter"}${inv.hourlyRateOverride ? ` · ${inv.hourlyRateOverride} kr/t` : ""}</div>
          </div>
          <button class="link-btn del-invite" data-email="${esc(inv.id)}" type="button">Trekk tilbake</button>
        </div>
      `).join("");
      inviteList.querySelectorAll(".del-invite").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await deleteInvite(btn.dataset.email);
          btn.closest(".card").remove();
        });
      });
    }
  }
}

function renderInviteForm(panel) {
  panel.innerHTML = `
    <h2>Inviter ansatt</h2>
    <p class="lede" style="margin-bottom:16px;">Personen registrerer seg selv på innloggingssiden med denne e-postadressen.</p>
    <form class="form" id="invite-form">
      <div class="form-grid">
        <label><span>Navn</span><input type="text" name="name" required /></label>
        <label><span>E-post</span><input type="email" name="email" required /></label>
        <label>
          <span>Rolle</span>
          <select name="role">
            <option value="vekter">Vekter</option>
            <option value="leder">Leder</option>
          </select>
        </label>
        <label><span>Egen timelønn (valgfritt)</span><input type="number" name="rate" min="0" step="1" placeholder="Standard: 248/270 kr" /></label>
      </div>
      <div class="form-send">
        <button type="submit" class="btn btn-solid btn-sm">Send invitasjon</button>
        <p class="form-note" id="invite-note"></p>
      </div>
    </form>
  `;
  panel.querySelector("#invite-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const note = panel.querySelector("#invite-note");
    note.textContent = "Inviterer…";
    try {
      await createInvite({
        email: fd.get("email"), name: fd.get("name"), role: fd.get("role"),
        hourlyRateOverride: fd.get("rate") ? Number(fd.get("rate")) : null,
      });
      note.textContent = "Invitasjon opprettet ✓ Del e-posten med den ansatte.";
      note.className = "form-note ok";
      e.target.reset();
    } catch (err) {
      note.textContent = err.message;
      note.className = "form-note err";
    }
  });
}

async function renderDetail(root, uid, currentEmployee) {
  root.innerHTML = `<div class="empty">Laster…</div>`;
  const person = await getEmployee(uid);
  if (!person) {
    root.innerHTML = `<div class="empty">Fant ikke ansatt.</div>`;
    return;
  }

  root.innerHTML = `
    <a href="#/team" class="link-btn" style="margin-bottom:18px;display:inline-block;">← Tilbake til team</a>
    <div class="page-head">
      <div>
        <h1>${esc(person.name)}</h1>
        <p class="lede">${esc(person.email)}</p>
      </div>
      <span class="badge${person.role === "leder" ? " leder" : ""}">${person.role === "leder" ? "Leder" : "Vekter"}</span>
    </div>

    <div class="panel">
      <h2>Lønn</h2>
      <dl class="detail-rows">
        <div><dt>Timelønn</dt><dd>${person.role === "leder" ? "310 kr/t (fast)" : `${person.hourlyRateOverride || 248} kr/t, ${person.hourlyRateOverride ? person.hourlyRateOverride + (270 - 248) : 270} kr/t etter kl. 21:00`}</dd></div>
        <div><dt>Status</dt><dd>${person.active ? "Aktiv" : "Inaktiv"}</dd></div>
      </dl>
    </div>

    <div class="panel">
      <div class="row-between"><h2>Uniform utdelt</h2></div>
      <div class="pill-list" id="uniform-list" style="margin-bottom:14px;"></div>
      <form id="uniform-form" style="display:flex;gap:10px;flex-wrap:wrap;">
        <input type="text" name="item" placeholder="F.eks. jakke str. L" required style="flex:1;min-width:160px;background:#0a0d12;border:1px solid var(--line-hard);border-radius:2px;padding:10px 12px;color:var(--bone);" />
        <button class="btn btn-line btn-sm" type="submit">Legg til</button>
      </form>
    </div>

    <div class="panel">
      <div class="row-between"><h2>Kurs</h2></div>
      <div class="pill-list" id="courses-list" style="margin-bottom:14px;"></div>
      <form id="course-form" style="display:flex;gap:10px;flex-wrap:wrap;">
        <input type="text" name="name" placeholder="Kursnavn" required style="flex:1;min-width:160px;background:#0a0d12;border:1px solid var(--line-hard);border-radius:2px;padding:10px 12px;color:var(--bone);" />
        <input type="date" name="date" style="background:#0a0d12;border:1px solid var(--line-hard);border-radius:2px;padding:10px 12px;color:var(--bone);" />
        <button class="btn btn-line btn-sm" type="submit">Legg til</button>
      </form>
    </div>

    ${person.uid !== currentEmployee.uid ? `
      <div class="panel">
        <h2>Administrasjon</h2>
        <div class="form-send">
          <button class="btn btn-line btn-sm" id="toggle-active">${person.active ? "Deaktiver ansatt" : "Aktiver ansatt"}</button>
          <button class="btn btn-line btn-sm" id="delete-person" style="color:var(--crit);border-color:var(--crit);">Slett ansatt</button>
        </div>
      </div>
    ` : ""}
  `;

  drawUniform();
  drawCourses();

  root.querySelector("#uniform-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const item = new FormData(e.target).get("item");
    person.uniform = [...(person.uniform || []), { item, date: new Date().toISOString().slice(0, 10) }];
    await updateEmployeeAdmin(uid, { uniform: person.uniform });
    e.target.reset();
    drawUniform();
  });

  root.querySelector("#course-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    person.courses = [...(person.courses || []), { name: fd.get("name"), date: fd.get("date") || null }];
    await updateEmployeeAdmin(uid, { courses: person.courses });
    e.target.reset();
    drawCourses();
  });

  const toggleBtn = root.querySelector("#toggle-active");
  if (toggleBtn) toggleBtn.addEventListener("click", async () => {
    person.active = !person.active;
    await updateEmployeeAdmin(uid, { active: person.active });
    renderDetail(root, uid, currentEmployee);
  });
  const delBtn = root.querySelector("#delete-person");
  if (delBtn) delBtn.addEventListener("click", async () => {
    if (!confirm(`Slette ${person.name} fra teamet? Dette kan ikke angres.`)) return;
    await deleteEmployee(uid);
    location.hash = "#/team";
  });

  function drawUniform() {
    const list = root.querySelector("#uniform-list");
    if (!person.uniform?.length) { list.innerHTML = `<div class="empty">Ingen uniform registrert.</div>`; return; }
    list.innerHTML = person.uniform.map((u, i) => `
      <div class="pill-row">
        <span>${esc(u.item)} <span style="color:var(--dim);">· ${fmtDate(u.date)}</span></span>
        <button class="del" data-i="${i}" type="button">Fjern</button>
      </div>
    `).join("");
    list.querySelectorAll(".del").forEach((btn) => btn.addEventListener("click", async () => {
      person.uniform.splice(Number(btn.dataset.i), 1);
      await updateEmployeeAdmin(uid, { uniform: person.uniform });
      drawUniform();
    }));
  }

  function drawCourses() {
    const list = root.querySelector("#courses-list");
    if (!person.courses?.length) { list.innerHTML = `<div class="empty">Ingen kurs registrert.</div>`; return; }
    list.innerHTML = person.courses.map((c, i) => `
      <div class="pill-row">
        <span>${esc(c.name)} ${c.date ? `<span style="color:var(--dim);">· ${fmtDate(c.date)}</span>` : ""}</span>
        <button class="del" data-i="${i}" type="button">Fjern</button>
      </div>
    `).join("");
    list.querySelectorAll(".del").forEach((btn) => btn.addEventListener("click", async () => {
      person.courses.splice(Number(btn.dataset.i), 1);
      await updateEmployeeAdmin(uid, { courses: person.courses });
      drawCourses();
    }));
  }
}
