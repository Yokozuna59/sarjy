import type { ChatMessage } from "~/hooks/use-chat";
import { Ellipsis } from "lucide-react";
import { MessageBubble } from "~/components/MessageBubble";
import { cn } from "~/lib/cn";

interface MessageListProps {
  messages: ChatMessage[];
  pending: boolean;
}

export function MessageList({ messages, pending }: MessageListProps) {
  return (
    <div aria-live="polite" className="flex flex-1 flex-col">
      {messages.length === 0 && !pending ? (
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-3",
            "text-center text-balance",
          )}
        >
          <p>
            Book a padel court, a football pitch or a coffee shop table in any
            city. Sarjy checks the weather first.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tap the mic to talk hands-free, or type. Your browser will ask to
            use the microphone. Headphones help, so Sarjy doesn't hear itself.
          </p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2 py-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {pending && (
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
      )}
    </div>
  );
}
