"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import type { LookingFor } from "@/types";

interface LookingForPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLookingFor?: LookingFor;
  onConfirm: (lookingFor: LookingFor) => void;
  isSubmitting?: boolean;
}

/**
 * Shown on every check-in for a returning user (whose name/photo/age/gender are
 * already set) — deliberately separate from ProfileSetupDialog, since "what am I
 * looking for tonight" can change venue to venue and shouldn't silently carry over
 * from wherever the user last checked in.
 */
export function LookingForPrompt({
  open,
  onOpenChange,
  initialLookingFor,
  onConfirm,
  isSubmitting,
}: LookingForPromptProps) {
  const [lookingFor, setLookingFor] = useState<LookingFor>(initialLookingFor ?? "friends");

  useEffect(() => {
    if (open) setLookingFor(initialLookingFor ?? "friends");
  }, [open, initialLookingFor]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What are you looking for tonight?</DialogTitle>
          <DialogDescription>
            Just for right now — you can change this every time you check in somewhere new.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          <Button
            type="button"
            variant={lookingFor === "friends" ? "default" : "outline"}
            onClick={() => setLookingFor("friends")}
          >
            <Icons.usersRound className="mr-1.5 h-4 w-4" /> Friends
          </Button>
          <Button
            type="button"
            variant={lookingFor === "love" ? "default" : "outline"}
            onClick={() => setLookingFor("love")}
          >
            <Icons.heart className="mr-1.5 h-4 w-4" /> Love
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={() => onConfirm(lookingFor)} disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
