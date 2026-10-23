import type { ChatMessage } from "~/hooks/use-chat";
import { cn } from "~/lib/cn";

interface MessageBubbleProps {
  message: ChatMessage;
}

const roleStyles: Record<ChatMessage["role"], string> = {
  user: cn(
    "self-end bg-zinc-900 text-white",
    "dark:bg-zinc-100 dark:text-zinc-900",
  ),
  assistant: "self-start bg-zinc-100 dark:bg-zinc-800",
};

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <li
      dir="auto"
      className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2",
        "whitespace-pre-wrap wrap-anywhere",
        roleStyles[message.role],
      )}
    >
      {message.text}
    </li>
  );
}
