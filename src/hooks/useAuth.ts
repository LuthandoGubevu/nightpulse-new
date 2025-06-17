
"use client";

import { useEffect, useState } from "react";
// import { onAuthStateChanged, type User } from "firebase/auth"; // Removed Firebase Auth imports
// import { auth } from "@/lib/firebase"; // Removed Firebase Auth imports

// Mock User type for compatibility if needed, though not strictly for auth anymore
export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  // Add other properties if your components expect them
};


export function useAuth() {
  // Since Firebase Auth is removed, we simulate a "no user" state.
  // Loading is immediately false as there's no auth state to wait for.
  const [user, setUser] = useState<User | null>(null); 
  const [loading, setLoading] = useState(false);

  // The useEffect for onAuthStateChanged is removed.
  // If you had other logic here not related to Firebase auth, it would remain.

  return { user, loading };
}
