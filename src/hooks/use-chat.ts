import type { Booking, FlowState } from "~/engine/types";
import type {
  HistoryMessage,
  Memories,
  TurnError,
  TurnResponse,
} from "~/lib/turn";
import { useEffect, useRef, useState } from "react";
import { IDLE } from "~/engine/engine";
import { useStoredState } from "~/hooks/use-stored-state";
import { HISTORY_LENGTH } from "~/lib/turn";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  cards?: Booking[];
}

interface UseChatOptions {
  onReply: (sentences: string[]) => void;
}

const FALLBACK_ERROR = "Sorry, something went wrong. Please try again.";

export function useChat({ onReply }: UseChatOptions) {
  const [messages, setMessages] = useStoredState<ChatMessage[]>(
    "sarjy:messages",
    [],
  );
  const [memories, setMemories] = useStoredState<Memories>(
    "sarjy:memories",
    {},
  );
  const [flow, setFlow] = useStoredState<FlowState>("sarjy:flow", IDLE);
  const [bookings, setBookings] = useStoredState<Booking[]>(
    "sarjy:bookings",
    [],
  );
  const [sending, setSending] = useState(false);
  // Speech that ends while a turn is running waits for that turn, so it's
  // sent with the booking state the turn returns, not the old one.
  const waitingAudio = useRef<Blob[]>([]);

  useEffect(() => {
    if (sending) return;
    const wav = waitingAudio.current.shift();
    if (wav) sendAudio(wav);
  });

  function addMessage(
    role: ChatMessage["role"],
    text: string,
    cards?: Booking[],
  ) {
    setMessages((current) => [
      ...current,
      { id: current.length, role, text, cards },
    ]);
  }

  function recentHistory(): HistoryMessage[] {
    return messages
      .slice(-HISTORY_LENGTH)
      .map(({ role, text }) => ({ role, text }));
  }

  function send(text: string) {
    const history = recentHistory();
    addMessage("user", text);
    return postTurn(
      JSON.stringify({ text, memories, history, flow, bookings }),
    );
  }

  function sendAudio(wav: Blob) {
    if (sending) {
      waitingAudio.current.push(wav);
      return;
    }
    const form = new FormData();
    form.append("audio", wav, "speech.wav");
    form.append("memories", JSON.stringify(memories));
    form.append("history", JSON.stringify(recentHistory()));
    form.append("flow", JSON.stringify(flow));
    form.append("bookings", JSON.stringify(bookings));
    return postTurn(form);
  }

  async function postTurn(body: string | FormData) {
    const isAudio = body instanceof FormData;
    const reply = (text: string, sentences = [text], cards?: Booking[]) => {
      addMessage("assistant", text, cards);
      onReply(sentences);
    };

    setSending(true);
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: isAudio ? undefined : { "Content-Type": "application/json" },
        body,
      });
      const data: TurnResponse | TurnError = await response.json();
      if ("error" in data) {
        reply(data.error);
        return;
      }
      if (isAudio) addMessage("user", data.userText);
      setMemories(data.memories);
      setFlow(data.flow);
      setBookings(data.bookings);
      reply(data.reply.text, data.reply.sentences, data.cards);
    } catch {
      reply(FALLBACK_ERROR);
    } finally {
      setSending(false);
    }
  }

  // A booking in progress belongs to its chat. Finished bookings stay.
  function clear() {
    waitingAudio.current = [];
    setMessages([]);
    setFlow(IDLE);
  }

  function forget() {
    waitingAudio.current = [];
    setMessages([]);
    setMemories({});
    setFlow(IDLE);
    setBookings([]);
  }

  return {
    messages,
    memories,
    flow,
    sending,
    send,
    sendAudio,
    clear,
    forget,
  };
}
