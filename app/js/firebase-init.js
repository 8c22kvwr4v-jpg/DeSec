import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Fyll inn disse verdiene fra Firebase-konsollet:
// Prosjektinnstillinger (tannhjul) → Dine apper → Web-app → SDK-oppsett og konfigurasjon
// Se app/SETUP.md for full oppskrift.
const firebaseConfig = {
  apiKey: "FYLL_INN",
  authDomain: "FYLL_INN",
  projectId: "FYLL_INN",
  storageBucket: "FYLL_INN",
  messagingSenderId: "FYLL_INN",
  appId: "FYLL_INN",
};

export const isConfigured = firebaseConfig.apiKey !== "FYLL_INN" && !!firebaseConfig.apiKey;

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isConfigured ? getAuth(app) : null;
export const db = isConfigured ? getFirestore(app) : null;
export const storage = isConfigured ? getStorage(app) : null;
