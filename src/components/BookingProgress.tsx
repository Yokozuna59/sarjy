import type { Activity, Field, FlowState } from "~/engine/types";
import { CalendarDays } from "lucide-react";
import { bookVenue } from "~/engine/flows/book-venue";
import { VENUES } from "~/engine/venues";
import { cn } from "~/lib/cn";
import { clockTime, peopleText, shortDate } from "~/lib/format";

const STATUS = {
  collecting: "Booking in progress",
  offering: "Pick one of the options",
  confirming: "Say yes to book",
};

const ACTIVITIES: Record<Activity, string> = {
  padel: "Padel",
  football: "Football",
  cafe: "Coffee",
};

const PLACEHOLDERS: Record<Field, string> = {
  activity: "Activity",
  city: "City",
  date: "Day",
  time: "Time",
  group_size: "People",
  booking_name: "Name",
};

interface BookingProgressProps {
  flow: FlowState;
}

// The booking so far, in the flow spec's order, so a correction shows up
// as one field changing.
export function BookingProgress({ flow }: BookingProgressProps) {
  if (flow.status === "idle") return null;

  const { fields } = flow;
  // While Sarjy waits for a yes, the draft names the exact venue.
  const venue = VENUES.find((each) => each.id === flow.draft?.venueId);
  const activity = fields.activity && ACTIVITIES[fields.activity];
  const values: Record<Field, string | undefined> = {
    activity: venue?.name ?? activity,
    city: fields.city,
    date: fields.date ? shortDate(fields.date) : undefined,
    time: fields.time ? clockTime(toMinutes(fields.time)) : undefined,
    group_size: fields.group_size ? peopleText(fields.group_size) : undefined,
    booking_name: fields.booking_name,
  };

  return (
    <section
      aria-label="Booking in progress"
      className={cn(
        "mb-2 flex flex-col gap-1.5 rounded-2xl border px-3 py-2",
        "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1.5",
          "text-xs font-medium text-zinc-500",
        )}
      >
        <CalendarDays className="size-3.5" />
        {STATUS[flow.status]}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {bookVenue.fields.map(({ name }) => (
          <li
            key={name}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs",
              chipStyle(Boolean(values[name]), flow.pending === name),
            )}
          >
            {values[name] ?? PLACEHOLDERS[name]}
          </li>
        ))}
      </ul>
    </section>
  );
}

function chipStyle(filled: boolean, asking: boolean) {
  if (asking) {
    return cn(
      "border-zinc-900 font-medium text-zinc-900",
      "dark:border-zinc-100 dark:text-zinc-100",
    );
  }
  if (filled) {
    return cn(
      "border-transparent bg-zinc-100 text-zinc-800",
      "dark:bg-zinc-800 dark:text-zinc-200",
    );
  }
  return cn(
    "border-dashed border-zinc-300 text-zinc-400",
    "dark:border-zinc-700 dark:text-zinc-500",
  );
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
