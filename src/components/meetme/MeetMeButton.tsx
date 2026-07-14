"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { optInMeetMeAction, optOutMeetMeAction } from "@/actions/meetMeActions";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { ProfileSetupDialog } from "./ProfileSetupDialog";
import type { Gender, LookingFor, Orientation } from "@/types";

interface MeetMeButtonProps {
  clubId: string;
}

interface ExistingProfile {
  displayName?: string;
  photoUrl?: string | null;
  age?: number;
  gender?: Gender;
  lookingFor?: LookingFor;
  orientation?: Orientation | null;
}

export function MeetMeButton({ clubId }: MeetMeButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [existingProfile, setExistingProfile] = useState<ExistingProfile | null>(null);

  // Skip the unmount cleanup below when we're the ones navigating to the People Here
  // page — that's an in-feature route change, not the user leaving the venue.
  const skipCleanupRef = useRef(false);

  // On mount, check whether a presence doc already exists for this club (e.g. the user
  // opted in, then navigated to the People Here page and back — the button itself
  // remounts fresh each time, so without this it would wrongly show "Meet Me" again
  // while the user is actually still visible).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = auth?.currentUser?.uid;
      if (!uid || !firestore) return;
      try {
        const snap = await getDoc(doc(firestore, "clubs", clubId, "meetMePresence", uid));
        if (!cancelled && snap.exists()) {
          setIsOptedIn(true);
        }
      } catch {
        // The read rule's self-existence check fails when our own presence doc doesn't
        // exist, which surfaces as permission-denied — that just means "not opted in".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  // Instant invisibility: if this card unmounts because the user left the geofence
  // (not because they navigated to the People Here page — see skipCleanupRef above),
  // clear presence immediately rather than leaving it to the multi-hour TTL policy.
  useEffect(() => {
    return () => {
      if (isOptedIn && !skipCleanupRef.current) {
        auth?.currentUser?.getIdToken().then((idToken) => {
          if (idToken) optOutMeetMeAction(idToken, clubId);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const goToPeoplePage = () => {
    skipCleanupRef.current = true;
    router.push(`/dashboard/meet-me/${clubId}`);
  };

  // Fetch any existing (possibly partial) profile before opening the setup dialog, so
  // a returning user who already set a name/photo isn't forced to retype them just
  // because a newly-added required field (age/gender/looking-for) is still missing.
  const openProfileDialog = async () => {
    const uid = auth?.currentUser?.uid;
    if (uid && firestore) {
      try {
        const snap = await getDoc(doc(firestore, "users", uid));
        if (snap.exists()) {
          const data = snap.data();
          setExistingProfile({
            displayName: data.displayName,
            photoUrl: data.photoUrl ?? null,
            age: data.age,
            gender: data.gender,
            lookingFor: data.lookingFor,
            orientation: data.orientation ?? null,
          });
        }
      } catch {
        // Dialog just opens blank if this fails.
      }
    }
    setShowProfileDialog(true);
  };

  const handleToggle = async () => {
    if (isBusy) return;
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      toast({ title: "Not signed in", description: "Please sign in to use Meet Me.", variant: "destructive" });
      return;
    }

    if (isOptedIn) {
      setIsBusy(true);
      const result = await optOutMeetMeAction(idToken, clubId);
      setIsBusy(false);
      if (result.success) {
        setIsOptedIn(false);
      } else {
        toast({ title: "Couldn't opt out", description: result.error || "An unexpected error occurred.", variant: "destructive" });
      }
      return;
    }

    setIsBusy(true);
    const result = await optInMeetMeAction(idToken, clubId);
    setIsBusy(false);

    if (result.success) {
      setIsOptedIn(true);
      goToPeoplePage();
      return;
    }

    if (result.error === "Profile required") {
      openProfileDialog();
      return;
    }

    toast({ title: "Couldn't opt in", description: result.error || "An unexpected error occurred.", variant: "destructive" });
  };

  const handleProfileSaved = async () => {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) return;
    setIsBusy(true);
    const result = await optInMeetMeAction(idToken, clubId);
    setIsBusy(false);
    if (result.success) {
      setIsOptedIn(true);
      goToPeoplePage();
    } else {
      toast({ title: "Couldn't opt in", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isOptedIn ? "secondary" : "default"}
          disabled={isBusy}
          onClick={handleToggle}
          className="flex-1"
        >
          {isBusy ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.heart className="mr-2 h-4 w-4" />
          )}
          {isOptedIn ? "You're visible — tap to leave" : "Meet Me"}
        </Button>
        {isOptedIn && (
          <Button size="sm" variant="outline" onClick={goToPeoplePage}>
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
        initialOrientation={existingProfile?.orientation}
        onSaved={handleProfileSaved}
      />
    </>
  );
}
