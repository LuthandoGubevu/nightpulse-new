
import type { Timestamp } from "firebase/firestore";

export interface Club {
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  } | null; // GeoPoint can be null
  currentCount: number;
  capacityThresholds: {
    low: number;
    moderate: number;
    packed: number;
  };
  lastUpdated: Timestamp | Date | string; // Firestore Timestamp, Date object after fetch, or string
  imageUrl?: string; // Optional image URL for the club

  // New fields for user dashboard enhancements
  estimatedWaitTime?: string; // e.g., "10-15 min"
  tags?: string[]; // e.g., ["rooftop", "live dj", "free entry"]
  musicGenres?: string[]; // e.g., ["Afrobeats", "Amapiano", "Hip Hop"]
  tonightDJ?: string; // Name of the DJ playing tonight
  announcementMessage?: string; // A promotional message
  announcementExpiresAt?: Timestamp | Date | string | null; // Optional expiry for the announcement
}

export interface ClubWithId extends Club {
  id: string;
  // Client-side calculated fields
  distance?: number; // For nearby sorting
  isTrending?: boolean; // For trending display
}

export interface Visit {
  deviceId: string; // Hashed
  clubId: string;
  entryTimestamp: Timestamp | Date | string;
  exitTimestamp?: Timestamp | Date | string | null;
}

export interface VisitWithId extends Visit {
  id: string;
}

export type ClubStatus = "low" | "moderate" | "packed" | "over-packed" | "unknown";

// For client-side location state
export interface UserLocation {
  lat: number;
  lng: number;
}
