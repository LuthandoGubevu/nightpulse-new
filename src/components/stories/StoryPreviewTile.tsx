"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

export type StoryPreview =
  | { kind: "image"; url: string }
  | { kind: "text"; text: string; backgroundColor: string }
  | { kind: "none" };

interface StoryPreviewTileProps {
  displayName: string;
  hasActiveStory: boolean;
  preview: StoryPreview;
  fallbackPhotoUrl: string | null;
  onClick?: () => void;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<StoryPreviewTileProps["size"]>, string> = {
  sm: "h-24 w-16",
  md: "h-28 w-20",
};

// Rounded-rectangle story preview card (WhatsApp Status-style) — shows the actual latest
// story's content (photo or colored text card) rather than just the person's avatar, with
// a gradient border when there's an active story and their name overlaid at the bottom.
export function StoryPreviewTile({
  displayName,
  hasActiveStory,
  preview,
  fallbackPhotoUrl,
  onClick,
  size = "md",
  className,
}: StoryPreviewTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn("shrink-0", onClick && "cursor-pointer", className)}
    >
      <div
        className={cn(
          "rounded-xl p-[2px]",
          hasActiveStory ? "bg-gradient-vy-purple-pink" : "bg-transparent"
        )}
      >
        <div className={cn(SIZE_CLASSES[size], "relative overflow-hidden rounded-[10px] bg-muted")}>
          {preview.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="" className="h-full w-full object-cover" />
          ) : preview.kind === "text" ? (
            <div
              className="flex h-full w-full items-center justify-center p-2"
              style={{ backgroundColor: preview.backgroundColor }}
            >
              <p className="line-clamp-4 text-center text-xs font-semibold text-white break-words">
                {preview.text}
              </p>
            </div>
          ) : (
            <Avatar className="h-full w-full rounded-[10px]">
              {fallbackPhotoUrl ? <AvatarImage src={fallbackPhotoUrl} alt={displayName} className="object-cover" /> : null}
              <AvatarFallback className="rounded-[10px]">
                <Icons.userRound className="h-1/3 w-1/3 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4">
            <span className="block truncate text-[11px] font-medium text-white">{displayName}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
