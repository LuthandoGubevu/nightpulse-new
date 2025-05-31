"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { getEstimatedWaitTime } from "@/actions/aiActions";
import type { ClubWithId } from "@/types";

interface WaitTimeDialogProps {
  club: ClubWithId;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function WaitTimeDialog({ club, isOpen, onOpenChange }: WaitTimeDialogProps) {
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = async () => {
    setIsLoading(true);
    setError(null);
    setEstimatedTime(null);
    const result = await getEstimatedWaitTime(club.id, club.currentCount);
    if (result.success && result.data) {
      setEstimatedTime(result.data.estimatedWaitTime);
    } else {
      setError(result.error || "Could not fetch estimated wait time.");
    }
    setIsLoading(false);
  };

  // Reset state when dialog is closed/opened
  useState(() => {
    if (isOpen) {
        setEstimatedTime(null);
        setError(null);
        setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  });


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Estimate Wait Time for {club.name}</DialogTitle>
          <DialogDescription>
            Current crowd: {club.currentCount} people. Click below to get an AI-powered wait time estimation.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading && (
            <div className="flex items-center justify-center space-x-2">
              <Icons.spinner className="h-6 w-6 animate-spin" />
              <span>Estimating...</span>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {estimatedTime && !isLoading && (
            <div className="text-center">
              <p className="text-lg font-semibold">Estimated Wait Time:</p>
              <p className="text-3xl font-bold text-primary">{estimatedTime}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          {!estimatedTime && !isLoading && (
            <Button onClick={handleEstimate} disabled={isLoading}>
              {isLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.clock className="mr-2 h-4 w-4" />}
              Estimate Now
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
