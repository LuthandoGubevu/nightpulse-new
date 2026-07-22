
import type { Timestamp } from "firebase/firestore";

export interface Club {
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  } | null; // GeoPoint can be null
  // Raw headcount + thresholds live in clubs/{clubId}/private/capacity (Admin-SDK-only —
  // see firestore.rules) so they're only ever present when fetched via an admin-verified
  // path (ClubForm, admin clubs table). Optional here because ordinary end-user reads of
  // a club never carry these fields at all.
  currentCount?: number;
  capacityThresholds?: {
    low: number;
    moderate: number;
    packed: number;
  };
  // Public-safe derived status (see getClubStatus) — the only capacity signal exposed to
  // non-admin clients. Computed and written server-side whenever currentCount/thresholds
  // change (see addClubAction/updateClubAction).
  status?: ClubStatus;
  lastUpdated: Timestamp | Date | string; // Firestore Timestamp, Date object after fetch, or string
  imageUrl?: string; // Optional image URL for the club

  // New fields for user dashboard enhancements
  estimatedWaitTime?: string; // e.g., "10-15 min"
  tags?: string[]; // e.g., ["rooftop", "live dj", "free entry"]
  musicGenres?: string[]; // e.g., ["Afrobeats", "Amapiano", "Hip Hop"]
  tonightDJ?: string; // Name of the DJ playing tonight
  announcementMessage?: string; // A promotional message
  announcementExpiresAt?: Timestamp | Date | string | null; // Optional expiry for the announcement

  // Safety rating aggregate — average is derived (sum/count) at render time, never stored
  safetyRatingSum?: number;
  safetyRatingCount?: number;
}

export interface ClubWithId extends Club {
  id: string;
  // Client-side calculated fields
  distance?: number; // For nearby sorting
  isTrending?: boolean; // For trending display
  myRating?: number | null; // This signed-in user's own safety-rating vote, if any
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

// "Meet Me" feature — user profile, presence, matching, and chat.

export type Gender = "man" | "woman" | "non-binary";
// What someone's checked in for at THIS venue right now — reconfirmed at every
// check-in (see optInMeetMeAction), not a permanent identity attribute like gender.
export type LookingFor = "friends" | "love";

export interface UserProfile {
  displayName: string;
  photoUrl: string | null;
  age: number;
  gender: Gender;
  lookingFor: LookingFor; // last choice made at any check-in; only a pre-fill default
  blockedUids: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// clubs/{clubId}/meetMePresence/{uid} — a snapshot of the user's profile taken at
// opt-in time, not a live join, so the discovery list doesn't need N extra reads.
export interface MeetMePresence {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  age: number;
  gender: Gender;
  lookingFor: LookingFor;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface MeetMePresenceWithId extends MeetMePresence {
  id: string; // == uid
}

// interests/{clubId}_{fromUid}_{toUid}
export interface Interest {
  clubId: string;
  fromUid: string;
  toUid: string;
  createdAt: Timestamp;
}

// conversations/{conversationId}, id = sorted uid pair "{uidA}_{uidB}"
export interface Conversation {
  participantUids: [string, string];
  clubId: string;
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  lastMessageText: string;
}

export interface ConversationWithId extends Conversation {
  id: string;
}

export interface ChatMessage {
  senderUid: string;
  text: string;
  createdAt: Timestamp;
}

export interface ChatMessageWithId extends ChatMessage {
  id: string;
}

export interface Report {
  reporterUid: string;
  reportedUid: string;
  clubId: string | null;
  conversationId: string | null;
  reason: string;
  createdAt: Timestamp;
  status: "open";
}
