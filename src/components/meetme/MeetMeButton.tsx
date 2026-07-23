"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { optInMeetMeAction, optOutMeetMeAction } from "@/actions/meetMeActions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { ProfileSetupDialog } from "./ProfileSetupDialog";
import { LookingForPrompt } from "./LookingForPrompt";
import type { Gender, LookingFor } from "@/types";

interface MeetMeButtonProps {
  clubId: string;
}

interface ExistingProfile {
  displayName?: string;
  photoUrl?: string | null;
  age?: number;
  gender?: Gender;
  lookingFor?: LookingFor;
}

type PresenceStatus = "checking" | "optedOut" | "optedIn";

export function MeetMeButton({ clubId }: MeetMeButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  // "checking" (not just a boolean defaulting to false) so a fresh mount — e.g. after
  // the geofence hook's `isHereNow` flaps and ClubCard remounts this whole component —
  // doesn't flash "Meet Me" before the mount-time restore below resolves.
  const [status, setStatus] = useState<PresenceStatus>("checking");
  const isOptedIn = status === "optedIn";
  const [isBusy, setIsBusy] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showLookingForPrompt, setShowLookingForPrompt] = useState(false);
  const [existingProfile, setExistingProfile] = useState<ExistingProfile | null>(null);

  // Skip the unmount cleanup below when we're the ones navigating to the People Here
  // page — that's an in-feature route change, not the user leaving the venue.
  const skipCleanupRef = useRef(false);

  // Cleanup effects only run against what they closed over at registration time — kept
  // in sync via a ref so the unmount cleanup below always sees the latest status without
  // needing to re-run (and re-register) the whole effect on every status change.
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // On mount, check whether a presence doc already exists for this club (e.g. the user
  // opted in, then navigated to the People Here page and back — the button itself
  // remounts fresh each time, so without this it would wrongly show "Meet Me" again
  // while the user is actually still visible).
  useEffect(() => {
    let cancelled = false;
    setStatus("checking");
    (async () => {
      const uid = auth?.currentUser?.uid;
      if (!uid || !firestore) {
        if (!cancelled) setStatus("optedOut");
        return;
      }
      try {
        const snap = await getDoc(doc(firestore, "clubs", clubId, "meetMePresence", uid));
        if (!cancelled) setStatus(snap.exists() ? "optedIn" : "optedOut");
      } catch {
        // The read rule's self-existence check fails when our own presence doc doesn't
        // exist, which surfaces as permission-denied — that just means "not opted in".
        if (!cancelled) setStatus("optedOut");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  // Instant invisibility: if this card unmounts because the user left the geofence
  // (not because they navigated to the People Here page — see skipCleanupRef above),
  // clear presence immediately rather than leaving it to the multi-hour TTL policy.
  // Reads statusRef (not `status` directly) so this always sees the latest value even
  // though the effect itself is only registered once per `clubId`.
  useEffect(() => {
    return () => {
      if (statusRef.current === "optedIn" && !skipCleanupRef.current) {
        auth?.currentUser?.getIdToken().then((idToken) => {
          if (idToken) optOutMeetMeAction(idToken, clubId);
        });
      }
    };
  }, [clubId]);

  const goToPeoplePage = () => {
    skipCleanupRef.current = true;
    router.push(`/dashboard/meet-me/${clubId}`);
  };

  const completeOptIn = async (lookingFor: LookingFor) => {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
      return;
    }
    setIsBusy(true);
    const result = await optInMeetMeAction(idToken, clubId, lookingFor);
    setIsBusy(false);
    setShowLookingForPrompt(false);

    if (result.success) {
      setStatus("optedIn");
      goToPeoplePage();
    } else {
      toast({ title: "Couldn't opt in", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const handleToggle = async () => {
    if (isBusy) return;

    if (isOptedIn) {
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) {
        toast({ title: "Not signed in", description: "Please sign in to use Meet Me.", variant: "destructive" });
        return;
      }
      setIsBusy(true);
      const result = await optOutMeetMeAction(idToken, clubId);
      setIsBusy(false);
      if (result.success) {
        setStatus("optedOut");
      } else {
        toast({ title: "Couldn't opt out", description: result.error || "An unexpected error occurred.", variant: "destructive" });
      }
      return;
    }

    // Opting in: figure out, from the user's own stable profile fields, whether this is
    // a first-time setup (full dialog) or a returning user who just needs to reconfirm
    // what they're looking for tonight (lightweight prompt) — lookingFor itself is
    // never read silently from a prior session.
    const uid = auth?.currentUser?.uid;
    if (!uid || !firestore) {
      toast({ title: "Not signed in", description: "Please sign in to use Meet Me.", variant: "destructive" });
      return;
    }

    setIsBusy(true);
    let profileData: any = null;
    try {
      const snap = await getDoc(doc(firestore, "users", uid));
      if (snap.exists()) profileData = snap.data();
    } catch {
      // Treated the same as "no profile yet" below.
    }
    setIsBusy(false);

    const hasCoreProfile =
      !!profileData?.displayName && typeof profileData?.age === "number" && !!profileData?.gender;

    setExistingProfile({
      displayName: profileData?.displayName,
      photoUrl: profileData?.photoUrl ?? null,
      age: profileData?.age,
      gender: profileData?.gender,
      lookingFor: profileData?.lookingFor,
    });

    if (!hasCoreProfile) {
      setShowProfileDialog(true);
    } else {
      setShowLookingForPrompt(true);
    }
  };

  // While the mount-time restore is in flight, render a disabled neutral placeholder
  // instead of "Meet Me" — every remount (e.g. ClubCard flapping isHereNow, or returning
  // from the People Here page) briefly passes through here, and showing the wrong label
  // for a moment is exactly the flicker this status state exists to avoid.
  if (status === "checking") {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled className="flex-1 min-w-0 truncate">
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          Meet Me
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isOptedIn ? "secondary" : "vy"}
          disabled={isBusy}
          onClick={handleToggle}
          // The glow pulse only plays while genuinely opted in and visible right
          // now — a live status signal, not decoration.
          className={cn("flex-1 min-w-0 truncate", isOptedIn && "animate-vy-glow")}
        >
          {isBusy ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.heart className="mr-2 h-4 w-4" />
          )}
          {isOptedIn ? "Tap to leave" : "Meet Me"}
        </Button>
        {isOptedIn && (
          <Button size="sm" variant="outline" className="shrink-0" onClick={goToPeoplePage}>
            People here
          </Button>
        )}
      </div>

      <ProfileSetupDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        initialDisplayName={existingProfile?.displayName}
        initialPhotoUrl={existingProfile?.photoUrl}
        initialAge={existingProfile?.age}
        initialGender={existingProfile?.gender}
        initialLookingFor={existingProfile?.lookingFor}
        onSaved={(profile) => completeOptIn(profile.lookingFor)}
      />

      <LookingForPrompt
        open={showLookingForPrompt}
        onOpenChange={setShowLookingForPrompt}
        initialLookingFor={existingProfile?.lookingFor}
        isSubmitting={isBusy}
        onConfirm={completeOptIn}
      />
    </>
  );
}
