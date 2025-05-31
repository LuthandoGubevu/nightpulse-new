
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
// import { getAnalytics } from "firebase/analytics";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;
// let analytics;

const getFirebaseConfig = () => ({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
});

const firebaseConfig = getFirebaseConfig();
const configProblems: string[] = [];

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
  configProblems.push("NEXT_PUBLIC_FIREBASE_API_KEY is missing or uses a placeholder value.");
}
if (!firebaseConfig.authDomain || firebaseConfig.authDomain === "YOUR_AUTH_DOMAIN") {
  configProblems.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing or uses a placeholder value.");
}
if (!firebaseConfig.projectId || firebaseConfig.projectId === "YOUR_PROJECT_ID") {
  configProblems.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or uses a placeholder value.");
}
// You can add more checks for other critical variables if needed, e.g., appId

if (configProblems.length > 0) {
  console.warn(
    "Firebase is not properly configured. The following issues were found with your environment variables (check your .env file):"
  );
  configProblems.forEach(problem => console.warn(`- ${problem}`));
  console.warn(
    "Please provide your actual Firebase project credentials in the .env file. " +
    "The application will run with limited or no Firebase functionality until configured."
  );
  // Ensure Firebase services remain undefined
  app = undefined;
  auth = undefined;
  firestore = undefined;
} else {
  // Initialize Firebase only if config seems valid and essential vars are present
  if (!getApps().length) {
    try {
      // Cast to 'any' for firebaseConfig if some optional properties might be undefined
      // and your actual config object in Firebase console might not list them all.
      // However, ensure all REQUIRED fields for initializeApp are present and valid.
      app = initializeApp(firebaseConfig as any);
      auth = getAuth(app);
      firestore = getFirestore(app);
      // if (firebaseConfig.measurementId && firebaseConfig.measurementId !== "YOUR_MEASUREMENT_ID") {
      //   analytics = getAnalytics(app);
      // }
    } catch (e) {
      console.error("Firebase initialization failed, even with seemingly valid config:", e);
      app = undefined;
      auth = undefined;
      firestore = undefined;
    }
  } else {
    // Firebase already initialized
    app = getApps()[0]!;
    auth = getAuth(app);
    firestore = getFirestore(app);
    // if (firebaseConfig.measurementId && firebaseConfig.measurementId !== "YOUR_MEASUREMENT_ID" && app) {
    //   analytics = getAnalytics(app);
    // }
  }
}

export { app, auth, firestore };

// Helper to convert Firestore Timestamps to Dates safely
export const transformTimestamp = (timestamp: any) => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp && typeof timestamp._seconds === 'number' && typeof timestamp._nanoseconds === 'number') {
    return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
  }
  // If it's already a Date object or a string, return as is or try to parse
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null; // Or handle as an error/default date
};
