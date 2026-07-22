
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { StoryRing } from "@/components/stories/StoryRing";
import { StoryComposerDialog } from "@/components/stories/StoryComposerDialog";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { getOwnActiveStoriesAction, getMatchesActiveStoriesAction, type SerializedStory } from "@/actions/storyActions";
import { useToast } from "@/hooks/use-toast";
import type { ConversationWithId } from "@/types";

interface MatchRow {
  conversation: ConversationWithId;
  otherUid: string;
  otherName: string;
  otherPhotoUrl: string | null;
}

export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const profileCacheRef = useRef<Map<string, { displayName: string; photoUrl: string | null }>>(new Map());

  const [ownProfile, setOwnProfile] = useState<{ displayName: string; photoUrl: string | null } | null>(null);
  const [ownStories, setOwnStories] = useState<SerializedStory[]>([]);
  const [storiesByAuthor, setStoriesByAuthor] = useState<Record<string, SerializedStory[]>>({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewer, setViewer] = useState<{
    authorUid: string;
    authorName: string;
    authorPhotoUrl: string | null;
    stories: SerializedStory[];
    isOwn: boolean;
  } | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      setRows([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, "conversations"),
      where("participantUids", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const conversations = snapshot.docs.map(
        (d) => ({ id: d.id, ...(d.data() as any) }) as ConversationWithId
      );

      const resolved = await Promise.all(
        conversations.map(async (conversation) => {
          const otherUid = conversation.participantUids.find((uid) => uid !== user.uid) ?? conversation.participantUids[0];
          let profile = profileCacheRef.current.get(otherUid);
          if (!profile && firestore) {
            const snap = await getDoc(doc(firestore, "users", otherUid));
            profile = snap.exists()
              ? { displayName: snap.data().displayName ?? "Someone", photoUrl: snap.data().photoUrl ?? null }
              : { displayName: "Someone", photoUrl: null };
            profileCacheRef.current.set(otherUid, profile);
          }
          return {
            conversation,
            otherUid,
            otherName: profile?.displayName ?? "Someone",
            otherPhotoUrl: profile?.photoUrl ?? null,
          };
        })
      );

      setRows(resolved);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Stories go through Server Actions (Admin SDK), not direct client Firestore reads —
  // "is the requester matched with this story's author" can't be expressed as a
  // provable Firestore rule for a list/collectionGroup query (see Addendum 28). That
  // trades live push updates for fetch-on-mount + refetch-after-mutation, same posture
  // already accepted for the admin club list.
  const fetchOwnStories = useCallback(async () => {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      setOwnStories([]);
      return;
    }
    try {
      setOwnStories(await getOwnActiveStoriesAction(idToken));
    } catch (error: any) {
      console.error("Error fetching your stories:", error);
      toast({ title: "Couldn't load your story", description: error.message, variant: "destructive" });
    }
  }, [toast]);

  const fetchMatchesStories = useCallback(async () => {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) {
      setStoriesByAuthor({});
      return;
    }
    try {
      setStoriesByAuthor(await getMatchesActiveStoriesAction(idToken));
    } catch (error: any) {
      console.error("Error fetching matches' stories:", error);
      toast({ title: "Couldn't load matches' stories", description: error.message, variant: "destructive" });
    }
  }, [toast]);

  // Own profile + own active stories, for the leading "Add to your story" ring.
  useEffect(() => {
    if (!user || !firestore) return;
    (async () => {
      const snap = await getDoc(doc(firestore!, "users", user.uid));
      const data = snap.data();
      setOwnProfile({ displayName: data?.displayName ?? "You", photoUrl: data?.photoUrl ?? null });
    })();
    fetchOwnStories();
  }, [user, fetchOwnStories]);

  const matchedUidsKey = useMemo(() => rows.map((r) => r.otherUid).sort().join(","), [rows]);

  // getMatchesActiveStoriesAction derives the matched-uid set itself server-side; the
  // client only uses matchedUidsKey as a "something changed, refetch" trigger.
  useEffect(() => {
    if (!user) {
      setStoriesByAuthor({});
      return;
    }
    fetchMatchesStories();
  }, [user, matchedUidsKey, fetchMatchesStories]);

  const matchesWithActiveStories = rows.filter((row) => (storiesByAuthor[row.otherUid]?.length ?? 0) > 0);

  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader title="Your matches" description="Conversations from mutual Meet Me interest." />

      <div className="mt-6 flex items-center gap-4 overflow-x-auto pb-2">
        <div className="relative shrink-0">
          <StoryRing
            photoUrl={ownProfile?.photoUrl ?? null}
            displayName="Your story"
            hasActiveStory={ownStories.length > 0}
            onClick={() =>
              ownStories.length > 0
                ? setViewer({
                    authorUid: user!.uid,
                    authorName: "Your story",
                    authorPhotoUrl: ownProfile?.photoUrl ?? null,
                    stories: ownStories,
                    isOwn: true,
                  })
                : setComposerOpen(true)
            }
          />
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            aria-label="Add to your story"
            className="absolute bottom-4 right-0 rounded-full bg-gradient-vy-purple-pink p-1 border-2 border-background"
          >
            <Icons.add className="h-3.5 w-3.5 text-white" />
          </button>
        </div>

        {matchesWithActiveStories.map((row) => (
          <StoryRing
            key={row.otherUid}
            photoUrl={row.otherPhotoUrl}
            displayName={row.otherName}
            hasActiveStory
            onClick={() =>
              setViewer({
                authorUid: row.otherUid,
                authorName: row.otherName,
                authorPhotoUrl: row.otherPhotoUrl,
                stories: storiesByAuthor[row.otherUid] ?? [],
                isOwn: false,
              })
            }
          />
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {loading && (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        )}

        {!loading && rows.length === 0 && (
          <p className="text-muted-foreground text-center py-10">
            No matches yet. Tap Meet Me at a venue to start meeting people there.
          </p>
        )}

        {rows.map(({ conversation, otherUid, otherName, otherPhotoUrl }) => (
          <Link
            key={conversation.id}
            href={`/dashboard/matches/${otherUid}`}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
          >
            <Avatar className="h-12 w-12">
              {otherPhotoUrl ? <AvatarImage src={otherPhotoUrl} alt={otherName} /> : null}
              <AvatarFallback>
                <Icons.userRound className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{otherName}</p>
              <p className="text-sm text-muted-foreground truncate">
                {conversation.lastMessageText || "Say hi!"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <StoryComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPosted={() => {
          fetchOwnStories();
        }}
      />

      {viewer && (
        <StoryViewer
          open={!!viewer}
          onOpenChange={(open) => !open && setViewer(null)}
          authorUid={viewer.authorUid}
          authorName={viewer.authorName}
          authorPhotoUrl={viewer.authorPhotoUrl}
          stories={viewer.stories}
          isOwnStory={viewer.isOwn}
          onDeleted={() => {
            setViewer(null);
            fetchOwnStories();
          }}
        />
      )}
    </div>
  );
}
