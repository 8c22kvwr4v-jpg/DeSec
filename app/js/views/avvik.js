import { listCustomers, createDeviationReport, uploadImages, uploadSignature, listMyReports } from "../db.js";
import { createSignaturePad } from "../util/signature.js";
import { createImagePicker } from "../util/uploads.js";
import { fmtDate, todayISO, nowHHMM, esc } from "../util/format.js";

export async function render(root, { employee }) {
  root.innerHTML = `<div class="empty">Laster…</div>`;
  const [customers, mine] = await Promise.all([listCustomers(), listMyReports(employee.uid)]);

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Avviksrapport</h1>
        <p class="lede">Fyll ut ved avvik hos kunde. Rapporten lagres og kan ses av deg og daglig leder.</p>
      </div>
    </div>

    <div class="panel">
      <form class="form" id="avvik-form">
        <div class="form-grid">
          <label>
            <span>Kunde</span>
            <select name="customerId" ${customers.length ? "required" : "disabled"}>
              ${customers.length
                ? customers.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")
                : `<option>Ingen kunder registrert</option>`}
            </select>
          </label>
          <label><span>Dato</span><input type="date" name="date" required value="${todayISO()}" /></label>
          <label><span>Klokkeslett</span><input type="time" name="time" required value="${nowHHMM()}" /></label>
        </div>
        <label>
          <span>Beskrivelse</span>
          <textarea name="description" rows="6" required placeholder="Hva skjedde? Hvor? Hvem var involvert?"></textarea>
        </label>
        <label>
          <span>Bilder</span>
          <div id="image-picker"></div>
        </label>
        <label>
          <span>Signatur</span>
          <div class="sigpad-wrap">
            <canvas class="sigpad" id="sigpad"></canvas>
            <div class="sigpad-actions">
              <button type="button" class="btn btn-line btn-sm" id="sig-clear">Nullstill signatur</button>
            </div>
          </div>
        </label>
        <div class="form-send">
          <button type="submit" class="btn btn-solid">Send inn avviksrapport</button>
          <p class="form-note" id="avvik-note"></p>
        </div>
      </form>
    </div>

    <h2 style="margin-bottom:16px;">Mine avviksrapporter</h2>
    <div class="card-list" id="my-reports"></div>
  `;

  const picker = createImagePicker(root.querySelector("#image-picker"));
  const pad = createSignaturePad(root.querySelector("#sigpad"));
  root.querySelector("#sig-clear").addEventListener("click", () => pad.clear());

  const listEl = root.querySelector("#my-reports");
  function drawList() {
    if (!mine.deviation.length) {
      listEl.innerHTML = `<div class="empty">Du har ikke sendt inn noen avviksrapporter ennå.</div>`;
      return;
    }
    listEl.innerHTML = mine.deviation
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .map((r) => `
        <div class="card">
          <div>
            <div class="card-title">${esc(r.customerName || "Ukjent kunde")}</div>
            <div class="card-sub">${fmtDate(r.date)} · ${esc(r.time)}</div>
          </div>
        </div>
      `).join("");
  }
  drawList();

  root.querySelector("#avvik-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = root.querySelector("#avvik-note");
    if (pad.isEmpty()) {
      note.textContent = "Signatur mangler.";
      note.className = "form-note err";
      return;
    }
    const fd = new FormData(e.target);
    const customer = customers.find((c) => c.id === fd.get("customerId"));
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    note.textContent = "Sender inn…";
    note.className = "form-note";
    try {
      const reportId = crypto.randomUUID();
      const files = picker.getFiles();
      const [images, sigBlob] = await Promise.all([
        files.length ? uploadImages("avvik", reportId, files) : Promise.resolve([]),
        pad.toBlob(),
      ]);
      const signature = await uploadSignature(reportId, sigBlob);

      const data = {
        customerId: fd.get("customerId") || null,
        customerName: customer?.name || null,
        date: fd.get("date"),
        time: fd.get("time"),
        description: fd.get("description"),
        images,
        signatureUrl: signature.url,
        signaturePath: signature.path,
        reportedByUid: employee.uid,
        reportedByName: employee.name,
      };
      const id = await createDeviationReport(data);
      mine.deviation.push({ id, ...data });
      drawList();
      e.target.reset();
      picker.clear();
      pad.clear();
      note.textContent = "Avviksrapport sendt inn ✓";
      note.className = "form-note ok";
    } catch (err) {
      console.error(err);
      note.textContent = "Klarte ikke å sende inn rapporten. Prøv igjen.";
      note.className = "form-note err";
    } finally {
      submitBtn.disabled = false;
    }
  });
}
