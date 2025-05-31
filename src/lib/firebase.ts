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

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
// let analytics;

if (typeof window !== "undefined" && !getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
  // analytics = getAnalytics(app); // Enable if you need analytics
} else if (getApps().length) {
  app = getApps()[0]!;
  auth = getAuth(app);
  firestore = getFirestore(app);
  // analytics = getAnalytics(app); // Enable if you need analytics
} else {
  // This case is for server-side rendering or environments where Firebase might be initialized differently.
  // For Next.js App Router server components, you might need admin SDK or a different setup.
  // For simplicity in scaffolding, we rely on client-side initialization.
  // Production apps might need a more robust server-side Firebase Admin setup.
  app = initializeApp(firebaseConfig); // Fallback, might not be ideal for all server contexts
  auth = getAuth(app);
  firestore = getFirestore(app);
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
