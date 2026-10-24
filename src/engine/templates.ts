import type {
  Action,
  Booking,
  Context,
  Failure,
  Field,
  HourWeather,
  Slot,
} from "~/engine/types";
import { bookVenue } from "~/engine/flows/book-venue";
import { findVenue } from "~/engine/rules";
import { addDays, weekday } from "~/lib/time";

type TemplateContext = Pick<Context, "today" | "venues">;

// What Sarjy says for each engine action. Every number comes from the
// action, never from the LLM.
export function render(action: Action, ctx: TemplateContext): string {
  switch (action.type) {
    case "ask":
      return sentences(failureText(action.failure), askText(action.field));
    case "offer": {
      const [first, second] = action.offers.map((slot) => slotText(slot, ctx));
      const choice = second
        ? `I can do ${first}, or ${second}. Which one?`
        : `I can do ${first}. Does that work?`;
      return sentences(failureText(action.failure), choice);
    }
    case "confirm": {
      const { booking, weather } = action;
      const people = booking.groupSize === 1 ? "person" : "people";
      return sentences(
        `${where(booking, ctx)}, ${when(booking, ctx)}, for ${booking.groupSize} ${people}, under ${booking.name}.`,
        weather && weatherText(weather),
        "Shall I book it?",
      );
    }
    case "booked": {
      const { booking } = action;
      return `Done. You're booked at ${where(booking, ctx)} ${when(booking, ctx)}.`;
    }
    case "cancelled":
      return "Okay, I won't book anything.";
    case "none":
      return "";
  }
}

export function bookingsText(bookings: Booking[], ctx: TemplateContext) {
  const upcoming = bookings.filter((booking) => booking.date >= ctx.today);
  if (upcoming.length === 0) return "You don't have any bookings yet.";
  const count =
    upcoming.length === 1 ? "one booking" : `${upcoming.length} bookings`;
  const lines = upcoming.map(
    (booking) =>
      `${where(booking, ctx)}, ${when(booking, ctx)}, under ${booking.name}.`,
  );
  return sentences(`You have ${count}.`, ...lines);
}

function askText(field: Field) {
  return bookVenue.fields.find((spec) => spec.name === field)?.ask.en ?? "";
}

function failureText(failure: Failure | null) {
  switch (failure?.rule) {
    case undefined:
      return null;
    case "unknown_city":
      return "I couldn't find that city.";
    case "past":
      return "That's already passed.";
    case "too_far":
      return "I can only book within the next week, while the forecast is reliable.";
    case "not_on_hour":
      return "Bookings start on the hour.";
    case "too_many":
      return `That venue fits up to ${failure.capacity} people.`;
    case "closed":
      return `It's open from ${hourText(failure.opensAt)} to ${hourText(failure.closesAt)}, and bookings must end by closing.`;
    case "taken":
      return "That slot is already booked.";
    case "heat":
      return `It'll feel like ${Math.round(failure.weather.apparentTemperature)} degrees outside. That's too hot.`;
    case "cold":
      return `It'll feel like ${Math.round(failure.weather.apparentTemperature)} degrees outside. That's too cold.`;
    case "wind":
      return `The wind will reach ${Math.round(failure.weather.windSpeed)} kilometers an hour. That's too windy.`;
    case "rain":
      return `The chance of rain is ${failure.weather.rainChance} percent.`;
    case "no_forecast":
      return "I can't get the forecast for that time.";
  }
}

function weatherText(weather: HourWeather) {
  const feels = Math.round(weather.apparentTemperature);
  const rain = weather.rainChance
    ? `a rain chance of ${weather.rainChance} percent`
    : "no rain expected";
  return `It should feel like ${feels} degrees, with ${rain}.`;
}

// Offers are all in the city the user asked for, so it isn't repeated.
function slotText(slot: Slot, ctx: TemplateContext) {
  return `${findVenue(slot.venueId, ctx).name} ${when(slot, ctx)}`;
}

function where(slot: Slot, ctx: TemplateContext) {
  return `${findVenue(slot.venueId, ctx).name} in ${slot.city}`;
}

function when(slot: Slot, ctx: TemplateContext) {
  return `${dayText(slot.date, ctx.today)} at ${hourText(slot.hour)}`;
}

function dayText(date: string, today: string) {
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  return `on ${weekday(date)}`;
}

export function hourText(hour: number) {
  if (hour === 0 || hour === 24) return "midnight";
  if (hour === 12) return "noon";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function sentences(...parts: (string | null)[]) {
  return parts.filter(Boolean).join(" ");
}
