
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
  } else if (currentCount <= thresholds.packed) { 
    return "packed";
  } else {
    return "over-packed"; 
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

/**
 * Calculates the distance between two geographical coordinates using the Haversine formula.
 * @param lat1 Latitude of the first point.
 * @param lon1 Longitude of the first point.
 * @param lat2 Latitude of the second point.
 * @param lon2 Longitude of the second point.
 * @returns The distance in kilometers.
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

// Helper to parse comma-separated strings into an array of strings
export const parseCommaSeparatedString = (str: string | undefined | null): string[] => {
  if (!str || typeof str !== 'string') return [];
  return str.split(',').map(item => item.trim()).filter(item => item.length > 0);
};
