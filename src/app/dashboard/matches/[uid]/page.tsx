
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { getUserStoriesAction, type SerializedStory } from "@/actions/storyActions";
import type { Gender, LookingFor } from "@/types";

type LoadState = "loading" | "ready" | "denied";

interface OtherProfile {
  displayName: string;
  photoUrl: string | null;
  age?: number;
  gender?: Gender;
  lookingFor?: LookingFor;
}

const LOOKING_FOR_LABEL: Record<LookingFor, string> = {
  friends: "Friends",
  love: "Love",
};

export default function MatchProfilePage() {
  const { uid: otherUid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [profile, setProfile] = useState<OtherProfile | null>(null);
  const [stories, setStories] = useState<SerializedStory[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Same access guard as the chat thread page: a match is exactly a
  // conversations/{sortedPair} doc, and rules deny reads for anyone else — a failed or
  // missing read means "not a match," never a partial page.
  useEffect(() => {
    if (!user || !firestore || !otherUid) return;
    if (otherUid === user.uid) {
      setLoadState("denied");
      return;
    }
    const id = [user.uid, otherUid].sort().join("_");
    setConversationId(id);

    const unsubscribe = onSnapshot(
      doc(firestore, "conversations", id),
      (snap) => {
        setLoadState(snap.exists() ? "ready" : "denied");
      },
      () => setLoadState("denied")
    );
    return () => unsubscribe();
  }, [user, otherUid]);

  useEffect(() => {
    if (loadState !== "ready" || !firestore || !otherUid) return;
    (async () => {
      const snap = await getDoc(doc(firestore!, "users", otherUid));
      const data = snap.data();
      setProfile({
        displayName: data?.displayName ?? "Someone",
        photoUrl: data?.photoUrl ?? null,
        age: data?.age,
        gender: data?.gender,
        lookingFor: data?.lookingFor,
      });
    })();
  }, [loadState, otherUid]);

  useEffect(() => {
    if (loadState !== "ready" || !otherUid) return;
    // Goes through a Server Action (Admin SDK), not a direct client Firestore read — see
    // Addendum 28: "is the requester matched with this author" can't be expressed as a
    // provable Firestore rule for a list query, so this re-verifies the match server-side
    // instead (redundant with the page's own conversation-existence guard above, but the
    // action doesn't trust the client's loadState either).
    let cancelled = false;
    (async () => {
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) return;
      const result = await getUserStoriesAction(idToken, otherUid);
      if (cancelled) return;
      if (result.success) {
        setStories(result.stories);
      } else {
        toast({ title: "Couldn't load their story", description: result.error, variant: "destructive" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadState, otherUid, toast]);

  if (loadState === "loading") {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadState === "denied") {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-muted-foreground">This profile isn&apos;t available.</p>
        <Button variant="link" onClick={() => router.push("/dashboard/matches")}>
          Back to matches
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-lg">
      <div className="flex flex-col items-center text-center gap-3">
        <button
          type="button"
          onClick={() => stories.length > 0 && setViewerOpen(true)}
          disabled={stories.length === 0}
          className="rounded-full p-1"
        >
          <div className={stories.length > 0 ? "rounded-full bg-gradient-vy-purple-pink p-[3px]" : ""}>
            <Avatar className="h-28 w-28 border-2 border-background">
              {profile?.photoUrl ? <AvatarImage src={profile.photoUrl} alt={profile.displayName} /> : null}
              <AvatarFallback>
                <Icons.userRound className="h-12 w-12 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </div>
        </button>
        {stories.length > 0 && (
          <p className="text-xs text-muted-foreground">Tap photo to view story</p>
        )}

        <h1 className="text-2xl font-bold font-headline">
          {profile?.displayName}
          {profile?.age ? <span className="text-muted-foreground font-normal">, {profile.age}</span> : null}
        </h1>

        {profile?.lookingFor && (
          <p className="text-sm text-muted-foreground">
            Looking for {LOOKING_FOR_LABEL[profile.lookingFor]}
          </p>
        )}

        {conversationId && (
          <Button asChild variant="vy" className="mt-2">
            <Link href={`/chat/${conversationId}`}>
              <Icons.messageCircle className="mr-2 h-4 w-4" /> Message
            </Link>
          </Button>
        )}
      </div>

      {profile && (
        <StoryViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          authorUid={otherUid}
          authorName={profile.displayName}
          authorPhotoUrl={profile.photoUrl}
          stories={stories}
          isOwnStory={false}
        />
      )}
    </div>
  );
}
