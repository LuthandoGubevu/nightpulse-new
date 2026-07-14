"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { optInMeetMeAction, optOutMeetMeAction } from "@/actions/meetMeActions";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { ProfileSetupDialog } from "./ProfileSetupDialog";
import { MeetMePresenceList } from "./MeetMePresenceList";

interface MeetMeButtonProps {
  clubId: string;
}

export function MeetMeButton({ clubId }: MeetMeButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showPresenceSheet, setShowPresenceSheet] = useState(false);

  // Instant invisibility: if this card unmounts (the user left the geofence, or
  // navigated away) while opted in, clear presence immediately rather than leaving
  // it to the multi-hour TTL policy to eventually clean up.
  useEffect(() => {
    return () => {
      if (isOptedIn) {
        auth?.currentUser?.getIdToken().then((idToken) => {
          if (idToken) optOutMeetMeAction(idToken, clubId);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

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
        setShowPresenceSheet(false);
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
      setShowPresenceSheet(true);
      return;
    }

    if (result.error === "Profile required") {
      setShowProfileDialog(true);
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
      setShowPresenceSheet(true);
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
          <Button size="sm" variant="outline" onClick={() => setShowPresenceSheet(true)}>
            People here
          </Button>
        )}
      </div>

      <ProfileSetupDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        onSaved={handleProfileSaved}
      />

      {isOptedIn && (
        <MeetMePresenceList
          clubId={clubId}
          open={showPresenceSheet}
          onOpenChange={setShowPresenceSheet}
          onMatched={(conversationId) => router.push(`/chat/${conversationId}`)}
        />
      )}
    </>
  );
}
