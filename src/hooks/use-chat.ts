import type { TurnError, TurnResponse } from "~/lib/turn";
import { useRef, useState } from "react";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const FALLBACK_ERROR = "Sorry, something went wrong. Please try again.";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const nextId = useRef(0);

  function addMessage(role: ChatMessage["role"], text: string) {
    const id = nextId.current++;
    setMessages((current) => [...current, { id, role, text }]);
  }

  function send(text: string) {
    addMessage("user", text);
    return postTurn(JSON.stringify({ text }));
  }

  function sendAudio(wav: Blob) {
    const form = new FormData();
    form.append("audio", wav, "speech.wav");
    return postTurn(form);
  }

  async function postTurn(body: string | FormData) {
    const isAudio = body instanceof FormData;
    setSending(true);
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: isAudio ? undefined : { "Content-Type": "application/json" },
        body,
      });
      const data: TurnResponse | TurnError = await response.json();
      if ("error" in data) {
        addMessage("assistant", data.error);
        return;
      }
      if (isAudio) addMessage("user", data.userText);
      addMessage("assistant", data.reply.text);
    } catch {
      addMessage("assistant", FALLBACK_ERROR);
    } finally {
      setSending(false);
    }
  }

  function clear() {
    setMessages([]);
  }

  return { messages, sending, send, sendAudio, clear };
}
