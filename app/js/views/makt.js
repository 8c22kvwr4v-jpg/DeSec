import { createForceReport, uploadImages, uploadSignature, listMyReports } from "../db.js";
import { createSignaturePad } from "../util/signature.js";
import { createImagePicker } from "../util/uploads.js";
import { fmtDate, todayISO, nowHHMM, esc } from "../util/format.js";

export async function render(root, { employee }) {
  root.innerHTML = `<div class="empty">Laster…</div>`;
  const mine = await listMyReports(employee.uid);

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Fysisk maktrapport</h1>
        <p class="lede">Skal alltid fylles ut når fysisk makt er brukt i tjeneste.</p>
      </div>
    </div>

    <div class="panel">
      <form class="form" id="makt-form">
        <div class="form-grid">
          <label><span>Dato</span><input type="date" name="date" required value="${todayISO()}" /></label>
          <label><span>Klokkeslett</span><input type="time" name="time" required value="${nowHHMM()}" /></label>
          <label><span>Sted</span><input type="text" name="location" required placeholder="Adresse / lokasjon" /></label>
          <label><span>Navn på leder</span><input type="text" name="leaderName" required placeholder="Navn på ansvarlig leder" /></label>
          <label><span>Vitne</span><input type="text" name="witness" placeholder="Navn på eventuelt vitne" /></label>
        </div>
        <label>
          <span>Beskrivelse av situasjonen</span>
          <textarea name="situationDescription" rows="5" required placeholder="Hva skjedde forut for maktbruken?"></textarea>
        </label>
        <label>
          <span>Beskrivelse av maktbruk</span>
          <textarea name="forceDescription" rows="5" required placeholder="Hvilken makt ble brukt, hvordan og hvorfor?"></textarea>
        </label>
        <label>
          <span>Eventuelle bilder</span>
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
          <button type="submit" class="btn btn-solid">Send inn maktrapport</button>
          <p class="form-note" id="makt-note"></p>
        </div>
      </form>
    </div>

    <h2 style="margin-bottom:16px;">Mine maktrapporter</h2>
    <div class="card-list" id="my-reports"></div>
  `;

  const picker = createImagePicker(root.querySelector("#image-picker"));
  const pad = createSignaturePad(root.querySelector("#sigpad"));
  root.querySelector("#sig-clear").addEventListener("click", () => pad.clear());

  const listEl = root.querySelector("#my-reports");
  function drawList() {
    if (!mine.force.length) {
      listEl.innerHTML = `<div class="empty">Du har ikke sendt inn noen maktrapporter ennå.</div>`;
      return;
    }
    listEl.innerHTML = mine.force
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .map((r) => `
        <div class="card">
          <div>
            <div class="card-title">${esc(r.location || "Ukjent sted")}</div>
            <div class="card-sub">${fmtDate(r.date)} · ${esc(r.time)}</div>
          </div>
        </div>
      `).join("");
  }
  drawList();

  root.querySelector("#makt-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = root.querySelector("#makt-note");
    if (pad.isEmpty()) {
      note.textContent = "Signatur mangler.";
      note.className = "form-note err";
      return;
    }
    const fd = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    note.textContent = "Sender inn…";
    note.className = "form-note";
    try {
      const reportId = crypto.randomUUID();
      const files = picker.getFiles();
      const [images, sigBlob] = await Promise.all([
        files.length ? uploadImages("makt", reportId, files) : Promise.resolve([]),
        pad.toBlob(),
      ]);
      const signature = await uploadSignature(reportId, sigBlob);

      const data = {
        date: fd.get("date"),
        time: fd.get("time"),
        location: fd.get("location"),
        leaderName: fd.get("leaderName"),
        witness: fd.get("witness") || "",
        situationDescription: fd.get("situationDescription"),
        forceDescription: fd.get("forceDescription"),
        images,
        signatureUrl: signature.url,
        signaturePath: signature.path,
        reportedByUid: employee.uid,
        reportedByName: employee.name,
      };
      const id = await createForceReport(data);
      mine.force.push({ id, ...data });
      drawList();
      e.target.reset();
      picker.clear();
      pad.clear();
      note.textContent = "Maktrapport sendt inn ✓";
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
