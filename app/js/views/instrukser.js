import {
  listCustomers, createCustomer, deleteCustomer,
  listInstructions, upsertInstruction, deleteInstruction,
} from "../db.js";
import { esc } from "../util/format.js";

export async function render(root, { employee }) {
  const isLeder = employee.role === "leder";
  root.innerHTML = `<div class="empty">Laster instrukser…</div>`;

  const [customers, instructions] = await Promise.all([listCustomers(), listInstructions()]);
  let selectedCustomerId = customers[0]?.id || null;

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Arbeidsinstrukser</h1>
        <p class="lede">Velg kunde for å se instruksene for det oppdraget.</p>
      </div>
    </div>

    ${isLeder ? `
      <div class="panel">
        <div class="row-between">
          <h2>Kunder</h2>
          <button class="btn btn-line btn-sm" id="new-customer-btn" type="button">+ Ny kunde</button>
        </div>
        <div id="customer-form-holder"></div>
      </div>
    ` : ""}

    ${customers.length ? `
      <div class="panel">
        <label>
          <span style="display:block;font:400 10.5px/1 var(--mono);letter-spacing:.17em;text-transform:uppercase;color:var(--dim);margin-bottom:9px;">Kunde</span>
          <select id="customer-select" style="width:100%;max-width:360px;">
            ${customers.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="panel" id="instruction-panel"></div>
    ` : `<div class="empty">Ingen kunder registrert ennå. ${isLeder ? "Legg til den første over." : "Be lederen din legge inn kunder og instrukser."}</div>`}
  `;

  if (customers.length) {
    const select = root.querySelector("#customer-select");
    select.addEventListener("change", () => { selectedCustomerId = select.value; drawInstruction(); });
  }

  function drawInstruction() {
    const panel = root.querySelector("#instruction-panel");
    if (!panel) return;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const instr = instructions.find((i) => i.customerId === selectedCustomerId);

    panel.innerHTML = `
      <h2>${esc(customer?.name || "")}</h2>
      ${customer?.address ? `<p class="card-sub" style="margin-bottom:16px;">${esc(customer.address)}</p>` : ""}
      ${isLeder ? `
        <form class="form" id="instr-form">
          <label>
            <span>Instruks</span>
            <textarea name="content" rows="10" placeholder="Skriv arbeidsinstruksen for denne kunden…">${esc(instr?.content || "")}</textarea>
          </label>
          <div class="form-send">
            <button type="submit" class="btn btn-solid">Lagre instruks</button>
            <button type="button" class="btn btn-line" id="del-customer-btn">Slett kunde</button>
            <p class="form-note" id="instr-note"></p>
          </div>
        </form>
      ` : (instr?.content
        ? `<p style="white-space:pre-wrap;color:var(--bone);">${esc(instr.content)}</p>`
        : `<div class="empty">Ingen instruks lagt inn for denne kunden ennå.</div>`)
      }
    `;

    if (isLeder) {
      panel.querySelector("#instr-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const note = panel.querySelector("#instr-note");
        note.textContent = "Lagrer…";
        const content = new FormData(e.target).get("content");
        const id = await upsertInstruction(instr?.id, { customerId: selectedCustomerId, customerName: customer.name, content });
        if (instr) instr.content = content; else instructions.push({ id, customerId: selectedCustomerId, customerName: customer.name, content });
        note.textContent = "Lagret ✓";
        note.className = "form-note ok";
      });
      panel.querySelector("#del-customer-btn").addEventListener("click", async () => {
        if (!confirm(`Slette kunden "${customer.name}"? Instruksen slettes også.`)) return;
        await deleteCustomer(customer.id);
        if (instr) await deleteInstruction(instr.id);
        location.reload();
      });
    }
  }
  drawInstruction();

  if (isLeder) {
    const holder = root.querySelector("#customer-form-holder");
    root.querySelector("#new-customer-btn").addEventListener("click", () => {
      if (holder.dataset.open === "1") { holder.innerHTML = ""; holder.dataset.open = "0"; return; }
      holder.dataset.open = "1";
      holder.innerHTML = `
        <form class="form" id="customer-form" style="margin-top:14px;">
          <div class="form-grid">
            <label><span>Navn</span><input type="text" name="name" required /></label>
            <label><span>Adresse</span><input type="text" name="address" /></label>
            <label><span>Kontaktperson</span><input type="text" name="contactName" /></label>
            <label><span>Telefon</span><input type="text" name="contactPhone" /></label>
          </div>
          <div class="form-send">
            <button type="submit" class="btn btn-solid btn-sm">Legg til kunde</button>
            <p class="form-note" id="customer-note"></p>
          </div>
        </form>
      `;
      holder.querySelector("#customer-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {
          name: fd.get("name"), address: fd.get("address") || "",
          contactName: fd.get("contactName") || "", contactPhone: fd.get("contactPhone") || "",
        };
        await createCustomer(data);
        location.reload();
      });
    });
  }
}
