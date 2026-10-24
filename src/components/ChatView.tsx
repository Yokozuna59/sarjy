"use client";

import { useEffect, useRef } from "react";
import { BookingProgress } from "~/components/BookingProgress";
import { ChatHeader } from "~/components/ChatHeader";
import { Composer } from "~/components/Composer";
import { EmptyState } from "~/components/EmptyState";
import { MessageList } from "~/components/MessageList";
import { useChat } from "~/hooks/use-chat";
import { useSpeaker } from "~/hooks/use-speaker";
import { cn } from "~/lib/cn";

export function ChatView() {
  const speaker = useSpeaker();
  const { messages, memories, flow, sending, send, sendAudio, clear, forget } =
    useChat({ onReply: speaker.speak });
  const hasData = messages.length > 0 || Object.keys(memories).length > 0;
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

  function forgetMe() {
    if (!window.confirm("Forget everything Sarjy knows about you?")) return;
    speaker.stop();
    forget();
  }

  function sendText(text: string) {
    speaker.stop();
    send(text);
  }

  return (
    <>
      <ChatHeader
        canStartNew={messages.length > 0 && !sending}
        canForget={hasData && !sending}
        onNewChat={startNewChat}
        onForget={forgetMe}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4">
          {messages.length === 0 && !sending ? (
            <EmptyState memories={memories} onExample={sendText} />
          ) : (
            <MessageList messages={messages} pending={sending} />
          )}
          <div className="sticky bottom-0 bg-background pb-4">
            <BookingProgress flow={flow} />
            <Composer
              disabled={sending}
              onSend={sendText}
              voice={{ onSpeech: sendAudio, onSpeechStart: speaker.stop }}
            />
            <p className="pt-2 text-center text-xs text-zinc-500">
              Weather data by{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "underline hover:text-zinc-700",
                  "dark:hover:text-zinc-300",
                )}
              >
                Open-Meteo.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
