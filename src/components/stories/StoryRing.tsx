"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

interface StoryRingProps {
  photoUrl: string | null;
  displayName: string;
  hasActiveStory: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<StoryRingProps["size"]>, string> = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-20 w-20",
};

// Gradient ring (Instagram-style "unseen story" affordance) around a match's avatar —
// reuses the same brand gradient already used for chat bubbles/CTAs elsewhere.
export function StoryRing({ photoUrl, displayName, hasActiveStory, onClick, size = "md", className }: StoryRingProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn("flex flex-col items-center gap-1 shrink-0", onClick && "cursor-pointer", className)}
    >
      <div className={cn("rounded-full p-[2px]", hasActiveStory ? "bg-gradient-vy-purple-pink" : "bg-transparent")}>
        <Avatar className={cn(SIZE_CLASSES[size], "border-2 border-background")}>
          {photoUrl ? <AvatarImage src={photoUrl} alt={displayName} /> : null}
          <AvatarFallback>
            <Icons.userRound className="h-1/2 w-1/2 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      </div>
      <span className="text-xs text-muted-foreground max-w-[64px] truncate">{displayName}</span>
    </button>
  );
}
