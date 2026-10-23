"use client";

import { useEffect, useRef } from "react";
import { ChatHeader } from "~/components/ChatHeader";
import { Composer } from "~/components/Composer";
import { MessageList } from "~/components/MessageList";
import { useChat } from "~/hooks/use-chat";
import { useSpeaker } from "~/hooks/use-speaker";

export function ChatView() {
  const speaker = useSpeaker();
  const { messages, sending, send, sendAudio, clear } = useChat({
    onReply: speaker.speak,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const area = scrollRef.current;
    if (area && (messages.length > 0 || sending)) {
      area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending]);

  function startNewChat() {
    speaker.stop();
    clear();
  }

  function sendText(text: string) {
    speaker.stop();
    send(text);
  }

  return (
    <>
      <ChatHeader
        canStartNew={messages.length > 0 && !sending}
        onNewChat={startNewChat}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4">
          <MessageList messages={messages} pending={sending} />
          <div className="sticky bottom-0 bg-background pb-4">
            <Composer
              disabled={sending}
              onSend={sendText}
              voice={{ onSpeech: sendAudio, onSpeechStart: speaker.stop }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
