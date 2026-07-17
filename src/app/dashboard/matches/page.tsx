
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationWithId } from "@/types";

interface MatchRow {
  conversation: ConversationWithId;
  otherUid: string;
  otherName: string;
  otherPhotoUrl: string | null;
}

export default function MatchesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const profileCacheRef = useRef<Map<string, { displayName: string; photoUrl: string | null }>>(new Map());

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

  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader title="Your matches" description="Conversations from mutual Meet Me interest." />

      <div className="mt-6 space-y-2">
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
            href={`/chat/${conversation.id}`}
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
    </div>
  );
}
