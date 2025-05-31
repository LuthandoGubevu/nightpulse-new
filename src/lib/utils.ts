import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ClubStatus, Club } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getClubStatus(
  currentCount: number,
  thresholds: Club["capacityThresholds"]
): ClubStatus {
  if (typeof currentCount !== 'number' || !thresholds) return "unknown";

  if (currentCount <= thresholds.low) {
    return "low";
  } else if (currentCount <= thresholds.moderate) {
    return "moderate";
  } else if (currentCount <= thresholds.packed) { // Assuming 'packed' is the upper threshold for moderate
    return "packed";
  } else {
    return "over-packed"; // Anything above 'packed' threshold
  }
}

export function formatDate(date: Date | string | number | undefined | null): string {
  if (!date) return "N/A";
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "Invalid Date";
  }
}
