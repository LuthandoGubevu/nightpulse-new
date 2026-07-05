
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminApp: App | undefined;
let adminFirestore: Firestore | undefined;
let adminAuth: Auth | undefined;

function loadServiceAccount(): Record<string, unknown> | null {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!base64) {
    console.warn(
      "🔴 FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 is not set. Firebase Admin SDK (used for heartbeat writes and live counts) will be unavailable."
    );
    return null;
  }
  try {
    return JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
  } catch (e) {
    console.error("🔴 Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY_BASE64. Ensure it is the base64 encoding of the full service account JSON.", e);
    return null;
  }
}

const serviceAccount = loadServiceAccount();

if (serviceAccount) {
  try {
    adminApp = getApps().length ? getApps()[0]! : initializeApp({ credential: cert(serviceAccount as any) });
    adminFirestore = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    console.info("✅ Firebase Admin app, firestore, and auth initialized.");
  } catch (e: any) {
    console.error("🔴 Firebase Admin initialization failed:", e.message);
  }
}

export { adminApp, adminFirestore, adminAuth };
