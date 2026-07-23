
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
import { ChatThread } from "@/components/chat/ChatThread";
import { StoryPreviewTile, type StoryPreview } from "@/components/stories/StoryPreviewTile";
import { StoryComposerDialog } from "@/components/stories/StoryComposerDialog";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { getOwnActiveStoriesAction, getMatchesActiveStoriesAction, getStoryMediaUrlAction, type SerializedStory } from "@/actions/storyActions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ConversationWithId } from "@/types";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const DESKTOP_QUERY = "(min-width: 1024px)";

interface MatchRow {
  conversation: ConversationWithId;
  otherUid: string;
  otherName: string;
  otherPhotoUrl: string | null;
}

function isRowUnread(conversation: ConversationWithId, myUid: string) {
  if (!conversation.lastMessageAt) return false;
  const lastRead = conversation.lastReadAt?.[myUid] as any;
  if (!lastRead || typeof lastRead.toMillis !== "function") return true;
  return lastRead.toMillis() < (conversation.lastMessageAt as any).toMillis();
}

export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const profileCacheRef = useRef<Map<string, { displayName: string; photoUrl: string | null }>>(new Map());
  const [presenceByUid, setPresenceByUid] = useState<Record<string, any>>({});
  const presenceUnsubsRef = useRef<Map<string, () => void>>(new Map());

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const [ownProfile, setOwnProfile] = useState<{ displayName: string; photoUrl: string | null } | null>(null);
  const [ownStories, setOwnStories] = useState<SerializedStory[]>([]);
  const [storiesByAuthor, setStoriesByAuthor] = useState<Record<string, SerializedStory[]>>({});
  const [previewMedia, setPreviewMedia] = useState<Record<string, StoryPreview>>({});
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

  // Live presence (online dot) per match — one small single-field listener per uid,
  // reused across snapshot updates rather than re-subscribing every time.
  useEffect(() => {
    if (!firestore) return;
    const db = firestore;
    const wantedUids = new Set(rows.map((r) => r.otherUid));
    wantedUids.forEach((uid) => {
      if (presenceUnsubsRef.current.has(uid)) return;
      const unsubscribe = onSnapshot(doc(db, "users", uid), (snap) => {
        setPresenceByUid((prev) => ({ ...prev, [uid]: snap.data()?.lastActiveAt ?? null }));
      });
      presenceUnsubsRef.current.set(uid, unsubscribe);
    });
  }, [rows]);

  useEffect(() => {
    return () => {
      presenceUnsubsRef.current.forEach((unsubscribe) => unsubscribe());
      presenceUnsubsRef.current.clear();
    };
  }, []);

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

  // Thumbnail previews for the story bar — the tile shows the latest active story's own
  // content (photo or text card), not just the person's profile photo, so this mints a
  // short-lived signed URL per photo story (same getStoryMediaUrlAction StoryViewer uses)
  // rather than a permanent download URL.
  useEffect(() => {
    const entries: [string, SerializedStory][] = [];
    if (ownStories.length > 0) entries.push(["own", ownStories[ownStories.length - 1]]);
    for (const [uid, stories] of Object.entries(storiesByAuthor)) {
      if (stories.length > 0) entries.push([uid, stories[stories.length - 1]]);
    }
    if (entries.length === 0) {
      setPreviewMedia({});
      return;
    }

    let cancelled = false;
    (async () => {
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) return;
      const results = await Promise.all(
        entries.map(async ([key, story]): Promise<[string, StoryPreview]> => {
          if (story.mediaType === "text") {
            return [key, { kind: "text", text: story.text ?? "", backgroundColor: story.backgroundColor ?? "#7c3aed" }];
          }
          const authorUid = key === "own" ? user?.uid : key;
          if (!authorUid) return [key, { kind: "none" }];
          try {
            const result = await getStoryMediaUrlAction(idToken, authorUid, story.id);
            if (result?.success && result.url) {
              return [key, { kind: "image", url: result.url }];
            }
          } catch {
            // fall through to "none" — the full StoryViewer surfaces a proper error if opened
          }
          return [key, { kind: "none" }];
        })
      );
      if (!cancelled) setPreviewMedia(Object.fromEntries(results));
    })();
    return () => {
      cancelled = true;
    };
  }, [ownStories, storiesByAuthor, user]);

  const filteredRows = rows.filter((row) => {
    if (filter === "unread" && user && !isRowUnread(row.conversation, user.uid)) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return row.otherName.toLowerCase().includes(q) || (row.conversation.lastMessageText ?? "").toLowerCase().includes(q);
  });

  const unreadCount = user ? rows.filter((row) => isRowUnread(row.conversation, user.uid)).length : 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader title="Your matches" description="Conversations from mutual Meet Me interest." />

      <div className="mt-6 lg:grid lg:grid-cols-[392px_1fr] lg:items-start lg:gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <div className="relative shrink-0">
              <StoryPreviewTile
                displayName="Your story"
                hasActiveStory={ownStories.length > 0}
                preview={previewMedia.own ?? { kind: "none" }}
                fallbackPhotoUrl={ownProfile?.photoUrl ?? null}
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
                className="absolute bottom-1 right-1 rounded-full bg-gradient-vy-purple-pink p-1 border-2 border-background"
              >
                <Icons.add className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            {matchesWithActiveStories.map((row) => (
              <StoryPreviewTile
                key={row.otherUid}
                displayName={row.otherName}
                hasActiveStory
                preview={previewMedia[row.otherUid] ?? { kind: "none" }}
                fallbackPhotoUrl={row.otherPhotoUrl}
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

          <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2.5">
            <Icons.search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search matches"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(["all", "unread"] as const).map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    active
                      ? "border-vy-purple/50 bg-vy-purple/15 text-fuchsia-300"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                  )}
                >
                  {f === "all" ? "All" : "Unread"}
                  {f === "unread" && unreadCount > 0 && <span>{unreadCount}</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-1">
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

            {!loading && rows.length > 0 && filteredRows.length === 0 && (
              <p className="text-muted-foreground text-center py-10">No matches found.</p>
            )}

            {filteredRows.map(({ conversation, otherUid, otherName, otherPhotoUrl }) => {
              const unread = user ? isRowUnread(conversation, user.uid) : false;
              const mineLast = conversation.lastMessageSenderUid === user?.uid;
              const otherLastRead = conversation.lastReadAt?.[otherUid] as any;
              const mineRead =
                mineLast &&
                !!otherLastRead &&
                typeof otherLastRead.toMillis === "function" &&
                typeof (conversation.lastMessageAt as any)?.toMillis === "function" &&
                otherLastRead.toMillis() >= (conversation.lastMessageAt as any).toMillis();
              const isOnline =
                !!presenceByUid[otherUid] && Date.now() - presenceByUid[otherUid].toMillis() < ONLINE_WINDOW_MS;
              const isSelected = selectedConversationId === conversation.id;

              return (
                <Link
                  key={conversation.id}
                  href={`/chat/${conversation.id}`}
                  onClick={(e) => {
                    if (typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches) {
                      e.preventDefault();
                      setSelectedConversationId(conversation.id);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border-l-2 border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10",
                    isSelected && "lg:border-l-vy-purple lg:bg-vy-purple/10"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      {otherPhotoUrl ? <AvatarImage src={otherPhotoUrl} alt={otherName} /> : null}
                      <AvatarFallback>
                        <Icons.userRound className="h-6 w-6 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <div className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-background bg-status-green" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate", unread ? "font-bold text-foreground" : "font-medium")}>{otherName}</p>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {mineLast &&
                        (mineRead ? (
                          <Icons.checkCheck className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                        ) : (
                          <Icons.check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ))}
                      <p className={cn("text-sm truncate", unread ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {conversation.lastMessageText || "Say hi!"}
                      </p>
                    </div>
                  </div>
                  {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-vy-purple-pink" />}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:flex lg:h-[calc(100vh-10rem)] lg:flex-col lg:overflow-hidden lg:rounded-lg lg:border lg:border-white/10">
          {selectedConversationId ? (
            <ChatThread conversationId={selectedConversationId} />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Select a conversation to start chatting.
            </div>
          )}
        </div>
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
