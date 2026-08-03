import { listAllReports, getReport } from "../db.js";
import { fmtDate, esc } from "../util/format.js";

export async function render(root, { params }) {
  const [type, id] = params || [];
  if (type && id) return renderDetail(root, type, id);
  return renderList(root);
}

async function renderList(root) {
  root.innerHTML = `<div class="empty">Laster arkiv…</div>`;
  const { deviation, force } = await listAllReports();
  let tab = "avvik";

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Rapportarkiv</h1>
        <p class="lede">Alle avviksrapporter og fysiske maktrapporter. Kun synlig for ledere.</p>
      </div>
    </div>
    <div class="tabs" id="tabs">
      <button data-t="avvik" class="on">Avviksrapporter (${deviation.length})</button>
      <button data-t="makt">Maktrapporter (${force.length})</button>
    </div>
    <div id="list"></div>
  `;

  const tabs = root.querySelector("#tabs");
  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    tab = btn.dataset.t;
    tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
    draw();
  });

  function draw() {
    const listEl = root.querySelector("#list");
    const rows = tab === "avvik" ? deviation : force;
    if (!rows.length) {
      listEl.innerHTML = `<div class="empty">Ingen rapporter registrert.</div>`;
      return;
    }
    listEl.innerHTML = `<div class="card-list">${rows.map((r) => `
      <div class="card clickable" data-id="${r.id}">
        <div>
          <div class="card-title">${tab === "avvik" ? esc(r.customerName || "Ukjent kunde") : esc(r.location || "Ukjent sted")}</div>
          <div class="card-sub">${fmtDate(r.date)} · ${esc(r.time)} · Rapportert av ${esc(r.reportedByName || "—")}</div>
        </div>
      </div>
    `).join("")}</div>`;
    listEl.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", () => { location.hash = `#/arkiv/${tab}/${card.dataset.id}`; });
    });
  }
  draw();
}

async function renderDetail(root, type, id) {
  root.innerHTML = `<div class="empty">Laster…</div>`;
  const r = await getReport(type, id);
  if (!r) { root.innerHTML = `<div class="empty">Fant ikke rapporten.</div>`; return; }

  const rows = type === "avvik" ? [
    ["Kunde", r.customerName || "—"],
    ["Dato", fmtDate(r.date)],
    ["Klokkeslett", r.time],
    ["Rapportert av", r.reportedByName],
    ["Beskrivelse", r.description],
  ] : [
    ["Sted", r.location],
    ["Dato", fmtDate(r.date)],
    ["Klokkeslett", r.time],
    ["Navn på leder", r.leaderName],
    ["Vitne", r.witness || "—"],
    ["Rapportert av", r.reportedByName],
    ["Beskrivelse av situasjonen", r.situationDescription],
    ["Beskrivelse av maktbruk", r.forceDescription],
  ];

  root.innerHTML = `
    <a href="#/arkiv" class="link-btn" style="margin-bottom:18px;display:inline-block;">← Tilbake til arkiv</a>
    <div class="page-head"><div><h1>${type === "avvik" ? "Avviksrapport" : "Fysisk maktrapport"}</h1></div></div>
    <div class="panel">
      <dl class="detail-rows">
        ${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v || "—")}</dd></div>`).join("")}
      </dl>
    </div>
    ${r.images?.length ? `
      <div class="panel">
        <h2>Bilder</h2>
        <div class="thumb-grid" style="margin-top:14px;">
          ${r.images.map((img) => `<a href="${img.url}" target="_blank" rel="noopener" class="thumb"><img src="${img.url}" alt="" /></a>`).join("")}
        </div>
      </div>
    ` : ""}
    ${r.signatureUrl ? `
      <div class="panel">
        <h2>Signatur</h2>
        <img src="${r.signatureUrl}" alt="Signatur" style="max-width:320px;background:#fff;border-radius:2px;margin-top:14px;" />
      </div>
    ` : ""}
  `;
}
