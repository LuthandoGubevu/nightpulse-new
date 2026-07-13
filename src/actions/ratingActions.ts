
"use server";

import { adminFirestore } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { verifyUserIdToken } from "@/lib/serverAuth";
import { z } from "zod";

const RatingInputSchema = z.object({
  clubId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
});

export async function submitSafetyRatingAction(idToken: string, clubId: string, rating: number) {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const validation = RatingInputSchema.safeParse({ clubId, rating });
  if (!validation.success) {
    return { success: false, error: "Invalid rating submission." };
  }

  const clubRef = adminFirestore.collection("clubs").doc(validation.data.clubId);
  const voteRef = clubRef.collection("safetyRatings").doc(authCheck.uid);

  try {
    await adminFirestore.runTransaction(async (tx) => {
      // All reads must precede all writes in a Firestore transaction.
      const [clubSnap, voteSnap] = await Promise.all([tx.get(clubRef), tx.get(voteRef)]);
      if (!clubSnap.exists) {
        throw new Error("Club not found.");
      }

      const prevSum = (clubSnap.data()?.safetyRatingSum as number) ?? 0;
      const prevCount = (clubSnap.data()?.safetyRatingCount as number) ?? 0;
      const prevRating = voteSnap.exists ? ((voteSnap.data()?.rating as number) ?? null) : null;

      const newSum = prevRating !== null
        ? prevSum - prevRating + validation.data.rating
        : prevSum + validation.data.rating;
      const newCount = prevRating !== null ? prevCount : prevCount + 1;

      tx.set(voteRef, { rating: validation.data.rating, updatedAt: Timestamp.now() });
      tx.update(clubRef, { safetyRatingSum: newSum, safetyRatingCount: newCount });
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error submitting safety rating:", error);
    return { success: false, error: error.message || "Failed to submit rating." };
  }
}

/** Batched read of the calling user's own safety-rating votes across every visible club. */
export async function getMyRatingsAction(idToken: string, clubIds: string[]): Promise<Record<string, number>> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok || !adminFirestore || clubIds.length === 0) return {};

  try {
    const refs = clubIds.map((id) =>
      adminFirestore!.collection("clubs").doc(id).collection("safetyRatings").doc(authCheck.uid)
    );
    const snaps = await adminFirestore.getAll(...refs);
    const result: Record<string, number> = {};
    snaps.forEach((snap, i) => {
      const rating = snap.data()?.rating;
      if (snap.exists && typeof rating === "number") {
        result[clubIds[i]] = rating;
      }
    });
    return result;
  } catch (error) {
    console.error("Error fetching user's safety ratings:", error);
    return {};
  }
}
