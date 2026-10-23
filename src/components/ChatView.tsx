"use client";

import { useEffect, useRef } from "react";
import { ChatHeader } from "~/components/ChatHeader";
import { Composer } from "~/components/Composer";
import { MessageList } from "~/components/MessageList";
import { useChat } from "~/hooks/use-chat";

export function ChatView() {
  const { messages, sending, send, clear } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const area = scrollRef.current;
    if (area && messages.length > 0) {
      area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  return (
    <>
      <ChatHeader
        canStartNew={messages.length > 0 && !sending}
        onNewChat={clear}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4">
          <MessageList messages={messages} />
          <div className="sticky bottom-0 bg-background pb-4">
            <Composer disabled={sending} onSend={send} />
          </div>
        </div>
      </div>
    </>
  );
}
