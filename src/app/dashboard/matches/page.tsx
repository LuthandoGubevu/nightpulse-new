
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { StoryRing } from "@/components/stories/StoryRing";
import { StoryComposerDialog } from "@/components/stories/StoryComposerDialog";
import { StoryViewer } from "@/components/stories/StoryViewer";
import type { ConversationWithId, StoryWithId } from "@/types";

interface MatchRow {
  conversation: ConversationWithId;
  otherUid: string;
  otherName: string;
  otherPhotoUrl: string | null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isActive(story: StoryWithId, now: Timestamp): boolean {
  return (story.expiresAt as unknown as Timestamp).toMillis() > now.toMillis();
}

export default function MatchesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const profileCacheRef = useRef<Map<string, { displayName: string; photoUrl: string | null }>>(new Map());

  const [ownProfile, setOwnProfile] = useState<{ displayName: string; photoUrl: string | null } | null>(null);
  const [ownStories, setOwnStories] = useState<StoryWithId[]>([]);
  const [storiesByAuthor, setStoriesByAuthor] = useState<Record<string, StoryWithId[]>>({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewer, setViewer] = useState<{
    authorUid: string;
    authorName: string;
    authorPhotoUrl: string | null;
    stories: StoryWithId[];
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

  // Own profile + own active stories, for the leading "Add to your story" ring.
  useEffect(() => {
    if (!user || !firestore) return;
    (async () => {
      const snap = await getDoc(doc(firestore!, "users", user.uid));
      const data = snap.data();
      setOwnProfile({ displayName: data?.displayName ?? "You", photoUrl: data?.photoUrl ?? null });
    })();

    const q = query(collection(firestore, "users", user.uid, "stories"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Timestamp.now();
      setOwnStories(
        snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }) as StoryWithId)
          .filter((s) => isActive(s, now))
      );
    });
    return () => unsubscribe();
  }, [user]);

  const matchedUidsKey = useMemo(() => rows.map((r) => r.otherUid).sort().join(","), [rows]);

  // One collectionGroup("stories") listener per 30-uid chunk, instead of a listener per
  // match — the {path=**}/stories firestore.rules block is what makes a batched
  // cross-author query like this possible.
  useEffect(() => {
    const matchedUids = matchedUidsKey ? matchedUidsKey.split(",") : [];
    const db = firestore;
    if (!db || matchedUids.length === 0) {
      setStoriesByAuthor({});
      return;
    }

    const chunks = chunk(matchedUids, 30);
    const unsubscribes = chunks.map((uidsChunk) => {
      const q = query(collectionGroup(db, "stories"), where("authorUid", "in", uidsChunk));
      return onSnapshot(q, (snapshot) => {
        const now = Timestamp.now();
        const chunkResult: Record<string, StoryWithId[]> = {};
        uidsChunk.forEach((uid) => {
          chunkResult[uid] = [];
        });
        snapshot.docs.forEach((d) => {
          const story = { id: d.id, ...(d.data() as any) } as StoryWithId;
          if (!isActive(story, now)) return;
          chunkResult[story.authorUid] = chunkResult[story.authorUid] ? [...chunkResult[story.authorUid], story] : [story];
        });
        setStoriesByAuthor((prev) => ({ ...prev, ...chunkResult }));
      });
    });

    return () => unsubscribes.forEach((u) => u());
  }, [matchedUidsKey]);

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
          // The users/{uid}/stories onSnapshot listener above picks up the new story on
          // its own; nothing else to refresh.
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
          onDeleted={() => setViewer(null)}
        />
      )}
    </div>
  );
}
