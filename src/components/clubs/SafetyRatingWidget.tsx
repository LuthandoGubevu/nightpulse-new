"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { submitSafetyRatingAction } from "@/actions/ratingActions";
import { useToast } from "@/hooks/use-toast";

interface SafetyRatingWidgetProps {
  clubId: string;
  initialRating: number | null;
  size?: "sm" | "md" | "lg";
}

const starSize = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };

export function SafetyRatingWidget({ clubId, initialRating, size = "lg" }: SafetyRatingWidgetProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(initialRating);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleVote = async (rating: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      toast({ title: "Not Signed In", description: "Please sign in to rate this club's safety.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    const result = await submitSafetyRatingAction(idToken, clubId, rating);
    setIsSubmitting(false);
    if (result.success) {
      setSelectedRating(rating);
    } else {
      toast({ title: "Couldn't Submit Rating", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const displayRating = hoveredRating ?? selectedRating ?? 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Your rating:</span>
      <div className="flex items-center" onMouseLeave={() => setHoveredRating(null)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={isSubmitting}
            className="p-0.5 disabled:opacity-50"
            onMouseEnter={() => setHoveredRating(star)}
            onClick={() => handleVote(star)}
            aria-label={`Rate ${star} out of 5 for safety`}
          >
            <Icons.star
              className={cn(
                starSize[size],
                "transition-colors",
                star <= displayRating ? "fill-current text-vy-star" : "text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
      {isSubmitting && <Icons.spinner className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
