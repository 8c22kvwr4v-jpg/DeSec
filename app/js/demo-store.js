// In-memory eksempeldata for demomodus — ingen Firebase, ingenting lagres mellom økter.

function genId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export const DEMO_UID = "demo-leder";

const employees = [
  {
    uid: "demo-leder", name: "Øystein Johannessen", email: "oystein@desec.no",
    role: "leder", phone: "984 52 155", hourlyRateOverride: null, active: true,
    uniform: [{ item: "Vinterjakke str. L", date: "2026-01-10" }, { item: "Sikkerhetssko str. 44", date: "2026-01-10" }],
    courses: [{ name: "Vekterkurs trinn 1–3", date: "2019-04-12" }, { name: "Førstehjelp", date: "2026-02-01" }],
  },
  {
    uid: "demo-vekter-1", name: "Kari Nordmann", email: "kari@desec.no",
    role: "vekter", phone: "12 34 56 78", hourlyRateOverride: null, active: true,
    uniform: [{ item: "Vinterjakke str. M", date: "2026-03-02" }],
    courses: [{ name: "Vekterkurs trinn 1", date: "2025-11-14" }],
  },
  {
    uid: "demo-vekter-2", name: "Ahmed Hassan", email: "ahmed@desec.no",
    role: "vekter", phone: "45 67 89 01", hourlyRateOverride: 255, active: true,
    uniform: [{ item: "Sommerjakke str. L", date: "2026-05-20" }],
    courses: [{ name: "Vekterkurs trinn 1", date: "2026-01-20" }, { name: "Konflikthåndtering", date: "2026-04-03" }],
  },
];

const invites = [];

const customers = [
  { id: "c1", name: "Bergen Storsenter", address: "Strandgaten 1, Bergen", contactName: "Per Hansen", contactPhone: "911 22 333" },
  { id: "c2", name: "Byggmester AS", address: "Industriveien 5, Fyllingsdalen", contactName: "Lise Berg", contactPhone: "922 33 444" },
];

const instructions = [
  {
    id: "i1", customerId: "c1", customerName: "Bergen Storsenter",
    content: "Rondering hver hele time i åpningstiden. Sjekk alle brannutganger og nødlys ved stenging kl. 21:00. Alarmkode fås hos senterleder. Kontaktperson ved avvik: Per Hansen, 911 22 333.",
  },
];

const shifts = [
  { id: "s1", employeeUid: "demo-leder", employeeName: "Øystein Johannessen", customerId: "c1", customerName: "Bergen Storsenter", date: "2026-08-03", start: "08:00", end: "16:00", notes: "" },
  { id: "s2", employeeUid: "demo-vekter-1", employeeName: "Kari Nordmann", customerId: "c1", customerName: "Bergen Storsenter", date: "2026-08-03", start: "16:00", end: "23:00", notes: "Stenging" },
  { id: "s3", employeeUid: "demo-vekter-2", employeeName: "Ahmed Hassan", customerId: "c2", customerName: "Byggmester AS", date: "2026-08-04", start: "22:00", end: "06:00", notes: "Nattevakt byggeplass" },
  { id: "s4", employeeUid: "demo-vekter-1", employeeName: "Kari Nordmann", customerId: "c1", customerName: "Bergen Storsenter", date: "2026-08-05", start: "14:00", end: "22:00", notes: "" },
  { id: "s5", employeeUid: "demo-leder", employeeName: "Øystein Johannessen", customerId: "c2", customerName: "Byggmester AS", date: "2026-07-28", start: "09:00", end: "15:00", notes: "Befaring" },
];

const deviationReports = [
  {
    id: "avvik-1", customerId: "c1", customerName: "Bergen Storsenter", date: "2026-07-30", time: "19:45",
    description: "Røykvarsler i personalinngang utløste falsk alarm. Brannvesenet varslet og avmeldt etter kontroll — ingen brann. Senterleder informert.",
    images: [], signatureUrl: "", reportedByUid: "demo-leder", reportedByName: "Øystein Johannessen",
  },
];

const forceReports = [
  {
    id: "makt-1", date: "2026-07-22", time: "23:10", location: "Bergen Storsenter, hovedinngang",
    leaderName: "Øystein Johannessen", witness: "Kari Nordmann",
    situationDescription: "En beruset person nektet å forlate senteret etter stengetid og opptrådte truende mot ansatte.",
    forceDescription: "Personen ble holdt i armlås i ca. 30 sekunder og fulgt ut hovedinngangen. Politiet ble varslet i etterkant.",
    images: [], signatureUrl: "", reportedByUid: "demo-leder", reportedByName: "Øystein Johannessen",
  },
];

/* ---- Ansatte ---- */
export function getEmployee(uid) {
  const e = employees.find((x) => x.uid === uid);
  return e ? { ...e } : null;
}
export function listEmployees() {
  return employees.map((e) => ({ ...e })).sort((a, b) => a.name.localeCompare(b.name));
}
export function updateEmployeeAdmin(uid, patch) {
  const e = employees.find((x) => x.uid === uid);
  if (e) Object.assign(e, patch);
}
export function deleteEmployee(uid) {
  const i = employees.findIndex((x) => x.uid === uid);
  if (i >= 0) employees.splice(i, 1);
}
export function createInvite({ email, name, role, hourlyRateOverride }) {
  const id = email.trim().toLowerCase();
  invites.push({ id, name, role, hourlyRateOverride: hourlyRateOverride ?? null });
  return id;
}
export function listInvites() {
  return invites.map((i) => ({ ...i }));
}
export function deleteInvite(email) {
  const i = invites.findIndex((x) => x.id === email.trim().toLowerCase());
  if (i >= 0) invites.splice(i, 1);
}

/* ---- Kunder ---- */
export function listCustomers() {
  return customers.map((c) => ({ ...c })).sort((a, b) => a.name.localeCompare(b.name));
}
export function createCustomer(data) {
  const id = genId("cust");
  customers.push({ id, ...data });
  return id;
}
export function deleteCustomer(id) {
  const i = customers.findIndex((c) => c.id === id);
  if (i >= 0) customers.splice(i, 1);
}

/* ---- Instrukser ---- */
export function listInstructions() {
  return instructions.map((i) => ({ ...i }));
}
export function upsertInstruction(id, data) {
  if (id) {
    const instr = instructions.find((i) => i.id === id);
    if (instr) Object.assign(instr, data);
    return id;
  }
  const newId = genId("instr");
  instructions.push({ id: newId, ...data });
  return newId;
}
export function deleteInstruction(id) {
  const i = instructions.findIndex((x) => x.id === id);
  if (i >= 0) instructions.splice(i, 1);
}

/* ---- Vaktplan ---- */
export function listShifts() {
  return shifts.map((s) => ({ ...s })).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
export function createShift(data) {
  const id = genId("shift");
  shifts.push({ id, ...data });
  return id;
}
export function deleteShift(id) {
  const i = shifts.findIndex((s) => s.id === id);
  if (i >= 0) shifts.splice(i, 1);
}

/* ---- Rapporter ---- */
export function createDeviationReport(data) {
  const id = genId("avvik");
  deviationReports.push({ id, ...data });
  return id;
}
export function createForceReport(data) {
  const id = genId("makt");
  forceReports.push({ id, ...data });
  return id;
}
export function listAllReports() {
  return {
    deviation: deviationReports.map((r) => ({ ...r })).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    force: forceReports.map((r) => ({ ...r })).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
  };
}
export function listMyReports(uid) {
  return {
    deviation: deviationReports.filter((r) => r.reportedByUid === uid).map((r) => ({ ...r })),
    force: forceReports.filter((r) => r.reportedByUid === uid).map((r) => ({ ...r })),
  };
}
export function getReport(type, id) {
  const col = type === "avvik" ? deviationReports : forceReports;
  const r = col.find((x) => x.id === id);
  return r ? { ...r } : null;
}
