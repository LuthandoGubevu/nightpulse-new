import { cn } from "@/lib/utils";
import type { ClubStatus } from "@/types";

interface ClubStatusIndicatorProps {
  status: ClubStatus;
  size?: "sm" | "md" | "lg";
}

const statusColors: Record<ClubStatus, string> = {
  low: "bg-status-green",
  moderate: "bg-status-yellow",
  packed: "bg-status-orange",
  "over-packed": "bg-status-red",
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
