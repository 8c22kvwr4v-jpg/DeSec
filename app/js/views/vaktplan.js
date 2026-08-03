import { listShifts, listEmployees, listCustomers, createShift, deleteShift } from "../db.js";
import { fmtDate, todayISO, esc } from "../util/format.js";

export async function render(root, { employee }) {
  const isLeder = employee.role === "leder";
  root.innerHTML = `<div class="empty">Laster vaktplan…</div>`;

  const [shifts, employees, customers] = await Promise.all([
    listShifts(), listEmployees(), listCustomers(),
  ]);
  const empByUid = Object.fromEntries(employees.map((e) => [e.uid, e]));

  let filter = "kommende";
  let onlyMine = !isLeder;

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Vaktplan</h1>
        <p class="lede">Oversikt over vakter${isLeder ? "" : " for deg og resten av teamet"}.</p>
      </div>
      ${isLeder ? `<button class="btn btn-solid btn-sm" id="new-shift-btn" type="button">+ Ny vakt</button>` : ""}
    </div>

    ${isLeder ? `<div class="panel" id="shift-form-panel" hidden></div>` : ""}

    <div class="tabs" id="tabs">
      <button data-f="kommende" class="on">Kommende</button>
      <button data-f="alle">Alle</button>
    </div>
    <label class="checkline" style="margin-bottom:16px;">
      <input type="checkbox" id="only-mine" ${onlyMine ? "checked" : ""} />
      <span>Vis bare mine vakter</span>
    </label>

    <div id="shift-list"></div>
  `;

  const listEl = root.querySelector("#shift-list");
  const tabs = root.querySelector("#tabs");

  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    filter = btn.dataset.f;
    tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
    draw();
  });
  root.querySelector("#only-mine").addEventListener("change", (e) => {
    onlyMine = e.target.checked;
    draw();
  });

  if (isLeder) {
    const formPanel = root.querySelector("#shift-form-panel");
    root.querySelector("#new-shift-btn").addEventListener("click", () => {
      formPanel.hidden = !formPanel.hidden;
      if (!formPanel.hidden) renderShiftForm(formPanel, { employees, customers }, async (data) => {
        const id = await createShift(data);
        formPanel.hidden = true;
        shifts.push({ id, ...data });
        draw();
      });
    });
  }

  function draw() {
    const today = todayISO();
    let rows = shifts.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    if (filter === "kommende") rows = rows.filter((s) => s.date >= today);
    if (onlyMine) rows = rows.filter((s) => s.employeeUid === employee.uid);

    if (!rows.length) {
      listEl.innerHTML = `<div class="empty">Ingen vakter å vise.</div>`;
      return;
    }

    listEl.innerHTML = `
      <table class="tbl">
        <thead><tr>
          <th>Dato</th><th>Tid</th><th>Ansatt</th><th>Kunde</th><th>Notat</th>${isLeder ? "<th></th>" : ""}
        </tr></thead>
        <tbody>
          ${rows.map((s) => `
            <tr>
              <td>${fmtDate(s.date)}</td>
              <td>${esc(s.start)}–${esc(s.end)}</td>
              <td>${esc(s.employeeName || empByUid[s.employeeUid]?.name || "—")}</td>
              <td>${esc(s.customerName || "—")}</td>
              <td>${esc(s.notes || "")}</td>
              ${isLeder ? `<td><button class="link-btn del-shift" data-id="${s.id}" type="button">Slett</button></td>` : ""}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    listEl.querySelectorAll(".del-shift").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Slette denne vakten?")) return;
        await deleteShift(btn.dataset.id);
        const idx = shifts.findIndex((s) => s.id === btn.dataset.id);
        if (idx >= 0) shifts.splice(idx, 1);
        draw();
      });
    });
  }

  draw();
}

function renderShiftForm(panel, { employees, customers }, onSubmit) {
  panel.innerHTML = `
    <h2>Ny vakt</h2>
    <form class="form" id="shift-form">
      <div class="form-grid">
        <label>
          <span>Ansatt</span>
          <select name="employeeUid" required>
            ${employees.map((e) => `<option value="${e.uid}">${esc(e.name)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Kunde</span>
          <select name="customerId">
            <option value="">— Ingen —</option>
            ${customers.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Dato</span>
          <input type="date" name="date" required value="${todayISO()}" />
        </label>
        <label>
          <span>Fra kl.</span>
          <input type="time" name="start" required value="08:00" />
        </label>
        <label>
          <span>Til kl.</span>
          <input type="time" name="end" required value="16:00" />
        </label>
      </div>
      <label>
        <span>Notat</span>
        <input type="text" name="notes" placeholder="Valgfritt" />
      </label>
      <div class="form-send">
        <button type="submit" class="btn btn-solid">Lagre vakt</button>
        <p class="form-note" id="shift-note"></p>
      </div>
    </form>
  `;

  panel.querySelector("#shift-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const emp = employees.find((x) => x.uid === fd.get("employeeUid"));
    const cust = customers.find((x) => x.id === fd.get("customerId"));
    const note = panel.querySelector("#shift-note");
    note.textContent = "Lagrer…";
    try {
      await onSubmit({
        employeeUid: fd.get("employeeUid"),
        employeeName: emp?.name || "",
        customerId: fd.get("customerId") || null,
        customerName: cust?.name || null,
        date: fd.get("date"),
        start: fd.get("start"),
        end: fd.get("end"),
        notes: fd.get("notes") || "",
      });
    } catch (err) {
      note.textContent = err.message;
      note.className = "form-note err";
    }
  });
}
