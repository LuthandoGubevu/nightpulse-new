
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID" // Optional
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;
// let analytics;

const isFirebaseConfigured =
  firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.authDomain && firebaseConfig.authDomain !== "YOUR_AUTH_DOMAIN" &&
  firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID";

if (!isFirebaseConfigured) {
  console.warn(
    "Firebase is not properly configured. Essential Firebase credentials (apiKey, authDomain, projectId) are missing or are using placeholder values. " +
    "Please provide your actual Firebase project credentials in the .env file. " +
    "The application will run without Firebase functionality until configured."
  );
} else {
  if (typeof window !== "undefined" && !getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
    // if (firebaseConfig.measurementId && firebaseConfig.measurementId !== "YOUR_MEASUREMENT_ID") {
    //   analytics = getAnalytics(app); // Enable if you need analytics and it's configured
    // }
  } else if (getApps().length) {
    app = getApps()[0]!;
    auth = getAuth(app);
    firestore = getFirestore(app);
    // if (firebaseConfig.measurementId && firebaseConfig.measurementId !== "YOUR_MEASUREMENT_ID") {
    //   analytics = getAnalytics(app);
    // }
  } else {
    // This case is for server-side rendering or environments where Firebase might be initialized differently.
    // With the `isFirebaseConfigured` check, this branch is only hit if config is present.
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
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
