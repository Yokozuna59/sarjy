import type { TurnResponse } from "~/lib/turn";
import { useRef, useState } from "react";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const nextId = useRef(0);

  function addMessage(role: ChatMessage["role"], text: string) {
    const id = nextId.current++;
    setMessages((current) => [...current, { id, role, text }]);
  }

  async function send(text: string) {
    addMessage("user", text);
    setSending(true);
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        throw new Error(`/api/turn answered ${response.status}`);
      }
      const data: TurnResponse = await response.json();
      addMessage("assistant", data.reply.text);
    } catch {
      addMessage("assistant", "Sorry, something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function clear() {
    setMessages([]);
  }

  return { messages, sending, send, clear };
}
