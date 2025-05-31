"use server";

import { revalidatePath } from "next/cache";
import { firestore } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, Timestamp, getDoc } from "firebase/firestore";
import type { Club } from "@/types";
import { z } from "zod";

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
  };
  
  // If lat/lng are not provided or invalid, set location to null
  if (isNaN(rawData.location.lat) || isNaN(rawData.location.lng)) {
    rawData.location = null as any; // Zod will handle nullable
  }

  const validation = ClubSchema.safeParse(rawData);

  if (!validation.success) {
    return { success: false, error: "Validation failed", errors: validation.error.flatten().fieldErrors };
  }
  
  const clubData: Omit<Club, 'lastUpdated'> & { lastUpdated: Timestamp } = {
    ...validation.data,
    lastUpdated: Timestamp.now(),
  };

  try {
    await addDoc(collection(firestore, "clubs"), clubData);
    revalidatePath("/admin/clubs");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error adding club:", error);
    return { success: false, error: "Failed to add club." };
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
  };

  if (isNaN(rawData.location.lat) || isNaN(rawData.location.lng)) {
    rawData.location = null as any;
  }
  
  const validation = ClubSchema.safeParse(rawData);

  if (!validation.success) {
    return { success: false, error: "Validation failed", errors: validation.error.flatten().fieldErrors };
  }

  const clubData: Partial<Omit<Club, 'lastUpdated'>> & { lastUpdated: Timestamp } = {
    ...validation.data,
    lastUpdated: Timestamp.now(),
  };

  try {
    const clubRef = doc(firestore, "clubs", clubId);
    await updateDoc(clubRef, clubData);
    revalidatePath("/admin/clubs");
    revalidatePath(`/admin/clubs/edit/${clubId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating club:", error);
    return { success: false, error: "Failed to update club." };
  }
}

export async function deleteClubAction(clubId: string) {
  if (!firestore) return { success: false, error: "Firestore not initialized" };
  try {
    await deleteDoc(doc(firestore, "clubs", clubId));
    revalidatePath("/admin/clubs");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting club:", error);
    return { success: false, error: "Failed to delete club." };
  }
}

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
      return {
        id: clubSnap.id,
        ...data,
        lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate().toISOString() : new Date().toISOString(),
      } as Club; // Type assertion, ensure data matches Club structure
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching club by ID:", error);
    return null;
  }
}
