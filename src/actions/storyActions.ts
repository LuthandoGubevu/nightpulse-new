
"use server";

import { adminFirestore, adminStorageBucket } from "@/lib/firebaseAdmin";
import { Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
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

// Plain, serializable shape for reads (Admin SDK Timestamps don't round-trip through a
// Server Action response the way client SDK Timestamps do in this app's direct-listener
// code elsewhere, so expiresAt/createdAt come back as millis).
export interface SerializedStory {
  id: string;
  authorUid: string;
  mediaPath: string | null;
  mediaType: "image" | "text";
  text: string | null;
  backgroundColor: string | null;
  createdAtMillis: number;
  expiresAtMillis: number;
}

function toSerializedStory(doc: QueryDocumentSnapshot): SerializedStory {
  const data = doc.data();
  return {
    id: doc.id,
    authorUid: data.authorUid,
    mediaPath: data.mediaPath ?? null,
    mediaType: data.mediaType,
    text: data.text ?? null,
    backgroundColor: data.backgroundColor ?? null,
    createdAtMillis: (data.createdAt as Timestamp).toMillis(),
    expiresAtMillis: (data.expiresAt as Timestamp).toMillis(),
  };
}

async function fetchActiveStories(uid: string): Promise<SerializedStory[]> {
  if (!adminFirestore) return [];
  const now = Date.now();
  const snap = await adminFirestore.collection("users").doc(uid).collection("stories").get();
  return snap.docs
    .map(toSerializedStory)
    .filter((s) => s.expiresAtMillis > now)
    .sort((a, b) => a.createdAtMillis - b.createdAtMillis);
}

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

/** The caller's own active stories — for the leading "Your story" ring. */
export async function getOwnActiveStoriesAction(idToken: string): Promise<SerializedStory[]> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok || !adminFirestore) return [];
  return fetchActiveStories(authCheck.uid);
}

/**
 * Active stories from everyone the caller is matched with, keyed by author uid —
 * derives the matched-uid set itself (via `conversations`) rather than trusting a
 * client-supplied list, so this is also the sole source of truth for "who am I matched
 * with" server-side. Only matches with at least one active story are included, since
 * that's all the ring bar renders.
 */
export async function getMatchesActiveStoriesAction(idToken: string): Promise<Record<string, SerializedStory[]>> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok || !adminFirestore) return {};

  const convSnap = await adminFirestore
    .collection("conversations")
    .where("participantUids", "array-contains", authCheck.uid)
    .get();

  const matchedUids = Array.from(
    new Set(
      convSnap.docs
        .map((d) => {
          const participants: string[] = d.data().participantUids ?? [];
          return participants.find((uid) => uid !== authCheck.uid) ?? null;
        })
        .filter((uid): uid is string => !!uid)
    )
  );

  const result: Record<string, SerializedStory[]> = {};
  await Promise.all(
    matchedUids.map(async (uid) => {
      const stories = await fetchActiveStories(uid);
      if (stories.length > 0) result[uid] = stories;
    })
  );
  return result;
}

/**
 * A specific user's active stories, for the match-profile page. Verifies the caller is
 * either that user or matched with them (same conversation-existence check as
 * getStoryMediaUrlAction) before returning anything.
 */
export async function getUserStoriesAction(
  idToken: string,
  targetUid: string
): Promise<{ success: boolean; stories: SerializedStory[]; error?: string }> {
  const authCheck = await verifyUserIdToken(idToken);
  if (!authCheck.ok) return { success: false, stories: [], error: authCheck.error };
  if (!adminFirestore) return { success: false, stories: [], error: "Server Firestore (Admin) not initialized" };

  if (authCheck.uid !== targetUid) {
    const conversationSnap = await adminFirestore
      .collection("conversations")
      .doc(conversationIdFor(authCheck.uid, targetUid))
      .get();
    if (!conversationSnap.exists) {
      return { success: false, stories: [], error: "Not authorized to view these stories." };
    }
  }

  return { success: true, stories: await fetchActiveStories(targetUid) };
}
