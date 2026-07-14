"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDoc, doc, onSnapshot, Timestamp } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { expressInterestAction } from "@/actions/meetMeActions";
import { blockUserAction } from "@/actions/profileActions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { ReportUserDialog } from "./ReportUserDialog";
import type { MeetMePresenceWithId } from "@/types";

interface MeetMePresenceListProps {
  clubId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMatched: (conversationId: string) => void;
}

export function MeetMePresenceList({ clubId, open, onOpenChange, onMatched }: MeetMePresenceListProps) {
  const { toast } = useToast();
  const [people, setPeople] = useState<MeetMePresenceWithId[]>([]);
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [pendingUids, setPendingUids] = useState<Set<string>>(new Set());
  const [interestedUids, setInterestedUids] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ uid: string; name: string } | null>(null);

  const currentUid = auth?.currentUser?.uid;

  useEffect(() => {
    if (!open || !firestore || !currentUid) return;

    (async () => {
      const snap = await getDoc(doc(firestore!, "users", currentUid));
      setBlockedUids(snap.exists() ? (snap.data().blockedUids ?? []) : []);
    })();

    const unsubscribe = onSnapshot(
      collection(firestore, "clubs", clubId, "meetMePresence"),
      (querySnapshot) => {
        const now = Timestamp.now();
        const list = querySnapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }) as MeetMePresenceWithId)
          .filter((p) => p.id !== currentUid && p.expiresAt?.toMillis?.() > now.toMillis());
        setPeople(list);
      },
      (error) => {
        console.error("Error listening to Meet Me presence:", error);
        toast({ title: "Error", description: "Could not load who's here.", variant: "destructive" });
      }
    );
    return () => unsubscribe();
  }, [open, clubId, currentUid, toast]);

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
      onOpenChange(false);
      onMatched(result.conversationId);
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>People here</SheetTitle>
            <SheetDescription>
              Everyone below has also tapped Meet Me at this venue. Express interest — if it&apos;s mutual, a chat opens up.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex-1 overflow-y-auto space-y-3">
            {visiblePeople.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No one else here yet. Check back soon.
              </p>
            )}
            {visiblePeople.map((person) => (
              <div key={person.id} className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-12 w-12">
                  {person.photoUrl ? <AvatarImage src={person.photoUrl} alt={person.displayName} /> : null}
                  <AvatarFallback>
                    <Icons.userRound className="h-6 w-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 font-medium truncate">{person.displayName}</span>
                <Button
                  size="sm"
                  variant={interestedUids.has(person.id) ? "secondary" : "default"}
                  disabled={pendingUids.has(person.id) || interestedUids.has(person.id)}
                  onClick={() => handleInterested(person.id)}
                >
                  {pendingUids.has(person.id) ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                  ) : interestedUids.has(person.id) ? (
                    <>
                      <Icons.check className="mr-1 h-4 w-4" /> Interested
                    </>
                  ) : (
                    <>
                      <Icons.heart className="mr-1 h-4 w-4" /> Interested
                    </>
                  )}
                </Button>
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
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {reportTarget && (
        <ReportUserDialog
          open={!!reportTarget}
          onOpenChange={(o) => !o && setReportTarget(null)}
          reportedUid={reportTarget.uid}
          reportedName={reportTarget.name}
          clubId={clubId}
        />
      )}
    </>
  );
}
