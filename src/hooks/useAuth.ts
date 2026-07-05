
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

function toUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.warn("Firebase Auth is not initialized; useAuth will report no user.");
      setUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? toUser(firebaseUser) : null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
}
