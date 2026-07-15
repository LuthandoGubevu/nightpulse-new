
"use server";

import { adminFirestore } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { verifyUserIdToken } from "@/lib/serverAuth";
import { z } from "zod";

const PRESENCE_LIFETIME_MS = 4 * 60 * 60 * 1000; // 4 hours — a typical night out

const ClubIdSchema = z.string().min(1);

const OptInInputSchema = z.object({
  clubId: z.string().min(1),
  // Reconfirmed at every check-in rather than read from the stored profile — someone
  // looking for love at one venue may just be looking for friends at the next one, and
  // the app shouldn't silently assume otherwise.
  lookingFor: z.enum(["friends", "love"]),
});

export async function optInMeetMeAction(
  idToken: string,
  clubId: string,
  lookingFor: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const validation = OptInInputSchema.safeParse({ clubId, lookingFor });
  if (!validation.success) return { success: false, error: "Invalid request." };

  try {
    const userRef = adminFirestore.collection("users").doc(authCheck.uid);
    const profileSnap = await userRef.get();
    const profile = profileSnap.data();
    // Only the stable identity fields gate whether setup is required — lookingFor is
    // supplied fresh on every call, so it's never part of this completeness check.
    const hasCoreProfile =
      profileSnap.exists && !!profile?.displayName && typeof profile?.age === "number" && !!profile?.gender;
    if (!hasCoreProfile) {
      return { success: false, error: "Profile required" };
    }

    const now = Timestamp.now();
    // Persist this check-in's choice as next time's pre-filled default — convenience
    // only, never silently reused without the user confirming it again.
    await userRef.set({ lookingFor: validation.data.lookingFor, updatedAt: now }, { merge: true });

    await adminFirestore
      .collection("clubs")
      .doc(validation.data.clubId)
      .collection("meetMePresence")
      .doc(authCheck.uid)
      .set({
        uid: authCheck.uid,
        displayName: profile!.displayName,
        photoUrl: profile!.photoUrl ?? null,
        age: profile!.age,
        gender: profile!.gender,
        lookingFor: validation.data.lookingFor,
        createdAt: now,
        expiresAt: Timestamp.fromMillis(now.toMillis() + PRESENCE_LIFETIME_MS),
      });

    return { success: true };
  } catch (error: any) {
    console.error("Error opting into Meet Me:", error);
    return { success: false, error: error.message || "Failed to opt in." };
  }
}

export async function optOutMeetMeAction(
  idToken: string,
  clubId: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const validation = ClubIdSchema.safeParse(clubId);
  if (!validation.success) return { success: false, error: "Invalid club." };

  try {
    await adminFirestore
      .collection("clubs")
      .doc(validation.data)
      .collection("meetMePresence")
      .doc(authCheck.uid)
      .delete();
    return { success: true };
  } catch (error: any) {
    console.error("Error opting out of Meet Me:", error);
    return { success: false, error: error.message || "Failed to opt out." };
  }
}

const InterestInputSchema = z.object({
  clubId: z.string().min(1),
  toUid: z.string().min(1),
});

/**
 * Records one-directional interest and, if the target has already expressed interest
 * back, atomically creates the conversation doc. Must be a transaction: two people
 * tapping "interested" on each other within milliseconds is a real race, and Firestore
 * transactions serialize the conflicting reads/writes so neither side misses the match
 * nor double-creates the conversation (merge:true on the conversation write makes a
 * second, independently-detected creation converge instead of erroring).
 */
export async function expressInterestAction(
  idToken: string,
  clubId: string,
  toUid: string
): Promise<{ success: boolean; matched: boolean; conversationId?: string; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, matched: false, error: authCheck.error };
  const fromUid = authCheck.uid;

  if (!adminFirestore) return { success: false, matched: false, error: "Server Firestore (Admin) not initialized" };

  const validation = InterestInputSchema.safeParse({ clubId, toUid });
  if (!validation.success || validation.data.toUid === fromUid) {
    return { success: false, matched: false, error: "Invalid interest target." };
  }

  try {
    const [fromUserSnap, toUserSnap] = await Promise.all([
      adminFirestore.collection("users").doc(fromUid).get(),
      adminFirestore.collection("users").doc(validation.data.toUid).get(),
    ]);
    const fromProfile = fromUserSnap.data();
    const toProfile = toUserSnap.data();
    const fromBlocked: string[] = fromProfile?.blockedUids ?? [];
    const toBlocked: string[] = toProfile?.blockedUids ?? [];
    const isBlocked = fromBlocked.includes(validation.data.toUid) || toBlocked.includes(fromUid);
    if (isBlocked) {
      return { success: false, matched: false, error: "Unable to express interest in this user." };
    }

    const { clubId: safeClubId, toUid: safeToUid } = validation.data;
    const myInterestRef = adminFirestore.collection("interests").doc(`${safeClubId}_${fromUid}_${safeToUid}`);
    const reverseInterestRef = adminFirestore.collection("interests").doc(`${safeClubId}_${safeToUid}_${fromUid}`);
    const sortedPair = [fromUid, safeToUid].sort();
    const conversationId = sortedPair.join("_");
    const conversationRef = adminFirestore.collection("conversations").doc(conversationId);

    const result = await adminFirestore.runTransaction(async (tx) => {
      const [mySnap, reverseSnap] = await Promise.all([tx.get(myInterestRef), tx.get(reverseInterestRef)]);

      // Idempotent re-tap: don't re-run match logic, just report current state.
      if (mySnap.exists) {
        return { matched: reverseSnap.exists, conversationId: reverseSnap.exists ? conversationId : undefined };
      }

      const now = Timestamp.now();
      tx.set(myInterestRef, { clubId: safeClubId, fromUid, toUid: safeToUid, createdAt: now });

      if (reverseSnap.exists) {
        tx.set(
          conversationRef,
          {
            participantUids: sortedPair,
            clubId: safeClubId,
            createdAt: now,
            lastMessageAt: now,
            lastMessageText: "",
          },
          { merge: true }
        );
        return { matched: true, conversationId };
      }

      return { matched: false as const, conversationId: undefined };
    });

    return { success: true, matched: result.matched, conversationId: result.conversationId };
  } catch (error: any) {
    console.error("Error expressing interest:", error);
    return { success: false, matched: false, error: error.message || "Failed to express interest." };
  }
}
