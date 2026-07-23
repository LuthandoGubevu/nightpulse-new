"use client";

import { useEffect } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

const HEARTBEAT_INTERVAL_MS = 60_000;

// Direct client write (see firestore.rules' users/{uid} self-only lastActiveAt
// exception) — a low-stakes, single-field write that doesn't need to go through
// profileActions.ts. setDoc + merge (not updateDoc) so this also works for a user who
// has no users/{uid} doc yet (never touched Meet Me or the age prompt).
export function usePresenceHeartbeat(uid: string | null | undefined) {
  useEffect(() => {
    if (!uid || !firestore) return;

    const beat = () => {
      setDoc(doc(firestore!, "users", uid), { lastActiveAt: serverTimestamp() }, { merge: true }).catch(() => {
        // Best-effort — a missed heartbeat just means presence looks stale a bit longer.
      });
    };

    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [uid]);
}
