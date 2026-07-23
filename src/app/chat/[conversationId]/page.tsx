
"use client";

import { useParams } from "next/navigation";
import { ChatThread } from "@/components/chat/ChatThread";

export default function ChatThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>();

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col overflow-hidden rounded-lg border border-white/10">
      <ChatThread conversationId={conversationId} />
    </div>
  );
}
