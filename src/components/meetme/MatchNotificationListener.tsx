"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

/**
 * App-wide listener for new "Meet Me" matches. Mounted once at the dashboard layout
 * level (not just the discovery screen) so a match notification surfaces regardless
 * of what page the user is on — the other half of a match can complete while someone
 * is browsing a different club's discovery list entirely.
 */
export function MatchNotificationListener() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!user || !firestore) return;
    seenRef.current = null;

    const q = query(collection(firestore, "conversations"), where("participantUids", "array-contains", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (seenRef.current === null) {
          // Baseline on mount: don't notify about matches that already existed.
          seenRef.current = new Set(snapshot.docs.map((d) => d.id));
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && !seenRef.current!.has(change.doc.id)) {
            seenRef.current!.add(change.doc.id);
            toast({
              title: "It's a match!",
              description: "Someone you're interested in is interested too.",
              action: (
                <ToastAction altText="Open chat" onClick={() => router.push(`/chat/${change.doc.id}`)}>
                  Say hi
                </ToastAction>
              ),
            });
          }
        });
      },
      (error) => {
        console.error("Error listening for matches:", error);
      }
    );
    return () => unsubscribe();
  }, [user, toast, router]);

  return null;
}
