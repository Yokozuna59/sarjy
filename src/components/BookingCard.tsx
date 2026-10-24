import type { Booking } from "~/engine/types";
import { CalendarDays, CircleCheck, MapPin, Users } from "lucide-react";
import { VENUES } from "~/engine/venues";
import { cn } from "~/lib/cn";

interface BookingCardProps {
  booking: Booking;
}

export function BookingCard({ booking }: BookingCardProps) {
  // Cards are saved in the browser, so skip any venue that no longer exists.
  const venue = VENUES.find((each) => each.id === booking.venueId);
  if (!venue) return null;

  const start = booking.hour * 60;
  const people =
    booking.groupSize === 1 ? "1 person" : `${booking.groupSize} people`;

  return (
    <article
      className={cn(
        "w-72 max-w-full rounded-2xl border p-4",
        "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span
          className={cn(
            "flex items-center gap-1 font-medium",
            "text-emerald-700 dark:text-emerald-400",
          )}
        >
          <CircleCheck className="size-4" />
          Booked
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5",
            "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
          )}
        >
          Sample venue
        </span>
      </div>
      <h3 className="mt-2 font-semibold">{venue.name}</h3>
      <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <li className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" />
          {booking.city}
        </li>
        <li className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0" />
          {dayText(booking.date)}, {clock(start)} to{" "}
          {clock(start + booking.minutes)}
        </li>
        <li className="flex items-center gap-2">
          <Users className="size-4 shrink-0" />
          {people}, under {booking.name}
        </li>
      </ul>
    </article>
  );
}

// "Sat 24 Oct"
function dayText(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

// Minutes after midnight as "8 PM" or "9:30 PM".
function clock(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  const suffix = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 || 12;
  return rest
    ? `${twelveHour}:${String(rest).padStart(2, "0")} ${suffix}`
    : `${twelveHour} ${suffix}`;
}
