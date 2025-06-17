
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";

let app: FirebaseApp | undefined;
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

// Define critical keys and their placeholder prefixes for validation
const criticalConfigMappings: { key: keyof typeof firebaseConfig, placeholderPrefix: string, envVarName: string }[] = [
  { key: 'apiKey', placeholderPrefix: 'YOUR_API_KEY', envVarName: 'NEXT_PUBLIC_FIREBASE_API_KEY' },
  { key: 'authDomain', placeholderPrefix: 'YOUR_AUTH_DOMAIN', envVarName: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN' },
  { key: 'projectId', placeholderPrefix: 'YOUR_PROJECT_ID', envVarName: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' },
  { key: 'appId', placeholderPrefix: 'YOUR_APP_ID', envVarName: 'NEXT_PUBLIC_FIREBASE_APP_ID' }
];

criticalConfigMappings.forEach(mapping => {
  const value = firebaseConfig[mapping.key];
  let problemMessage = "";

  if (value === undefined) { 
    problemMessage = `${mapping.envVarName} is missing or undefined. Ensure it is set in your .env file and the server has been restarted.`;
  } else if (String(value).trim() === "") {
    problemMessage = `${mapping.envVarName} is empty. Please provide a value.`;
  } else if (String(value).startsWith(mapping.placeholderPrefix.substring(0, 5))) { 
    problemMessage = `${mapping.envVarName} appears to use a placeholder value (e.g., starts with "${mapping.placeholderPrefix.substring(0, 5)}"). Please use your actual Firebase credential.`;
  }

  if (problemMessage) {
    configProblems.push(problemMessage);
  }
});


if (configProblems.length > 0) {
  console.warn(
    "🔴 Firebase is not properly configured. The following issues were found with your environment variables (check your .env file and ensure the server was restarted after changes):"
  );
  configProblems.forEach(problem => console.warn(`- ${problem}`));
  console.warn(
    "Please provide your actual Firebase project credentials in the .env file. " +
    "The application will run with limited or no Firebase functionality until configured."
  );
  app = undefined;
  firestore = undefined;
} else {
  if (!getApps().length) {
    try {
      console.info("Attempting to initialize Firebase app with provided configuration...");
      app = initializeApp(firebaseConfig as any); 
      firestore = getFirestore(app);
      console.info("✅ Firebase app and firestore services initialized on server.");
      // if (firebaseConfig.measurementId && !String(firebaseConfig.measurementId).startsWith("YOUR_")) {
      //   analytics = getAnalytics(app);
      // }
    } catch (e: any) {
      console.error("🔴 Firebase initialization failed unexpectedly, even with seemingly valid config values. Error:", e.message);
      app = undefined;
      firestore = undefined;
    }
  } else {
    app = getApps()[0]!;
    firestore = getFirestore(app);
    console.info("✅ Firebase app and firestore services re-used existing initialization on server.");
    // if (firebaseConfig.measurementId && !String(firebaseConfig.measurementId).startsWith("YOUR_") && app) {
    //   analytics = getAnalytics(app);
    // }
  }
}

// Log the status of services post-attempt
if (configProblems.length > 0 || !app || !firestore) {
    if (!app) console.error("🔴 Final status: Firebase App (app) is undefined on the server.");
    if (!firestore) console.error("🔴 Final status: Firebase Firestore (firestore) is undefined on the server.");
} else {
    console.info("✅ Final status: Firebase app and firestore services appear to be correctly initialized on the server.");
}


export { app, firestore }; // Removed auth export

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
