
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

let adminApp: App | undefined;
let adminFirestore: Firestore | undefined;
let adminAuth: Auth | undefined;
let adminStorageBucket: ReturnType<ReturnType<typeof getStorage>["bucket"]> | undefined;

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
    // Signed URLs for story photos (see storyActions.ts) need an explicit bucket name —
    // unlike Cloud Functions, a cert()-initialized Admin app has no default bucket.
    // Reuses the same public bucket name the client SDK already uses (firebase.ts);
    // it's a bucket identifier, not a secret. Signing works out of the box because this
    // app is initialized from a full service-account key (not bare Application Default
    // Credentials), so no extra IAM signBlob permission is needed.
    const storageBucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (storageBucketName) {
      adminStorageBucket = getStorage(adminApp).bucket(storageBucketName);
    } else {
      console.warn("🔴 NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set. Story photo signed URLs will be unavailable.");
    }
    console.info("✅ Firebase Admin app, firestore, auth, and storage initialized.");
  } catch (e: any) {
    console.error("🔴 Firebase Admin initialization failed:", e.message);
  }
}

export { adminApp, adminFirestore, adminAuth, adminStorageBucket };
