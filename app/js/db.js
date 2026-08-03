import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { db, storage } from "./firebase-init.js";
import { isDemo } from "./util/demo.js";
import * as demo from "./demo-store.js";

/* ---------------- Ansatte ---------------- */

export async function getEmployee(uid) {
  if (isDemo()) return demo.getEmployee(uid);
  const snap = await getDoc(doc(db, "employees", uid));
  return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
}

export async function listEmployees() {
  if (isDemo()) return demo.listEmployees();
  const snap = await getDocs(query(collection(db, "employees"), orderBy("name")));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

// Kun leder: full oppdatering (uniform, kurs, lønn, rolle, aktiv)
export async function updateEmployeeAdmin(uid, patch) {
  if (isDemo()) return demo.updateEmployeeAdmin(uid, patch);
  await updateDoc(doc(db, "employees", uid), patch);
}

export async function deleteEmployee(uid) {
  if (isDemo()) return demo.deleteEmployee(uid);
  await deleteDoc(doc(db, "employees", uid));
}

export async function createInvite({ email, name, role, hourlyRateOverride }) {
  if (isDemo()) return demo.createInvite({ email, name, role, hourlyRateOverride });
  const id = email.trim().toLowerCase();
  await setDoc(doc(db, "invites", id), {
    name, role, hourlyRateOverride: hourlyRateOverride ?? null,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function listInvites() {
  if (isDemo()) return demo.listInvites();
  const snap = await getDocs(collection(db, "invites"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteInvite(email) {
  if (isDemo()) return demo.deleteInvite(email);
  await deleteDoc(doc(db, "invites", email.trim().toLowerCase()));
}

export async function getInvite(email) {
  const snap = await getDoc(doc(db, "invites", email.trim().toLowerCase()));
  return snap.exists() ? snap.data() : null;
}

export async function claimInvite(uid, email) {
  const invite = await getInvite(email);
  if (!invite) throw new Error("Fant ingen invitasjon for denne e-posten.");
  await setDoc(doc(db, "employees", uid), {
    name: invite.name,
    email: email.trim().toLowerCase(),
    role: invite.role,
    phone: "",
    hourlyRateOverride: invite.hourlyRateOverride ?? null,
    active: true,
    uniform: [],
    courses: [],
    createdAt: serverTimestamp(),
  });
  await deleteInvite(email);
}

/* ---------------- Kunder ---------------- */

export async function listCustomers() {
  if (isDemo()) return demo.listCustomers();
  const snap = await getDocs(query(collection(db, "customers"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createCustomer(data) {
  if (isDemo()) return demo.createCustomer(data);
  return (await addDoc(collection(db, "customers"), { ...data, createdAt: serverTimestamp() })).id;
}

export async function deleteCustomer(id) {
  if (isDemo()) return demo.deleteCustomer(id);
  await deleteDoc(doc(db, "customers", id));
}

/* ---------------- Instrukser ---------------- */

export async function listInstructions() {
  if (isDemo()) return demo.listInstructions();
  const snap = await getDocs(collection(db, "instructions"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function upsertInstruction(id, data) {
  if (isDemo()) return demo.upsertInstruction(id, data);
  if (id) {
    await updateDoc(doc(db, "instructions", id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  return (await addDoc(collection(db, "instructions"), { ...data, updatedAt: serverTimestamp() })).id;
}

export async function deleteInstruction(id) {
  if (isDemo()) return demo.deleteInstruction(id);
  await deleteDoc(doc(db, "instructions", id));
}

/* ---------------- Vaktplan ---------------- */

export async function listShifts() {
  if (isDemo()) return demo.listShifts();
  const snap = await getDocs(query(collection(db, "shifts"), orderBy("date")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createShift(data) {
  if (isDemo()) return demo.createShift(data);
  return (await addDoc(collection(db, "shifts"), { ...data, createdAt: serverTimestamp() })).id;
}

export async function deleteShift(id) {
  if (isDemo()) return demo.deleteShift(id);
  await deleteDoc(doc(db, "shifts", id));
}

/* ---------------- Rapporter ---------------- */

export async function createDeviationReport(data) {
  if (isDemo()) return demo.createDeviationReport(data);
  return (await addDoc(collection(db, "deviationReports"), { ...data, createdAt: serverTimestamp() })).id;
}

export async function createForceReport(data) {
  if (isDemo()) return demo.createForceReport(data);
  return (await addDoc(collection(db, "forceReports"), { ...data, createdAt: serverTimestamp() })).id;
}

export async function listAllReports() {
  if (isDemo()) return demo.listAllReports();
  const [devSnap, forceSnap] = await Promise.all([
    getDocs(query(collection(db, "deviationReports"), orderBy("createdAt", "desc"))),
    getDocs(query(collection(db, "forceReports"), orderBy("createdAt", "desc"))),
  ]);
  return {
    deviation: devSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    force: forceSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function listMyReports(uid) {
  if (isDemo()) return demo.listMyReports(uid);
  const [devSnap, forceSnap] = await Promise.all([
    getDocs(query(collection(db, "deviationReports"), where("reportedByUid", "==", uid))),
    getDocs(query(collection(db, "forceReports"), where("reportedByUid", "==", uid))),
  ]);
  return {
    deviation: devSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    force: forceSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function getReport(type, id) {
  if (isDemo()) return demo.getReport(type, id);
  const col = type === "avvik" ? "deviationReports" : "forceReports";
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/* ---------------- Storage (bilder + signatur) ---------------- */

export async function uploadImages(folder, id, files) {
  if (isDemo()) return files.map((file) => ({ path: "", url: URL.createObjectURL(file) }));
  const urls = [];
  for (const file of files) {
    const path = `${folder}/${id}/${Date.now()}-${file.name}`;
    const r = ref(storage, path);
    await uploadBytes(r, file);
    urls.push({ path, url: await getDownloadURL(r) });
  }
  return urls;
}

export async function uploadSignature(id, blob) {
  if (isDemo()) return { path: "", url: URL.createObjectURL(blob) };
  const path = `signaturer/${id}-${Date.now()}.png`;
  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType: "image/png" });
  return { path, url: await getDownloadURL(r) };
}

/* ---------------- Lønn ---------------- */

export const SATS = { VANLIG: 248, KVELD: 270, LEDER: 310 };
const DAY_MIN = 1440;
const KVELD_START_MIN = 21 * 60;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Deler en vakt i "normal"- og "kveld"-minutter. Kveldstillegg gjelder fra kl. 21:00
// og ut resten av vakten (ingen tilbakestilling midt i en sammenhengende vakt).
export function splitShiftMinutes(start, end) {
  let startMin = toMinutes(start);
  let endMin = toMinutes(end);
  if (endMin <= startMin) endMin += DAY_MIN; // vakt over midnatt
  const startClock = startMin % DAY_MIN;
  let boundary = startClock >= KVELD_START_MIN
    ? startMin
    : startMin - startClock + KVELD_START_MIN;
  boundary = Math.min(Math.max(boundary, startMin), endMin);
  return { normalMin: boundary - startMin, kveldMin: endMin - boundary };
}

export function calcShiftPay(shift, employee) {
  const { normalMin, kveldMin } = splitShiftMinutes(shift.start, shift.end);
  const totalHours = (normalMin + kveldMin) / 60;

  if (employee.role === "leder") {
    return { totalHours, normalHours: totalHours, kveldHours: 0, pay: totalHours * SATS.LEDER };
  }
  const rateNormal = employee.hourlyRateOverride || SATS.VANLIG;
  const rateKveld = employee.hourlyRateOverride
    ? employee.hourlyRateOverride + (SATS.KVELD - SATS.VANLIG)
    : SATS.KVELD;
  const normalHours = normalMin / 60;
  const kveldHours = kveldMin / 60;
  return {
    totalHours, normalHours, kveldHours,
    pay: normalHours * rateNormal + kveldHours * rateKveld,
  };
}
