import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";

interface ClubRatingIndicatorProps {
  sum: number;
  count: number;
  size?: "sm" | "md" | "lg";
}

const starSize = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };

export function ClubRatingIndicator({ sum, count, size = "md" }: ClubRatingIndicatorProps) {
  if (count === 0) {
    return <span className="text-xs text-muted-foreground">No safety ratings yet</span>;
  }

  const average = sum / count;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`Average safety rating: ${average.toFixed(1)} / 5 (${count} rating${count === 1 ? "" : "s"})`}
    >
      <span className="inline-flex">
        {/* Each star clips its OWN gold overlay to that star's fill fraction, rather than
            clipping one gold overlay across the whole 5-star row by a row-wide percentage
            — the row-wide version rendered as extra stray stars instead of a clean
            partial fill. */}
        {[0, 1, 2, 3, 4].map((i) => {
          const starFillPercent = Math.max(0, Math.min(1, average - i)) * 100;
          return (
            <span key={i} className="relative inline-flex">
              <Icons.star className={cn(starSize[size], "fill-current text-muted-foreground/30")} />
              <span
                className="absolute inset-0 overflow-hidden text-vy-star"
                style={{ width: `${starFillPercent}%` }}
              >
                <Icons.star className={cn(starSize[size], "fill-current")} />
              </span>
            </span>
          );
        })}
      </span>
      <span className="text-xs text-muted-foreground">
        {average.toFixed(1)} ({count})
      </span>
    </span>
  );
}
