
"use server";

import { adminFirestore } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { verifyUserIdToken, verifyAdminIdToken } from "@/lib/serverAuth";
import { z } from "zod";

// Same 18+ floor as the full Meet Me profile (ProfileInputSchema below) — kept
// consistent since both write the same users/{uid}.age field.
const AccountAgeSchema = z.number().int().min(18).max(120);

const ProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  photoUrl: z.string().url().nullable(),
  // 18+ is enforced here, not just suggested client-side, since this profile now
  // explicitly supports expressing romantic ("love") intent to other users.
  age: z.number().int().min(18).max(120),
  gender: z.enum(["man", "woman", "non-binary"]),
  // Just an initial default — every check-in reconfirms this via optInMeetMeAction,
  // since what someone's looking for can (and does) change venue to venue.
  lookingFor: z.enum(["friends", "love"]),
});

export async function saveProfileAction(
  idToken: string,
  data: {
    displayName: string;
    photoUrl: string | null;
    age: number;
    gender: string;
    lookingFor: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const validation = ProfileInputSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || "Invalid profile submission." };
  }

  try {
    const userRef = adminFirestore.collection("users").doc(authCheck.uid);
    const now = Timestamp.now();
    const existing = await userRef.get();
    await userRef.set(
      {
        displayName: validation.data.displayName,
        photoUrl: validation.data.photoUrl,
        age: validation.data.age,
        gender: validation.data.gender,
        lookingFor: validation.data.lookingFor,
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

/**
 * Lightweight, standalone age capture for ANY signed-in user — not gated
 * behind the full Meet Me profile (displayName/gender/lookingFor). Lets the
 * app-wide age prompt (AgePromptDialog) merge just this one field onto
 * users/{uid}, which composes with saveProfileAction later: a user who
 * answers this and later opts into Meet Me won't be asked for age again.
 */
export async function saveAccountAgeAction(
  idToken: string,
  age: number
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const validation = AccountAgeSchema.safeParse(age);
  if (!validation.success) {
    return { success: false, error: "Please enter a valid age (18+)." };
  }

  try {
    await adminFirestore.collection("users").doc(authCheck.uid).set(
      { age: validation.data, updatedAt: Timestamp.now() },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error("Error saving account age:", error);
    return { success: false, error: error.message || "Failed to save age." };
  }
}

/**
 * Records that the user dismissed the age prompt so it doesn't reappear on
 * every session — a permanent skip, not a snooze.
 */
export async function skipAccountAgeAction(idToken: string): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  try {
    await adminFirestore.collection("users").doc(authCheck.uid).set(
      { ageSkipped: true, updatedAt: Timestamp.now() },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error("Error skipping account age prompt:", error);
    return { success: false, error: error.message || "Failed to save." };
  }
}

/**
 * Batch-fetches on-file ages for a set of uids, for the admin analytics
 * dashboard's age-distribution chart. Uids with no on-file age are simply
 * omitted from the result, not zero-filled.
 */
export async function getAgesForUids(idToken: string, uids: string[]): Promise<Record<string, number>> {
  const authCheck = await verifyAdminIdToken(idToken);
  if (!authCheck.ok) {
    console.warn("getAgesForUids: unauthorized caller.", authCheck.error);
    return {};
  }

  if (!adminFirestore || uids.length === 0) return {};

  const uniqueUids = Array.from(new Set(uids));

  try {
    const refs = uniqueUids.map((uid) => adminFirestore!.collection("users").doc(uid));
    const snaps = await adminFirestore.getAll(...refs);
    const result: Record<string, number> = {};
    snaps.forEach((snap, i) => {
      const age = snap.data()?.age;
      if (snap.exists && typeof age === "number") {
        result[uniqueUids[i]] = age;
      }
    });
    return result;
  } catch (error) {
    console.error("Error fetching ages for uids:", error);
    return {};
  }
}

const SignupProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  // Same 18+ floor as the rest of the app — this is also the first place that
  // floor is actually enforced for a plain email/password sign-up, not just Meet Me.
  age: z.number().int().min(18).max(120),
  gender: z.enum(["man", "woman", "non-binary"]).optional(),
});

/**
 * Persists the name/age/gender collected on the manual (non-Google) sign-up
 * form to users/{uid}. Google sign-ups don't call this — Google already
 * supplies a display name, and age/gender there are instead picked up later
 * via the existing account-level AgePromptDialog / Meet Me profile setup.
 * Deliberately reuses the same fields saveProfileAction writes (displayName,
 * age, gender, blockedUids, createdAt) so this composes for free with Meet Me:
 * a user who filled this in at sign-up won't be asked for age again, and only
 * needs a photo + looking-for to complete a full Meet Me profile later.
 */
export async function saveSignupProfileAction(
  idToken: string,
  data: { displayName: string; age: number; gender?: string }
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const validation = SignupProfileSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || "Invalid sign-up details." };
  }

  try {
    const userRef = adminFirestore.collection("users").doc(authCheck.uid);
    const now = Timestamp.now();
    const existing = await userRef.get();
    await userRef.set(
      {
        displayName: validation.data.displayName,
        age: validation.data.age,
        ...(validation.data.gender ? { gender: validation.data.gender } : {}),
        blockedUids: existing.exists ? existing.data()?.blockedUids ?? [] : [],
        createdAt: existing.exists ? existing.data()?.createdAt ?? now : now,
        updatedAt: now,
      },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error("Error saving sign-up profile:", error);
    return { success: false, error: error.message || "Failed to save profile." };
  }
}

/**
 * Records that the signed-in user has agreed to the Terms of Service, with a
 * timestamp — the checkbox alone proves nothing later without a persisted
 * record of who agreed and when. Called right after the account-creation
 * paths that actually required ticking the box (manual sign-up, and a
 * first-time Google sign-in reached from the Sign Up tab).
 */
export async function recordTermsAcceptanceAction(idToken: string): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  try {
    await adminFirestore.collection("users").doc(authCheck.uid).set(
      { termsAcceptedAt: Timestamp.now() },
      { merge: true }
    );
    return { success: true };
  } catch (error: any) {
    console.error("Error recording terms acceptance:", error);
    return { success: false, error: error.message || "Failed to save." };
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
