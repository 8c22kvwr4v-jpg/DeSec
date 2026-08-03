import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { getEmployee, claimInvite, getInvite } from "./db.js";

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

// Registrerer en ny bruker og løser inn invitasjonen som gir navn/rolle/lønn.
export async function registerFromInvite(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const invite = await getInvite(normalizedEmail);
  if (!invite) {
    throw new Error("Fant ingen invitasjon for denne e-postadressen. Be lederen din invitere deg først.");
  }
  const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  try {
    await claimInvite(cred.user.uid, normalizedEmail);
  } catch (err) {
    await cred.user.delete().catch(() => {});
    throw err;
  }
  return cred.user;
}

// Kaller callback(employeeOrNull, firebaseUserOrNull) ved hver endring i innloggingsstatus.
export function watchSession(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null, null);
    try {
      const employee = await getEmployee(user.uid);
      callback(employee, user);
    } catch (err) {
      console.error("Kunne ikke hente ansattprofil", err);
      callback(null, user);
    }
  });
}
