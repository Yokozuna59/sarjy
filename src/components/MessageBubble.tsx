import type { Booking } from "~/engine/types";
import type { ChatMessage } from "~/hooks/use-chat";
import { BookingCard } from "~/components/BookingCard";
import { cn } from "~/lib/cn";

interface MessageBubbleProps {
  message: ChatMessage;
}

const ALIGNMENT: Record<ChatMessage["role"], string> = {
  user: "self-end items-end",
  assistant: "self-start items-start",
};

const ROLE_STYLES: Record<ChatMessage["role"], string> = {
  user: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
  assistant: "bg-zinc-100 dark:bg-zinc-800",
};

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <li
      className={cn("flex max-w-[80%] flex-col gap-2", ALIGNMENT[message.role])}
    >
      <div
        dir="auto"
        className={cn(
          "rounded-2xl px-4 py-2",
          "whitespace-pre-wrap wrap-anywhere",
          ROLE_STYLES[message.role],
        )}
      >
        {message.text}
      </div>
      {message.cards?.map((booking) => (
        <BookingCard key={bookingKey(booking)} booking={booking} />
      ))}
    </li>
  );
}

function bookingKey({ venueId, city, date, hour }: Booking) {
  return `${venueId}-${city}-${date}-${hour}`;
}
