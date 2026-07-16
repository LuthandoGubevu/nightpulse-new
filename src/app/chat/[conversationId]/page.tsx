
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
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

function formatMessageTime(timestamp: unknown) {
  if (timestamp && typeof (timestamp as any).toDate === "function") {
    return (timestamp as any).toDate().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  // A locally-added message shows this until the serverTimestamp() sentinel resolves.
  return "Sending…";
}

export default function ChatThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [conversation, setConversation] = useState<ConversationWithId | null>(null);
  const [otherProfile, setOtherProfile] = useState<{ displayName: string; photoUrl: string | null } | null>(null);
  const [isBlockedEitherWay, setIsBlockedEitherWay] = useState(false);
  const [messages, setMessages] = useState<ChatMessageWithId[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenMessageIdsRef = useRef<Set<string> | null>(null);

  const otherUid = conversation?.participantUids.find((uid) => uid !== user?.uid) ?? null;

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

  useEffect(() => {
    if (!otherUid || !firestore || !user) return;
    (async () => {
      const [otherSnap, ownSnap] = await Promise.all([
        getDoc(doc(firestore!, "users", otherUid)),
        getDoc(doc(firestore!, "users", user.uid)),
      ]);
      const otherData = otherSnap.data();
      setOtherProfile({
        displayName: otherData?.displayName ?? "Someone",
        photoUrl: otherData?.photoUrl ?? null,
      });
      const ownBlocked: string[] = ownSnap.data()?.blockedUids ?? [];
      const otherBlocked: string[] = otherData?.blockedUids ?? [];
      setIsBlockedEitherWay(ownBlocked.includes(otherUid) || otherBlocked.includes(user.uid));
    })();
  }, [otherUid, user]);

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
      setIsBlockedEitherWay(true);
      toast({ title: "User blocked", description: "You won't be able to message each other anymore." });
    } else {
      toast({ title: "Couldn't block user", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    }
  };

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
        <p className="text-muted-foreground">This conversation isn&apos;t available.</p>
        <Button variant="link" onClick={() => router.push("/dashboard/matches")}>
          Back to matches
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 border-b pb-4">
        <Avatar className="h-10 w-10">
          {otherProfile?.photoUrl ? <AvatarImage src={otherProfile.photoUrl} alt={otherProfile.displayName} /> : null}
          <AvatarFallback>
            <Icons.userRound className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <span className="flex-1 font-semibold">{otherProfile?.displayName ?? "Someone"}</span>
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

      <div className="flex-1 overflow-y-auto py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Say hi to start the conversation.</p>
        )}
        {messages.map((message) => {
          const isOwn = message.senderUid === user?.uid;
          return (
            <div key={message.id} className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                  isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {message.text}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {isBlockedEitherWay ? (
        <p className="text-sm text-muted-foreground text-center border-t pt-4">
          You can no longer message in this conversation.
        </p>
      ) : (
        <div className="flex items-center gap-2 border-t pt-4">
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
          <Button size="icon" onClick={handleSend} disabled={isSending || !messageText.trim()}>
            {isSending ? <Icons.spinner className="h-4 w-4 animate-spin" /> : <Icons.send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {otherUid && (
        <ReportUserDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          reportedUid={otherUid}
          reportedName={otherProfile?.displayName ?? "this user"}
          conversationId={conversationId}
        />
      )}
    </div>
  );
}
