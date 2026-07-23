"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { isToday, isYesterday, format, formatDistanceToNow } from "date-fns";
import { auth, firestore } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { blockUserAction } from "@/actions/profileActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportUserDialog } from "@/components/meetme/ReportUserDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ChatMessageWithId, ConversationWithId } from "@/types";

type LoadState = "loading" | "ready" | "denied";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const PRESENCE_RECHECK_MS = 30_000;

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

function messageTime(timestamp: unknown) {
  if (timestamp && typeof (timestamp as any).toDate === "function") {
    return (timestamp as any).toDate().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  // A locally-added message shows this until the serverTimestamp() sentinel resolves.
  return "Sending…";
}

interface ChatThreadProps {
  conversationId: string;
  /** Rendered as a back button in the header when provided (mobile route only — the
   * desktop split view keeps the conversation list visible, so it has nothing to go
   * "back" to). */
  onBack?: () => void;
  className?: string;
}

// Extracted from the original chat/[conversationId]/page.tsx (Addendum 33) so both the
// standalone route and the desktop matches-page master-detail split can share one
// implementation instead of duplicating the conversation/messages/block/report logic.
export function ChatThread({ conversationId, onBack, className }: ChatThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [conversation, setConversation] = useState<ConversationWithId | null>(null);
  const [otherProfile, setOtherProfile] = useState<{
    displayName: string;
    photoUrl: string | null;
    blockedUids: string[];
    lastActiveAt: any;
  } | null>(null);
  const [ownBlockedUids, setOwnBlockedUids] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessageWithId[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [, setPresenceTick] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenMessageIdsRef = useRef<Set<string> | null>(null);

  const otherUid = conversation?.participantUids.find((uid) => uid !== user?.uid) ?? null;
  const isBlockedEitherWay =
    !!otherUid &&
    (ownBlockedUids.includes(otherUid) || (otherProfile?.blockedUids ?? []).includes(user?.uid ?? ""));

  useEffect(() => {
    if (!user || !firestore || !conversationId) return;
    const unsubscribe = onSnapshot(
      doc(firestore, "conversations", conversationId),
      (snap) => {
        if (!snap.exists()) {
          setLoadState("denied");
          return;
        }
        setConversation({ id: snap.id, ...(snap.data() as any) });
        setLoadState("ready");
      },
      () => {
        // Rules deny reads for non-participants — treat as access denied.
        setLoadState("denied");
      }
    );
    return () => unsubscribe();
  }, [user, conversationId]);

  // Live (not one-time) so the online dot/"last seen" text and blocked state stay fresh.
  useEffect(() => {
    if (!otherUid || !firestore) return;
    const unsubscribe = onSnapshot(doc(firestore, "users", otherUid), (snap) => {
      const data = snap.data();
      setOtherProfile({
        displayName: data?.displayName ?? "Someone",
        photoUrl: data?.photoUrl ?? null,
        blockedUids: data?.blockedUids ?? [],
        lastActiveAt: data?.lastActiveAt ?? null,
      });
    });
    return () => unsubscribe();
  }, [otherUid]);

  useEffect(() => {
    if (!user || !firestore) return;
    const unsubscribe = onSnapshot(doc(firestore, "users", user.uid), (snap) => {
      setOwnBlockedUids(snap.data()?.blockedUids ?? []);
    });
    return () => unsubscribe();
  }, [user]);

  // Forces a re-render periodically so "online" correctly ages into "last seen ..."
  // without needing a fresh snapshot.
  useEffect(() => {
    const interval = setInterval(() => setPresenceTick((t) => t + 1), PRESENCE_RECHECK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!firestore || loadState !== "ready") return;
    seenMessageIdsRef.current = null; // reset baseline when switching threads

    const q = query(collection(firestore, "conversations", conversationId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as ChatMessageWithId));

      if (seenMessageIdsRef.current === null) {
        // Baseline on first load: don't vibrate for messages that already existed.
        seenMessageIdsRef.current = new Set(snapshot.docs.map((d) => d.id));
        return;
      }
      let hasNewIncomingMessage = false;
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !seenMessageIdsRef.current!.has(change.doc.id)) {
          seenMessageIdsRef.current!.add(change.doc.id);
          if (change.doc.data().senderUid !== user?.uid) hasNewIncomingMessage = true;
        }
      });
      if (hasNewIncomingMessage && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(200);
      }
    });
    return () => unsubscribe();
  }, [conversationId, loadState, user?.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark this thread as read — powers both the matches list's "Unread" filter and the
  // read-tick indicator on my own sent messages (see firestore.rules' lastReadAt rule).
  useEffect(() => {
    if (!firestore || loadState !== "ready" || !user) return;
    updateDoc(doc(firestore, "conversations", conversationId), {
      [`lastReadAt.${user.uid}`]: serverTimestamp(),
    }).catch(() => {});
  }, [conversationId, loadState, user, messages.length]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || !user || !firestore || isSending) return;

    setIsSending(true);
    try {
      await addDoc(collection(firestore, "conversations", conversationId, "messages"), {
        senderUid: user.uid,
        text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(firestore, "conversations", conversationId), {
        lastMessageAt: serverTimestamp(),
        lastMessageText: text,
        lastMessageSenderUid: user.uid,
      });
      setMessageText("");
    } catch (error: any) {
      toast({ title: "Couldn't send message", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleBlock = async () => {
    if (!otherUid) return;
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) return;
    const result = await blockUserAction(idToken, otherUid);
    if (result.success) {
      toast({ title: "User blocked", description: "You won't be able to message each other anymore." });
    } else {
      toast({ title: "Couldn't block user", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const isOnline = !!otherProfile?.lastActiveAt && Date.now() - otherProfile.lastActiveAt.toMillis() < ONLINE_WINDOW_MS;
  const presenceText = isOnline
    ? "online"
    : otherProfile?.lastActiveAt
      ? `last seen ${formatDistanceToNow(otherProfile.lastActiveAt.toDate(), { addSuffix: true })}`
      : "";

  const grouped = useMemo(() => {
    const items: Array<
      { type: "divider"; label: string } | { type: "msg"; message: ChatMessageWithId; tight: boolean }
    > = [];
    let lastDayKey: string | null = null;
    messages.forEach((m, idx) => {
      const date =
        m.createdAt && typeof (m.createdAt as any).toDate === "function" ? (m.createdAt as any).toDate() : new Date();
      const dayKey = date.toDateString();
      if (dayKey !== lastDayKey) {
        items.push({ type: "divider", label: dayLabel(date) });
        lastDayKey = dayKey;
      }
      const prev = messages[idx - 1];
      const prevDayKey =
        prev && prev.createdAt && typeof (prev.createdAt as any).toDate === "function"
          ? (prev.createdAt as any).toDate().toDateString()
          : null;
      const tight = !!prev && prevDayKey === dayKey && prev.senderUid === m.senderUid;
      items.push({ type: "msg", message: m, tight });
    });
    return items;
  }, [messages]);

  if (loadState === "loading") {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadState === "denied") {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center gap-2 text-center p-8", className)}>
        <p className="text-muted-foreground">This conversation isn&apos;t available.</p>
        <Button variant="link" asChild>
          <Link href="/dashboard/matches">Back to matches</Link>
        </Button>
      </div>
    );
  }

  const otherName = otherProfile?.displayName ?? "Someone";

  return (
    <div className={cn("relative flex flex-1 flex-col overflow-hidden bg-[#0b0713]", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(168,85,247,0.05) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 flex items-center gap-3 border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back to matches" className="shrink-0 text-vy-purple">
            <Icons.arrowLeft className="h-5 w-5" />
          </button>
        )}
        <Link href={otherUid ? `/dashboard/matches/${otherUid}` : "#"} className="flex flex-1 items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              {otherProfile?.photoUrl ? <AvatarImage src={otherProfile.photoUrl} alt={otherName} /> : null}
              <AvatarFallback>
                <Icons.userRound className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[#0b0713] bg-status-green" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{otherName}</p>
            {presenceText && (
              <p className={cn("text-xs truncate", isOnline ? "text-status-green" : "text-muted-foreground")}>
                {presenceText}
              </p>
            )}
          </div>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Conversation options">
              <Icons.moreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleBlock}>
              <Icons.ban className="mr-2 h-4 w-4" /> Block
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
              <Icons.flag className="mr-2 h-4 w-4" /> Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Say hi to start the conversation.</p>
        )}
        {grouped.map((item, i) => {
          if (item.type === "divider") {
            return (
              <div key={`d-${i}`} className="flex justify-center py-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
            );
          }
          const message = item.message;
          const isOwn = message.senderUid === user?.uid;
          const isRead =
            isOwn &&
            !!otherUid &&
            !!conversation?.lastReadAt?.[otherUid] &&
            typeof (message.createdAt as any)?.toMillis === "function" &&
            (conversation!.lastReadAt![otherUid] as any).toMillis() >= (message.createdAt as any).toMillis();
          return (
            <div
              key={message.id}
              className={cn("flex flex-col", isOwn ? "items-end" : "items-start", item.tight ? "mt-0.5" : "mt-3")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  isOwn
                    ? "bg-gradient-vy-purple-pink text-white rounded-br-md"
                    : "bg-white/5 border border-white/10 rounded-bl-md"
                )}
              >
                <span className="whitespace-pre-wrap break-words">{message.text}</span>
                <span className="ml-2 inline-flex translate-y-0.5 items-center gap-1 align-bottom">
                  <span className={cn("text-[10px]", isOwn ? "text-white/75" : "text-muted-foreground")}>
                    {messageTime(message.createdAt)}
                  </span>
                  {isOwn &&
                    (isRead ? (
                      <Icons.checkCheck className="h-3 w-3 text-sky-300" />
                    ) : (
                      <Icons.check className="h-3 w-3 text-white/60" />
                    ))}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {isBlockedEitherWay ? (
        <p className="relative z-10 text-sm text-muted-foreground text-center border-t border-white/10 py-4">
          You can no longer message in this conversation.
        </p>
      ) : (
        <div className="relative z-10 flex items-center gap-2 border-t border-white/10 bg-card/70 backdrop-blur-xl p-4">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message…"
            maxLength={2000}
            disabled={isSending}
          />
          <Button variant="vy" size="icon" onClick={handleSend} disabled={isSending || !messageText.trim()}>
            {isSending ? <Icons.spinner className="h-4 w-4 animate-spin" /> : <Icons.send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {otherUid && (
        <ReportUserDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          reportedUid={otherUid}
          reportedName={otherName}
          conversationId={conversationId}
        />
      )}
    </div>
  );
}
