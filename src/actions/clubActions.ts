
"use server";

import { revalidatePath } from "next/cache";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { verifyAdminIdToken } from "@/lib/serverAuth";
import type { Club, ClubWithId, HeartbeatEntry } from "@/types";
import { z } from "zod";
import { parseCommaSeparatedString, getClubStatus } from "@/lib/utils";

const DEFAULT_CAPACITY_THRESHOLDS = { low: 50, moderate: 100, packed: 150 };

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

  // currentCount/capacityThresholds never land on the public clubs/{clubId} doc — see
  // firestore.rules — only the derived status does. The raw values go to the
  // Admin-SDK-only private/capacity subdoc below.
  const clubDataForFirestore: Omit<Club, 'lastUpdated' | 'announcementExpiresAt' | 'currentCount' | 'capacityThresholds'> & { lastUpdated: Timestamp; announcementExpiresAt: Timestamp | null } = {
    name: clubDataValidated.name,
    address: clubDataValidated.address,
    location: clubDataValidated.location,
    status: getClubStatus(clubDataValidated.currentCount, clubDataValidated.capacityThresholds),
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
    const clubRef = adminFirestore.collection("clubs").doc();
    await clubRef.set(clubDataForFirestore);
    await clubRef.collection("private").doc("capacity").set({
      currentCount: clubDataValidated.currentCount,
      capacityThresholds: clubDataValidated.capacityThresholds,
    });
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

  // Same split as addClubAction: raw currentCount/capacityThresholds go to the private
  // subdoc; the public doc only ever gets the derived status. FieldValue.delete() also
  // scrubs the raw fields off any club still carrying them from before this change.
  const clubDataForFirestore: Partial<Omit<Club, 'lastUpdated' | 'announcementExpiresAt' | 'currentCount' | 'capacityThresholds'>> & { lastUpdated: Timestamp; announcementExpiresAt: Timestamp | null; currentCount: FieldValue; capacityThresholds: FieldValue } = {
    name: clubDataValidated.name,
    address: clubDataValidated.address,
    location: clubDataValidated.location,
    status: getClubStatus(clubDataValidated.currentCount, clubDataValidated.capacityThresholds),
    imageUrl: clubDataValidated.imageUrl || '',
    estimatedWaitTime: clubDataValidated.estimatedWaitTime || '',
    tags: clubDataValidated.tags || [],
    musicGenres: clubDataValidated.musicGenres || [],
    tonightDJ: clubDataValidated.tonightDJ || '',
    announcementMessage: clubDataValidated.announcementMessage || '',
    announcementExpiresAt: clubDataValidated.announcementExpiresAt,
    lastUpdated: Timestamp.now(),
    currentCount: FieldValue.delete(),
    capacityThresholds: FieldValue.delete(),
  };

  try {
    const clubRef = adminFirestore.collection("clubs").doc(clubId);
    await clubRef.update(clubDataForFirestore);
    await clubRef.collection("private").doc("capacity").set({
      currentCount: clubDataValidated.currentCount,
      capacityThresholds: clubDataValidated.capacityThresholds,
    }, { merge: true });
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
    const clubRef = adminFirestore.collection("clubs").doc(clubId);
    await clubRef.collection("private").doc("capacity").delete();
    await clubRef.delete();
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
    const clubRef = adminFirestore.collection("clubs").doc(clubId);
    const [clubSnap, capacitySnap] = await Promise.all([
      clubRef.get(),
      clubRef.collection("private").doc("capacity").get(),
    ]);

    if (!clubSnap.exists) return null;

    const data = clubSnap.data();
    const clubWithConvertedTimestamps = convertClubTimestamps(data);
    const capacityData = capacitySnap.exists ? capacitySnap.data() : undefined;

    return {
      id: clubSnap.id,
      ...clubWithConvertedTimestamps,
      // This function is only ever called from admin-gated pages (the edit form), so
      // merging the private capacity doc back in here is safe — see firestore.rules.
      currentCount: capacityData?.currentCount ?? 0,
      capacityThresholds: capacityData?.capacityThresholds ?? DEFAULT_CAPACITY_THRESHOLDS,
    } as Club;
  } catch (error) {
    console.error("Error fetching club by ID:", error);
    return null;
  }
}

/**
 * Admin-only club listing with the raw currentCount/capacityThresholds merged back in
 * from the private capacity subdoc — feeds the admin clubs table, which (unlike the
 * public dashboard) is allowed to show exact numbers.
 */
export async function getAdminClubList(idToken: string): Promise<ClubWithId[]> {
  const authCheck = await verifyAdminIdToken(idToken);
  if (!authCheck.ok) {
    console.warn("getAdminClubList: unauthorized caller.", authCheck.error);
    return [];
  }

  if (!adminFirestore) {
    console.warn("Firestore admin not initialized in getAdminClubList. Returning empty list.");
    return [];
  }

  try {
    const clubsSnap = await adminFirestore.collection("clubs").orderBy("name").get();
    const clubs = await Promise.all(
      clubsSnap.docs.map(async (doc) => {
        const capacitySnap = await doc.ref.collection("private").doc("capacity").get();
        const capacityData = capacitySnap.exists ? capacitySnap.data() : undefined;
        const clubWithConvertedTimestamps = convertClubTimestamps(doc.data());
        return {
          id: doc.id,
          ...clubWithConvertedTimestamps,
          currentCount: capacityData?.currentCount ?? 0,
          capacityThresholds: capacityData?.capacityThresholds ?? DEFAULT_CAPACITY_THRESHOLDS,
        } as ClubWithId;
      })
    );
    return clubs;
  } catch (error) {
    console.error("Error fetching admin club list:", error);
    return [];
  }
}

/**
 * One-time migration (Addendum 24): moves currentCount/capacityThresholds off any club
 * doc still carrying them from before the private-subcollection split into
 * clubs/{clubId}/private/capacity, and backfills the derived `status` field onto the
 * public doc. Safe to run more than once — a club with no legacy fields left on its main
 * doc is simply skipped. Triggered once from a button on the admin clubs page; no need
 * to keep re-running it after every existing club has been migrated.
 */
export async function migrateLegacyClubCapacityAction(
  idToken: string
): Promise<{ success: boolean; migrated?: number; error?: string }> {
  const authCheck = await verifyAdminIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  try {
    const clubsSnap = await adminFirestore.collection("clubs").get();
    let migrated = 0;

    for (const doc of clubsSnap.docs) {
      const data = doc.data();
      if (data.currentCount === undefined && data.capacityThresholds === undefined) continue;

      const currentCount = typeof data.currentCount === "number" ? data.currentCount : 0;
      const capacityThresholds = data.capacityThresholds ?? DEFAULT_CAPACITY_THRESHOLDS;

      await doc.ref.collection("private").doc("capacity").set({ currentCount, capacityThresholds }, { merge: true });
      await doc.ref.update({
        status: getClubStatus(currentCount, capacityThresholds),
        currentCount: FieldValue.delete(),
        capacityThresholds: FieldValue.delete(),
      });
      migrated++;
    }

    revalidatePath("/admin/clubs");
    revalidatePath("/");
    return { success: true, migrated };
  } catch (error: any) {
    return { success: false, error: error.message || "Migration failed." };
  }
}

/**
 * Derives live crowd counts for all clubs based on recent heartbeats. Admin-only: this
 * is exactly the kind of exact headcount club owners don't want reachable by the public
 * (see Addendum 24), so — like getRecentHeartbeats/getRecentVisitSessions below — it now
 * requires an admin-verified idToken. Its only caller is the admin analytics dashboard.
 * @returns A Promise resolving to an object mapping clubId to its live count.
 */
export async function getLiveClubCounts(idToken: string): Promise<Record<string, number>> {
  const authCheck = await verifyAdminIdToken(idToken);
  if (!authCheck.ok) {
    console.warn("getLiveClubCounts: unauthorized caller.", authCheck.error);
    return {};
  }

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

export interface VisitSessionRecord {
  id: string;
  deviceId: string;
  uid: string | null;
  clubId: string;
  firstSeen: string; // ISO string
  lastSeen: string; // ISO string
}

/**
 * Fetches discrete visit sessions (one per continuous stay, gap-separated —
 * see visitSessions writes in /api/heartbeat) active since the given time.
 * Used for average-dwell-time, corrected new-vs-returning, and age-distribution
 * analytics, which all need real per-visit history rather than the single
 * always-overwritten `visits/{deviceId}` doc that getRecentHeartbeats reads.
 */
export async function getRecentVisitSessions(idToken: string, sinceMillis: number): Promise<VisitSessionRecord[]> {
  const authCheck = await verifyAdminIdToken(idToken);
  if (!authCheck.ok) {
    console.warn("getRecentVisitSessions: unauthorized caller.", authCheck.error);
    return [];
  }

  if (!adminFirestore) {
    console.warn("Firestore admin not initialized in getRecentVisitSessions. Returning empty list.");
    return [];
  }

  try {
    const querySnapshot = await adminFirestore
      .collection('visitSessions')
      .where('lastSeen', '>=', Timestamp.fromMillis(sinceMillis))
      .get();

    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const firstSeen = isTimestampLike(data.firstSeen) ? data.firstSeen.toDate().toISOString() : new Date().toISOString();
      const lastSeen = isTimestampLike(data.lastSeen) ? data.lastSeen.toDate().toISOString() : new Date().toISOString();
      return {
        id: docSnap.id,
        deviceId: data.deviceId || "",
        uid: data.uid ?? null,
        clubId: data.clubId || "",
        firstSeen,
        lastSeen,
      };
    });
  } catch (error) {
    console.error('Error fetching recent visit sessions:', error);
    return [];
  }
}
