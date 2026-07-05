
"use server";

import { revalidatePath } from "next/cache";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { verifyAdminIdToken } from "@/lib/serverAuth";
import type { Club, HeartbeatEntry } from "@/types";
import { z } from "zod";
import { parseCommaSeparatedString } from "@/lib/utils";

const ClubSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).nullable(),
  currentCount: z.coerce.number().min(0).default(0), // This is the admin-set base/manual count
  capacityThresholds: z.object({
    low: z.number().min(0),
    moderate: z.number().min(0),
    packed: z.number().min(0),
  }),
  imageUrl: z.string().url().optional().or(z.literal('')),
  estimatedWaitTime: z.string().optional().or(z.literal('')),
  tags: z.string().optional().transform(val => parseCommaSeparatedString(val)),
  musicGenres: z.string().optional().transform(val => parseCommaSeparatedString(val)),
  tonightDJ: z.string().optional().or(z.literal('')),
  announcementMessage: z.string().optional().or(z.literal('')),
  announcementExpiresAt: z.string().optional().nullable().transform(val => {
    if (!val) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
  }),
});

export async function addClubAction(idToken: string, formData: FormData) {
  const authCheck = await verifyAdminIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const rawData = {
    name: formData.get("name"),
    address: formData.get("address"),
    location: {
      lat: parseFloat(formData.get("latitude") as string || "0"),
      lng: parseFloat(formData.get("longitude") as string || "0"),
    },
    currentCount: parseInt(formData.get("currentCount") as string || "0", 10),
    capacityThresholds: {
      low: parseInt(formData.get("thresholdLow") as string || "0", 10),
      moderate: parseInt(formData.get("thresholdModerate") as string || "0", 10),
      packed: parseInt(formData.get("thresholdPacked") as string || "0", 10),
    },
    imageUrl: formData.get("imageUrl"),
    estimatedWaitTime: formData.get("estimatedWaitTime"),
    tags: formData.get("tags"),
    musicGenres: formData.get("musicGenres"),
    tonightDJ: formData.get("tonightDJ"),
    announcementMessage: formData.get("announcementMessage"),
    announcementExpiresAt: formData.get("announcementExpiresAt") as string | null,
  };

  if (isNaN(rawData.location.lat) || isNaN(rawData.location.lng)) {
    rawData.location = null as any;
  }

  const validation = ClubSchema.safeParse(rawData);

  if (!validation.success) {
    return {
      success: false,
      error: "Validation failed.",
      errors: validation.error.flatten().fieldErrors
    };
  }

  const clubDataValidated = validation.data;

  const clubDataForFirestore: Omit<Club, 'lastUpdated' | 'announcementExpiresAt'> & { lastUpdated: Timestamp; announcementExpiresAt: Timestamp | null } = {
    name: clubDataValidated.name,
    address: clubDataValidated.address,
    location: clubDataValidated.location,
    currentCount: clubDataValidated.currentCount, // Admin-set base count
    capacityThresholds: clubDataValidated.capacityThresholds,
    imageUrl: clubDataValidated.imageUrl || '',
    estimatedWaitTime: clubDataValidated.estimatedWaitTime || '',
    tags: clubDataValidated.tags || [],
    musicGenres: clubDataValidated.musicGenres || [],
    tonightDJ: clubDataValidated.tonightDJ || '',
    announcementMessage: clubDataValidated.announcementMessage || '',
    announcementExpiresAt: clubDataValidated.announcementExpiresAt,
    lastUpdated: Timestamp.now(),
  };

  try {
    await adminFirestore.collection("clubs").add(clubDataForFirestore);
    revalidatePath("/admin/clubs");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to add club."
    };
  }
}

export async function updateClubAction(idToken: string, clubId: string, formData: FormData) {
  const authCheck = await verifyAdminIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const rawData = {
    name: formData.get("name"),
    address: formData.get("address"),
    location: {
      lat: parseFloat(formData.get("latitude") as string || "0"),
      lng: parseFloat(formData.get("longitude") as string || "0"),
    },
    currentCount: parseInt(formData.get("currentCount") as string || "0", 10),
    capacityThresholds: {
      low: parseInt(formData.get("thresholdLow") as string || "0", 10),
      moderate: parseInt(formData.get("thresholdModerate") as string || "0", 10),
      packed: parseInt(formData.get("thresholdPacked") as string || "0", 10),
    },
    imageUrl: formData.get("imageUrl"),
    estimatedWaitTime: formData.get("estimatedWaitTime"),
    tags: formData.get("tags"),
    musicGenres: formData.get("musicGenres"),
    tonightDJ: formData.get("tonightDJ"),
    announcementMessage: formData.get("announcementMessage"),
    announcementExpiresAt: formData.get("announcementExpiresAt") as string | null,
  };

  if (isNaN(rawData.location.lat) || isNaN(rawData.location.lng)) {
    rawData.location = null as any;
  }

  const validation = ClubSchema.safeParse(rawData);

  if (!validation.success) {
    return {
      success: false,
      error: "Validation failed.",
      errors: validation.error.flatten().fieldErrors
    };
  }

  const clubDataValidated = validation.data;

  const clubDataForFirestore: Partial<Omit<Club, 'lastUpdated' | 'announcementExpiresAt'>> & { lastUpdated: Timestamp; announcementExpiresAt: Timestamp | null } = {
    name: clubDataValidated.name,
    address: clubDataValidated.address,
    location: clubDataValidated.location,
    currentCount: clubDataValidated.currentCount, // Admin-set base count
    capacityThresholds: clubDataValidated.capacityThresholds,
    imageUrl: clubDataValidated.imageUrl || '',
    estimatedWaitTime: clubDataValidated.estimatedWaitTime || '',
    tags: clubDataValidated.tags || [],
    musicGenres: clubDataValidated.musicGenres || [],
    tonightDJ: clubDataValidated.tonightDJ || '',
    announcementMessage: clubDataValidated.announcementMessage || '',
    announcementExpiresAt: clubDataValidated.announcementExpiresAt,
    lastUpdated: Timestamp.now(),
  };

  try {
    await adminFirestore.collection("clubs").doc(clubId).update(clubDataForFirestore);
    revalidatePath("/admin/clubs");
    revalidatePath(`/admin/clubs/edit/${clubId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update club."
    };
  }
}

export async function deleteClubAction(idToken: string, clubId: string) {
  const authCheck = await verifyAdminIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  try {
    await adminFirestore.collection("clubs").doc(clubId).delete();
    revalidatePath("/admin/clubs");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete club."
    };
  }
}

function isTimestampLike(value: any): value is { toDate: () => Date } {
  return value && typeof value.toDate === "function";
}

const convertClubTimestamps = (data: any): Omit<Club, 'lastUpdated' | 'announcementExpiresAt'> & { lastUpdated: string, announcementExpiresAt: string | null } => {
  return {
    ...data,
    lastUpdated: isTimestampLike(data.lastUpdated) ? data.lastUpdated.toDate().toISOString() : new Date(data.lastUpdated).toISOString(),
    announcementExpiresAt: data.announcementExpiresAt
      ? (isTimestampLike(data.announcementExpiresAt) ? data.announcementExpiresAt.toDate().toISOString() : new Date(data.announcementExpiresAt).toISOString())
      : null,
  };
};

export async function getClubById(clubId: string): Promise<Club | null> {
  if (!adminFirestore) {
    console.error("Firestore admin not initialized.");
    return null;
  }
  try {
    const clubSnap = await adminFirestore.collection("clubs").doc(clubId).get();

    if (clubSnap.exists) {
      const data = clubSnap.data();
      const clubWithConvertedTimestamps = convertClubTimestamps(data);
      return {
        id: clubSnap.id,
        ...clubWithConvertedTimestamps,
      } as Club; // Casting as Club, client will merge live count
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching club by ID:", error);
    return null;
  }
}

/**
 * Derives live crowd counts for all clubs based on recent heartbeats.
 * @returns A Promise resolving to an object mapping clubId to its live count.
 */
export async function getLiveClubCounts(): Promise<Record<string, number>> {
  if (!adminFirestore) {
    console.warn("Firestore admin not initialized in getLiveClubCounts. Returning empty counts.");
    return {};
  }

  const liveCounts: Record<string, number> = {};
  const fiveAndHalfMinutesAgo = Timestamp.fromMillis(Date.now() - 5.5 * 60 * 1000);

  try {
    const querySnapshot = await adminFirestore
      .collection('visits')
      .where('lastSeen', '>=', fiveAndHalfMinutesAgo)
      .get();

    querySnapshot.forEach((docSnap) => {
      const visitData = docSnap.data() as Partial<HeartbeatEntry>; // Partial because deviceId is doc ID
      if (visitData.clubId) {
        liveCounts[visitData.clubId] = (liveCounts[visitData.clubId] || 0) + 1;
      }
    });
    return liveCounts;
  } catch (error) {
    console.error('Error fetching live club counts:', error);
    return {}; // Return empty or cached counts on error
  }
}

export interface HeartbeatRecord {
  deviceId: string;
  clubId: string;
  lastSeen: string; // ISO string
}

/**
 * Fetches heartbeats recorded since the given timestamp, for the admin-only analytics
 * dashboard (hourly/daily breakdowns, new-vs-returning device counts, etc.). Requires
 * admin verification since it returns raw per-device presence data.
 */
export async function getRecentHeartbeats(idToken: string, sinceMillis: number): Promise<HeartbeatRecord[]> {
  const authCheck = await verifyAdminIdToken(idToken);
  if (!authCheck.ok) {
    console.warn("getRecentHeartbeats: unauthorized caller.", authCheck.error);
    return [];
  }

  if (!adminFirestore) {
    console.warn("Firestore admin not initialized in getRecentHeartbeats. Returning empty list.");
    return [];
  }

  try {
    const querySnapshot = await adminFirestore
      .collection('visits')
      .where('lastSeen', '>=', Timestamp.fromMillis(sinceMillis))
      .get();

    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Partial<HeartbeatEntry>;
      const lastSeen = isTimestampLike(data.lastSeen) ? data.lastSeen.toDate().toISOString() : new Date().toISOString();
      return {
        deviceId: docSnap.id,
        clubId: data.clubId || "",
        lastSeen,
      };
    });
  } catch (error) {
    console.error('Error fetching recent heartbeats:', error);
    return [];
  }
}
