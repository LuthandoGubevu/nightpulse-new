
"use server";

import { revalidatePath } from "next/cache";
import { firestore } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, Timestamp, getDoc } from "firebase/firestore";
import type { Club } from "@/types";
import { z } from "zod";
import { parseCommaSeparatedString } from "@/lib/utils";

const ClubSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).nullable(),
  currentCount: z.number().min(0).default(0),
  capacityThresholds: z.object({
    low: z.number().min(0),
    moderate: z.number().min(0),
    packed: z.number().min(0),
  }),
  imageUrl: z.string().url().optional().or(z.literal('')),
  estimatedWaitTime: z.string().optional().or(z.literal('')),
  tags: z.string().optional().transform(val => parseCommaSeparatedString(val)), // Comma-separated string from form
  musicGenres: z.string().optional().transform(val => parseCommaSeparatedString(val)), // Comma-separated string from form
  tonightDJ: z.string().optional().or(z.literal('')),
  announcementMessage: z.string().optional().or(z.literal('')),
  announcementExpiresAt: z.string().optional().nullable().transform(val => { // Expecting a string that can be converted to Date
    if (!val) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
  }),
});

export async function addClubAction(formData: FormData) {
  if (!firestore) return { success: false, error: "Firestore not initialized" };
  
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
    console.error("Validation errors:", validation.error.flatten().fieldErrors);
    return { 
      success: false, 
      error: "Validation failed. Please check the form fields.", 
      errors: validation.error.flatten().fieldErrors 
    };
  }
  
  const clubDataValidated = validation.data;

  // Explicitly structure the data for Firestore, especially for Timestamp
  const clubDataForFirestore: Omit<Club, 'lastUpdated'> & { lastUpdated: Timestamp } = {
    name: clubDataValidated.name,
    address: clubDataValidated.address,
    location: clubDataValidated.location,
    currentCount: clubDataValidated.currentCount,
    capacityThresholds: clubDataValidated.capacityThresholds,
    imageUrl: clubDataValidated.imageUrl || '',
    estimatedWaitTime: clubDataValidated.estimatedWaitTime || '',
    tags: clubDataValidated.tags || [],
    musicGenres: clubDataValidated.musicGenres || [],
    tonightDJ: clubDataValidated.tonightDJ || '',
    announcementMessage: clubDataValidated.announcementMessage || '',
    announcementExpiresAt: clubDataValidated.announcementExpiresAt, // Already a Timestamp or null from Zod transform
    lastUpdated: Timestamp.now(),
  };

  try {
    await addDoc(collection(firestore, "clubs"), clubDataForFirestore);
    revalidatePath("/admin/clubs");
    revalidatePath("/"); // For user dashboard
    return { success: true };
  } catch (error: any) {
    console.error("Error adding club to Firestore:", error);
    return { 
      success: false, 
      error: error.message || "Failed to add club. Check server logs for details." 
    };
  }
}

export async function updateClubAction(clubId: string, formData: FormData) {
  if (!firestore) return { success: false, error: "Firestore not initialized" };

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
    console.error("Validation errors:", validation.error.flatten().fieldErrors);
    return { 
      success: false, 
      error: "Validation failed. Please check the form fields.", 
      errors: validation.error.flatten().fieldErrors 
    };
  }

  const clubDataValidated = validation.data;

  const clubDataForFirestore: Partial<Omit<Club, 'lastUpdated'>> & { lastUpdated: Timestamp } = {
    name: clubDataValidated.name,
    address: clubDataValidated.address,
    location: clubDataValidated.location,
    currentCount: clubDataValidated.currentCount,
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
    const clubRef = doc(firestore, "clubs", clubId);
    await updateDoc(clubRef, clubDataForFirestore);
    revalidatePath("/admin/clubs");
    revalidatePath(`/admin/clubs/edit/${clubId}`);
    revalidatePath("/"); // For user dashboard
    return { success: true };
  } catch (error: any) {
    console.error("Error updating club in Firestore:", error);
    return { 
      success: false, 
      error: error.message || "Failed to update club. Check server logs for details." 
    };
  }
}

export async function deleteClubAction(clubId: string) {
  if (!firestore) return { success: false, error: "Firestore not initialized" };
  try {
    await deleteDoc(doc(firestore, "clubs", clubId));
    revalidatePath("/admin/clubs");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting club from Firestore:", error);
    return { 
      success: false, 
      error: error.message || "Failed to delete club. Check server logs for details." 
    };
  }
}

// Helper function to convert Firestore Timestamps in club data if necessary
const convertClubTimestamps = (data: any): Omit<Club, 'lastUpdated' | 'announcementExpiresAt'> & { lastUpdated: string, announcementExpiresAt: string | null } => {
  return {
    ...data,
    lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate().toISOString() : new Date(data.lastUpdated).toISOString(),
    announcementExpiresAt: data.announcementExpiresAt ? 
      (data.announcementExpiresAt instanceof Timestamp ? data.announcementExpiresAt.toDate().toISOString() : new Date(data.announcementExpiresAt).toISOString()) 
      : null,
  };
};


export async function getClubById(clubId: string): Promise<Club | null> {
  if (!firestore) {
    console.error("Firestore not initialized.");
    return null;
  }
  try {
    const clubRef = doc(firestore, "clubs", clubId);
    const clubSnap = await getDoc(clubRef);

    if (clubSnap.exists()) {
      const data = clubSnap.data();
      const clubWithConvertedTimestamps = convertClubTimestamps(data);
      return {
        id: clubSnap.id,
        ...clubWithConvertedTimestamps,
      } as Club;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching club by ID:", error);
    return null;
  }
}
