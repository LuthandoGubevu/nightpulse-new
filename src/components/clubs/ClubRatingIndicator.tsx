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
  const fillPercent = (Math.max(0, Math.min(5, average)) / 5) * 100;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`Average safety rating: ${average.toFixed(1)} / 5 (${count} rating${count === 1 ? "" : "s"})`}
    >
      <span className="relative inline-flex">
        <span className="flex text-muted-foreground/30">
          {[0, 1, 2, 3, 4].map((i) => (
            <Icons.star key={i} className={cn(starSize[size], "fill-current")} />
          ))}
        </span>
        <span
          className="absolute inset-0 flex overflow-hidden text-amber-400"
          style={{ width: `${fillPercent}%` }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Icons.star key={i} className={cn(starSize[size], "fill-current")} />
          ))}
        </span>
      </span>
      <span className="text-xs text-muted-foreground">
        {average.toFixed(1)} ({count})
      </span>
    </span>
  );
}
