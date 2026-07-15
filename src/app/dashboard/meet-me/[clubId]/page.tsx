
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, onSnapshot, Timestamp } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { expressInterestAction } from "@/actions/meetMeActions";
import { blockUserAction } from "@/actions/profileActions";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ReportUserDialog } from "@/components/meetme/ReportUserDialog";
import type { MeetMePresenceWithId } from "@/types";

function timeAgo(timestamp?: Timestamp) {
  if (!timestamp?.toDate) return null;
  const minutes = Math.max(1, Math.round((Date.now() - timestamp.toDate().getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export default function MeetMePeoplePage() {
  const { clubId } = useParams<{ clubId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<MeetMePresenceWithId[]>([]);
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [pendingUids, setPendingUids] = useState<Set<string>>(new Set());
  const [interestedUids, setInterestedUids] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ uid: string; name: string } | null>(null);

  const currentUid = auth?.currentUser?.uid;

  useEffect(() => {
    if (!firestore || !currentUid) return;

    (async () => {
      const snap = await getDoc(doc(firestore!, "users", currentUid));
      setBlockedUids(snap.data()?.blockedUids ?? []);
    })();

    const unsubscribe = onSnapshot(
      collection(firestore, "clubs", clubId, "meetMePresence"),
      (querySnapshot) => {
        const now = Timestamp.now();
        const list = querySnapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }) as MeetMePresenceWithId)
          .filter((p) => p.id !== currentUid && p.expiresAt?.toMillis?.() > now.toMillis());
        setPeople(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to Meet Me presence:", error);
        toast({ title: "Error", description: "Could not load who's here.", variant: "destructive" });
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [clubId, currentUid, toast]);

  const visiblePeople = useMemo(
    () => people.filter((p) => !blockedUids.includes(p.id)),
    [people, blockedUids]
  );

  const handleInterested = async (targetUid: string) => {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
      return;
    }
    setPendingUids((prev) => new Set(prev).add(targetUid));
    const result = await expressInterestAction(idToken, clubId, targetUid);
    setPendingUids((prev) => {
      const next = new Set(prev);
      next.delete(targetUid);
      return next;
    });

    if (!result.success) {
      toast({ title: "Couldn't send interest", description: result.error || "An unexpected error occurred.", variant: "destructive" });
      return;
    }

    setInterestedUids((prev) => new Set(prev).add(targetUid));

    if (result.matched && result.conversationId) {
      toast({ title: "It's a match!", description: "You can now chat." });
      router.push(`/chat/${result.conversationId}`);
    } else {
      toast({ title: "Interest sent", description: "If they're interested too, you'll be able to chat." });
    }
  };

  const handleBlock = async (targetUid: string) => {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) return;
    const result = await blockUserAction(idToken, targetUid);
    if (result.success) {
      setBlockedUids((prev) => [...prev, targetUid]);
      toast({ title: "User blocked", description: "You won't see them anymore." });
    } else {
      toast({ title: "Couldn't block user", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <PageHeader title="People here" description="Everyone below has also tapped Meet Me at this venue.">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <Icons.close className="mr-2 h-4 w-4" /> Close
        </Button>
      </PageHeader>

      <div className="mt-6 space-y-3">
        {loading && (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        )}

        {!loading && visiblePeople.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            No one else here yet. Check back soon.
          </p>
        )}

        {visiblePeople.map((person) => {
          const isInterested = interestedUids.has(person.id);
          const isPending = pendingUids.has(person.id);
          const joined = timeAgo(person.createdAt);

          return (
            <div
              key={person.id}
              className="rounded-xl border bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-14 w-14 border shrink-0">
                  {person.photoUrl ? <AvatarImage src={person.photoUrl} alt={person.displayName} /> : null}
                  <AvatarFallback>
                    <Icons.userRound className="h-7 w-7 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">
                      {person.displayName}
                      {typeof person.age === "number" ? `, ${person.age}` : ""}
                    </p>
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 " +
                        (person.lookingFor === "love"
                          ? "bg-pink-500/15 text-pink-500"
                          : "bg-sky-500/15 text-sky-500")
                      }
                    >
                      {person.lookingFor === "love" ? (
                        <Icons.heart className="h-3 w-3" />
                      ) : (
                        <Icons.usersRound className="h-3 w-3" />
                      )}
                      {person.lookingFor === "love" ? "Love" : "Friends"}
                    </span>
                  </div>
                  {joined && <p className="text-xs text-muted-foreground">Here since {joined}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end shrink-0">
                {isInterested ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-500 px-3 py-1.5 text-sm font-medium whitespace-nowrap">
                    <Icons.check className="h-4 w-4" /> Interested
                  </span>
                ) : (
                  <Button size="sm" disabled={isPending} onClick={() => handleInterested(person.id)}>
                    {isPending ? (
                      <Icons.spinner className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.heart className="mr-1.5 h-4 w-4" />
                    )}
                    Interested
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label={`More options for ${person.displayName}`}>
                      <Icons.moreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBlock(person.id)}>
                      <Icons.ban className="mr-2 h-4 w-4" /> Block
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setReportTarget({ uid: person.id, name: person.displayName })}>
                      <Icons.flag className="mr-2 h-4 w-4" /> Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {reportTarget && (
        <ReportUserDialog
          open={!!reportTarget}
          onOpenChange={(o) => !o && setReportTarget(null)}
          reportedUid={reportTarget.uid}
          reportedName={reportTarget.name}
          clubId={clubId}
        />
      )}
    </div>
  );
}
