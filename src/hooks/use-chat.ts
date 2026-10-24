import type {
  HistoryMessage,
  Memories,
  TurnError,
  TurnResponse,
} from "~/lib/turn";
import { useState } from "react";
import { useStoredState } from "~/hooks/use-stored-state";
import { HISTORY_LENGTH } from "~/lib/turn";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
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
  const [sending, setSending] = useState(false);

  function addMessage(role: ChatMessage["role"], text: string) {
    setMessages((current) => [...current, { id: current.length, role, text }]);
  }

  function recentHistory(): HistoryMessage[] {
    return messages
      .slice(-HISTORY_LENGTH)
      .map(({ role, text }) => ({ role, text }));
  }

  function send(text: string) {
    const history = recentHistory();
    addMessage("user", text);
    return postTurn(JSON.stringify({ text, memories, history }));
  }

  function sendAudio(wav: Blob) {
    const form = new FormData();
    form.append("audio", wav, "speech.wav");
    form.append("memories", JSON.stringify(memories));
    form.append("history", JSON.stringify(recentHistory()));
    return postTurn(form);
  }

  async function postTurn(body: string | FormData) {
    const isAudio = body instanceof FormData;
    const reply = (text: string, sentences = [text]) => {
      addMessage("assistant", text);
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
      reply(data.reply.text, data.reply.sentences);
    } catch {
      reply(FALLBACK_ERROR);
    } finally {
      setSending(false);
    }
  }

  function clear() {
    setMessages([]);
  }

  function forget() {
    setMessages([]);
    setMemories({});
  }

  return { messages, memories, sending, send, sendAudio, clear, forget };
}
