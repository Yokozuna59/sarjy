import type { ChatMessage } from "~/hooks/use-chat";
import { Ellipsis } from "lucide-react";
import { MessageBubble } from "~/components/MessageBubble";
import { cn } from "~/lib/cn";

interface MessageListProps {
  messages: ChatMessage[];
  sending: boolean;
}

export function MessageList({ messages, sending }: MessageListProps) {
  return (
    <ul aria-live="polite" className="flex flex-1 flex-col gap-2 py-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {sending && (
        <li
          className={cn(
            "self-start rounded-2xl px-4 py-2",
            "bg-zinc-100 dark:bg-zinc-800",
          )}
        >
          <span className="sr-only">Sarjy is thinking</span>
          <Ellipsis className="size-5 animate-pulse" />
        </li>
      )}
    </ul>
  );
}
