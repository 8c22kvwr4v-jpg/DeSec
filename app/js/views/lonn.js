import { listShifts, calcShiftPay } from "../db.js";
import { fmtDate, fmtKr, fmtHours, esc } from "../util/format.js";

export async function render(root, { employee }) {
  root.innerHTML = `<div class="empty">Laster lønn…</div>`;
  const allShifts = await listShifts();
  const myShifts = allShifts.filter((s) => s.employeeUid === employee.uid);

  const months = [...new Set(myShifts.map((s) => s.date.slice(0, 7)))].sort().reverse();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (!months.includes(currentMonth)) months.unshift(currentMonth);
  let selectedMonth = currentMonth;

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Lønn</h1>
        <p class="lede">${employee.role === "leder" ? "Fast sats 310 kr/t." : "248 kr/t, 270 kr/t etter kl. 21:00."}</p>
      </div>
      <label>
        <select id="month-select" style="min-width:160px;">
          ${months.map((m) => `<option value="${m}" ${m === selectedMonth ? "selected" : ""}>${monthLabel(m)}</option>`).join("")}
        </select>
      </label>
    </div>
    <div id="lonn-content"></div>
  `;

  root.querySelector("#month-select").addEventListener("change", (e) => {
    selectedMonth = e.target.value;
    draw();
  });

  function draw() {
    const shiftsInMonth = myShifts
      .filter((s) => s.date.slice(0, 7) === selectedMonth)
      .sort((a, b) => a.date.localeCompare(b.date));

    const rows = shiftsInMonth.map((s) => ({ shift: s, calc: calcShiftPay(s, employee) }));
    const totalPay = rows.reduce((sum, r) => sum + r.calc.pay, 0);
    const totalHours = rows.reduce((sum, r) => sum + r.calc.totalHours, 0);
    const totalKveld = rows.reduce((sum, r) => sum + r.calc.kveldHours, 0);

    const content = root.querySelector("#lonn-content");
    content.innerHTML = `
      <div class="stat-row">
        <div class="stat-tile hi"><dt>Beregnet lønn</dt><dd>${fmtKr(totalPay)}</dd></div>
        <div class="stat-tile"><dt>Totalt timer</dt><dd>${fmtHours(totalHours)}</dd></div>
        <div class="stat-tile"><dt>Herav kveld/natt</dt><dd>${fmtHours(totalKveld)}</dd></div>
        <div class="stat-tile"><dt>Antall vakter</dt><dd>${shiftsInMonth.length}</dd></div>
      </div>
      ${rows.length ? `
        <table class="tbl">
          <thead><tr><th>Dato</th><th>Tid</th><th>Kunde</th><th>Timer</th><th>Lønn</th></tr></thead>
          <tbody>
            ${rows.map(({ shift, calc }) => `
              <tr>
                <td>${fmtDate(shift.date)}</td>
                <td>${esc(shift.start)}–${esc(shift.end)}</td>
                <td>${esc(shift.customerName || "—")}</td>
                <td>${fmtHours(calc.totalHours)}${calc.kveldHours > 0 ? ` <span style="color:var(--dim);">(${fmtHours(calc.kveldHours)} kveld)</span>` : ""}</td>
                <td>${fmtKr(calc.pay)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<div class="empty">Ingen vakter registrert denne måneden.</div>`}
      <p class="card-sub" style="margin-top:16px;">Beregningen er veiledende og baserer seg på vaktene som er lagt inn i vaktplanen.</p>
    `;
  }
  draw();
}

function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  const names = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
  return `${names[m - 1]} ${y}`;
}
