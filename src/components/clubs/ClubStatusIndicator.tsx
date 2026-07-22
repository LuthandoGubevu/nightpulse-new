import { cn } from "@/lib/utils";
import type { ClubStatus } from "@/types";

interface ClubStatusIndicatorProps {
  status: ClubStatus;
  size?: "sm" | "md" | "lg";
}

// Inverted from a typical safety traffic-light: for this app a full, high-energy club
// is the desirable outcome, not a dangerous one, so red marks a quiet club and green
// marks a packed one (Addendum 24).
const statusColors: Record<ClubStatus, string> = {
  low: "bg-status-red",
  moderate: "bg-status-yellow",
  packed: "bg-status-orange",
  "over-packed": "bg-status-green",
  unknown: "bg-muted",
};

const statusSize = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
}

export function ClubStatusIndicator({ status, size = "md" }: ClubStatusIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        statusColors[status] || "bg-muted",
        statusSize[size]
      )}
      title={`Status: ${status.replace("-", " ")}`}
    />
  );
}
