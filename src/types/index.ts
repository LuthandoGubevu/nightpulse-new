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
    packed: number; // Represents upper limit of moderate, anything above is 'packed' or 'over-packed'
  };
  lastUpdated: Timestamp | Date | string; // Firestore Timestamp, Date object after fetch, or string
  imageUrl?: string; // Optional image URL for the club
}

export interface ClubWithId extends Club {
  id: string;
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
