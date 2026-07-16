"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { saveAccountAgeAction, skipAccountAgeAction } from "@/actions/profileActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

/**
 * App-wide, one-time, skippable age prompt for every signed-in user — not
 * gated behind Meet Me. Powers the admin analytics age-distribution chart,
 * which needs age linked to an account rather than to an anonymous device.
 * Composes with Meet Me: anyone who answers here already has age filled in
 * if they later open a Meet Me profile (ProfileSetupDialog pre-fills from the
 * same users/{uid}.age field).
 */
export function AgePromptDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [age, setAge] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user || !firestore) {
      setOpen(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, "users", user.uid));
        const data = snap.data();
        if (!cancelled && (data?.age === undefined || data?.age === null) && data?.ageSkipped !== true) {
          setOpen(true);
        }
      } catch (error) {
        console.error("Error checking account age status:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSkip = async () => {
    setOpen(false);
    const idToken = await auth?.currentUser?.getIdToken().catch(() => undefined);
    if (idToken) {
      skipAccountAgeAction(idToken).catch((error) => console.error("Error skipping age prompt:", error));
    }
  };

  const handleSave = async () => {
    const ageNum = parseInt(age, 10);
    if (!Number.isFinite(ageNum) || ageNum < 18) {
      toast({ title: "Enter a valid age", description: "You must be 18 or older.", variant: "destructive" });
      return;
    }

    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      toast({ title: "Not signed in", description: "Please sign in again.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveAccountAgeAction(idToken, ageNum);
      if (!result.success) {
        toast({ title: "Couldn't save", description: result.error || "An unexpected error occurred.", variant: "destructive" });
        return;
      }
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Couldn't save", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleSkip();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What&apos;s your age?</DialogTitle>
          <DialogDescription>
            Helps venues understand who&apos;s coming out. Never shown to other patrons — only used in aggregate
            reporting. Totally optional.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="account-age">Age</Label>
          <Input
            id="account-age"
            type="number"
            inputMode="numeric"
            min={18}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="18+"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleSkip} disabled={isSaving}>
            Not now
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
