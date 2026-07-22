
"use server";

import { adminFirestore, adminStorageBucket } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { verifyUserIdToken } from "@/lib/serverAuth";
import { z } from "zod";

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours, Instagram/WhatsApp-Status-style
const MEDIA_URL_LIFETIME_MS = 15 * 60 * 1000; // short-lived signed URL, re-checked on every fetch

// Same deterministic id scheme as expressInterestAction (src/actions/meetMeActions.ts)
// and the isMatchedWith() Firestore rules helper — reused here so this Server Action's
// notion of "are these two matched" can never drift from the rule's.
function conversationIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

const PostStoryInputSchema = z.discriminatedUnion("mediaType", [
  z.object({
    mediaType: z.literal("image"),
    mediaPath: z.string().min(1),
    text: z.string().max(200).optional(),
  }),
  z.object({
    mediaType: z.literal("text"),
    text: z.string().min(1).max(200),
    backgroundColor: z.string().min(1),
  }),
]);

type PostStoryInput = z.infer<typeof PostStoryInputSchema>;

/**
 * Posts a story (photo already uploaded to Storage by the client, or a text-only
 * status). createdAt/expiresAt are computed here, not accepted from the client, so a
 * story can't be made to outlive its intended 24h lifetime.
 */
export async function postStoryAction(
  idToken: string,
  data: PostStoryInput
): Promise<{ success: boolean; storyId?: string; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  const validation = PostStoryInputSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || "Invalid story." };
  }

  const input = validation.data;
  const now = Timestamp.now();

  try {
    const storyRef = adminFirestore.collection("users").doc(authCheck.uid).collection("stories").doc();
    await storyRef.set({
      authorUid: authCheck.uid,
      mediaPath: input.mediaType === "image" ? input.mediaPath : null,
      mediaType: input.mediaType,
      text: input.mediaType === "image" ? input.text ?? null : input.text,
      backgroundColor: input.mediaType === "text" ? input.backgroundColor : null,
      createdAt: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + STORY_LIFETIME_MS),
    });
    return { success: true, storyId: storyRef.id };
  } catch (error: any) {
    console.error("Error posting story:", error);
    return { success: false, error: error.message || "Failed to post story." };
  }
}

/**
 * Deletes a story early (before its natural expiry). Since this app has no scheduled
 * cleanup job, an explicit delete also removes the underlying Storage object so at
 * least user-initiated deletes don't orphan files.
 */
export async function deleteStoryAction(
  idToken: string,
  storyId: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };

  try {
    const storyRef = adminFirestore.collection("users").doc(authCheck.uid).collection("stories").doc(storyId);
    const snap = await storyRef.get();
    if (!snap.exists) return { success: true };

    const mediaPath = snap.data()?.mediaPath as string | null | undefined;
    await storyRef.delete();
    if (mediaPath && adminStorageBucket) {
      await adminStorageBucket.file(mediaPath).delete({ ignoreNotFound: true });
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting story:", error);
    return { success: false, error: error.message || "Failed to delete story." };
  }
}

/**
 * Mints a short-lived signed URL for a story photo. Never uses getDownloadURL() /
 * exposes a permanent token — every fetch re-verifies (server-side, via the Admin SDK)
 * that the caller is either the author or matched with them, and that the story hasn't
 * expired, mirroring the Firestore read rule.
 */
export async function getStoryMediaUrlAction(
  idToken: string,
  authorUid: string,
  storyId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, error: authCheck.error };

  if (!adminFirestore) return { success: false, error: "Server Firestore (Admin) not initialized" };
  if (!adminStorageBucket) return { success: false, error: "Storage is not available." };

  try {
    if (authCheck.uid !== authorUid) {
      const conversationSnap = await adminFirestore
        .collection("conversations")
        .doc(conversationIdFor(authCheck.uid, authorUid))
        .get();
      if (!conversationSnap.exists) {
        return { success: false, error: "Not authorized to view this story." };
      }
    }

    const storySnap = await adminFirestore
      .collection("users")
      .doc(authorUid)
      .collection("stories")
      .doc(storyId)
      .get();
    if (!storySnap.exists) return { success: false, error: "Story not found." };

    const story = storySnap.data()!;
    if (!story.mediaPath || story.mediaType !== "image") {
      return { success: false, error: "This story has no photo." };
    }
    const expiresAt = story.expiresAt as Timestamp;
    if (expiresAt.toMillis() <= Date.now()) {
      return { success: false, error: "This story has expired." };
    }

    const [url] = await adminStorageBucket.file(story.mediaPath).getSignedUrl({
      action: "read",
      expires: Date.now() + MEDIA_URL_LIFETIME_MS,
    });
    return { success: true, url };
  } catch (error: any) {
    console.error("Error getting story media URL:", error);
    return { success: false, error: error.message || "Failed to load photo." };
  }
}
