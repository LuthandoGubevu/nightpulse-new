"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

/**
 * App-wide listener for new one-directional "Meet Me" interest ("someone tapped
 * Interested on you"). Mirrors MatchNotificationListener's baseline + docChanges("added")
 * pattern exactly — mounted once at the dashboard layout level so this surfaces
 * regardless of what page the user is on.
 */
export function IncomingInterestListener() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!user || !firestore) return;
    seenRef.current = null;

    const q = query(collection(firestore, "interests"), where("toUid", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (seenRef.current === null) {
          // Baseline on mount: don't notify about interests that already existed.
          seenRef.current = new Set(snapshot.docs.map((d) => d.id));
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && !seenRef.current!.has(change.doc.id)) {
            seenRef.current!.add(change.doc.id);
            toast({
              title: "Someone's interested in you!",
              description: "Check who liked you back at the venue.",
              action: (
                <ToastAction altText="View" onClick={() => router.push("/dashboard/interested")}>
                  View
                </ToastAction>
              ),
            });
          }
        });
      },
      (error) => {
        console.error("Error listening for incoming interest:", error);
      }
    );
    return () => unsubscribe();
  }, [user, toast, router]);

  return null;
}
