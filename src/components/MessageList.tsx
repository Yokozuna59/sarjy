import type { ChatMessage } from "~/hooks/use-chat";
import { MessageBubble } from "~/components/MessageBubble";
import { cn } from "~/lib/cn";

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div aria-live="polite" className="flex flex-1 flex-col">
      {messages.length === 0 ? (
        <p
          className={cn(
            "flex flex-1 items-center justify-center text-center",
            "text-zinc-600 dark:text-zinc-400",
          )}
        >
          Book a padel court, a football pitch or a coffee shop table. Sarjy
          plans around the weather.
        </p>
      ) : (
        <ul className="flex flex-1 flex-col gap-2 py-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </ul>
      )}
    </div>
  );
}
