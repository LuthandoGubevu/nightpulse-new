
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { expressInterestAction } from "@/actions/meetMeActions";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { ConversationWithId, InterestWithId } from "@/types";

interface IncomingInterestRow {
  interest: InterestWithId;
  fromName: string;
  fromPhotoUrl: string | null;
  clubName: string;
}

export default function InterestedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [interests, setInterests] = useState<InterestWithId[]>([]);
  const [matchedFromUids, setMatchedFromUids] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<IncomingInterestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUids, setPendingUids] = useState<Set<string>>(new Set());

  const profileCacheRef = useRef<Map<string, { displayName: string; photoUrl: string | null }>>(new Map());
  const clubCacheRef = useRef<Map<string, string>>(new Map());

  // Incoming interests, live.
  useEffect(() => {
    if (!user || !firestore) {
      setInterests([]);
      return;
    }
    const q = query(collection(firestore, "interests"), where("toUid", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setInterests(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as InterestWithId));
      },
      (error) => {
        console.error("Error loading incoming interests:", error);
        toast({ title: "Couldn't load", description: "Something went wrong loading who's interested in you.", variant: "destructive" });
      }
    );
    return () => unsubscribe();
  }, [user, toast]);

  // Existing matches, so already-mutual interests don't show up here too (they belong on
  // the Matches page — this page is specifically "people who like you, not yet mutual").
  useEffect(() => {
    if (!user || !firestore) {
      setMatchedFromUids(new Set());
      return;
    }
    const q = query(collection(firestore, "conversations"), where("participantUids", "array-contains", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uids = new Set<string>();
      snapshot.docs.forEach((d) => {
        const data = d.data() as ConversationWithId;
        const other = data.participantUids.find((uid) => uid !== user.uid);
        if (other) uids.add(other);
      });
      setMatchedFromUids(uids);
    });
    return () => unsubscribe();
  }, [user]);

  // Mark as seen (powers the nav badge) once we've actually loaded the page.
  useEffect(() => {
    if (!user || !firestore) return;
    setDoc(doc(firestore, "users", user.uid), { interestsLastSeenAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }, [user]);

  // Resolve fromUid -> profile and clubId -> name for each unmatched incoming interest.
  useEffect(() => {
    if (!user) return;
    const pending = interests.filter((i) => !matchedFromUids.has(i.fromUid));
    if (pending.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(
        pending.map(async (interest) => {
          let profile = profileCacheRef.current.get(interest.fromUid);
          if (!profile && firestore) {
            const snap = await getDoc(doc(firestore, "users", interest.fromUid));
            profile = snap.exists()
              ? { displayName: snap.data().displayName ?? "Someone", photoUrl: snap.data().photoUrl ?? null }
              : { displayName: "Someone", photoUrl: null };
            profileCacheRef.current.set(interest.fromUid, profile);
          }
          let clubName = clubCacheRef.current.get(interest.clubId);
          if (!clubName && firestore) {
            const snap = await getDoc(doc(firestore, "clubs", interest.clubId));
            const data = snap.data();
            clubName = (data?.name as string | undefined) ?? "a club";
            clubCacheRef.current.set(interest.clubId, clubName);
          }
          return {
            interest,
            fromName: profile?.displayName ?? "Someone",
            fromPhotoUrl: profile?.photoUrl ?? null,
            clubName: clubName ?? "a club",
          };
        })
      );
      if (!cancelled) {
        resolved.sort((a, b) => (b.interest.createdAt?.toMillis?.() ?? 0) - (a.interest.createdAt?.toMillis?.() ?? 0));
        setRows(resolved);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [interests, matchedFromUids, user]);

  const handleInterestedBack = async (row: IncomingInterestRow) => {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
      return;
    }
    setPendingUids((prev) => new Set(prev).add(row.interest.fromUid));
    const result = await expressInterestAction(idToken, row.interest.clubId, row.interest.fromUid);
    setPendingUids((prev) => {
      const next = new Set(prev);
      next.delete(row.interest.fromUid);
      return next;
    });

    if (!result.success) {
      toast({ title: "Couldn't send interest", description: result.error || "An unexpected error occurred.", variant: "destructive" });
      return;
    }
    if (result.matched && result.conversationId) {
      toast({ title: "It's a match!", description: "You can now chat." });
      router.push(`/chat/${result.conversationId}`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <PageHeader
        title="Interested in you"
        description="People who've tapped Interested on you at a venue — tap back to match and start chatting."
      />

      <div className="mt-6 space-y-3">
        {loading && (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        )}

        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            No one new yet. When someone taps Interested on you at a venue, they&apos;ll show up here.
          </p>
        )}

        {rows.map((row) => {
          const isPending = pendingUids.has(row.interest.fromUid);
          return (
            <div
              key={row.interest.id}
              className="rounded-xl border border-white/10 bg-gradient-vy-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-14 w-14 border border-white/10 shrink-0">
                  {row.fromPhotoUrl ? <AvatarImage src={row.fromPhotoUrl} alt={row.fromName} /> : null}
                  <AvatarFallback>
                    <Icons.userRound className="h-7 w-7 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{row.fromName}</p>
                  <p className="text-xs text-muted-foreground truncate">Interested in you at {row.clubName}</p>
                </div>
              </div>

              <Button
                variant="vy"
                size="sm"
                className="shrink-0"
                disabled={isPending}
                onClick={() => handleInterestedBack(row)}
              >
                {isPending ? (
                  <Icons.spinner className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Icons.heart className="mr-1.5 h-4 w-4" />
                )}
                Interested back
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
