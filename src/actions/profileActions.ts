
"use server";

import { adminFirestore } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { verifyUserIdToken } from "@/lib/serverAuth";
import { z } from "zod";

const ProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  photoUrl: z.string().url().nullable(),
});

export async function saveProfileAction(
  idToken: string,
  data: { displayName: string; photoUrl: string | null }
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const validation = ProfileInputSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "Invalid profile submission." };
  }

  try {
    const userRef = adminFirestore.collection("users").doc(authCheck.uid);
    const now = Timestamp.now();
    const existing = await userRef.get();
    await userRef.set(
      {
        displayName: validation.data.displayName,
        photoUrl: validation.data.photoUrl,
        blockedUids: existing.exists ? (existing.data()?.blockedUids ?? []) : [],
        createdAt: existing.exists ? existing.data()?.createdAt ?? now : now,
        updatedAt: now,
      },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error("Error saving profile:", error);
    return { success: false, error: error.message || "Failed to save profile." };
  }
}

export async function blockUserAction(
  idToken: string,
  blockedUid: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const validation = z.string().min(1).safeParse(blockedUid);
  if (!validation.success || validation.data === authCheck.uid) {
    return { success: false, error: "Invalid block target." };
  }

  try {
    await adminFirestore.collection("users").doc(authCheck.uid).set(
      {
        blockedUids: FieldValue.arrayUnion(validation.data),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error("Error blocking user:", error);
    return { success: false, error: error.message || "Failed to block user." };
  }
}
