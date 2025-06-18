
import type { Timestamp } from "firebase/firestore";

export interface Club {
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  } | null; // GeoPoint can be null
  currentCount: number; // This will represent the live count on the dashboard, derived from heartbeats. Admins might set a base/manual value.
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

// The 'visits' collection will now store heartbeat data.
// Document ID in 'visits' collection will be the deviceId.
export interface HeartbeatEntry {
  clubId: string;
  location: { lat: number; lng: number }; // User's location at the time of heartbeat
  lastSeen: Timestamp; // Firestore Timestamp of the last heartbeat
  // userId?: string; // Optional: if Firebase Auth was used
}

// This type might be used if fetching heartbeat entries with their deviceId (doc ID)
export interface HeartbeatEntryWithId extends HeartbeatEntry {
  deviceId: string;
}


// NOTE: The previous Visit / VisitWithId types for detailed visit logging (entry/exit)
// are removed as the 'visits' collection is being repurposed for heartbeats.
// If historical visit logging is needed for analytics, a separate collection and logic
// would be required.

export type ClubStatus = "low" | "moderate" | "packed" | "over-packed" | "unknown";

// For client-side location state
export interface UserLocation {
  lat: number;
  lng: number;
}
