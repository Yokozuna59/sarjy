import type {
  Action,
  Booking,
  Context,
  Failure,
  Field,
  HourWeather,
  Slot,
} from "~/engine/types";
import { findVenue } from "~/data/venues";
import { BOOK_VENUE } from "~/engine/flows/book-venue";
import { addDays, clockTime, weekday } from "~/lib/time";

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
      const details = [where(booking, ctx), when(booking, ctx)];
      if (booking.groupSize) {
        details.push(`for ${peopleText(booking.groupSize)}`);
      }
      details.push(`under ${booking.name}`);
      return sentences(
        `${details.join(", ")}.`,
        weather && weatherText(weather),
        "Shall I book it?",
      );
    }
    case "booked": {
      const { booking } = action;
      const slot = `${where(booking, ctx)} ${when(booking, ctx)}`;
      return `Done. You're booked at ${slot}.`;
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

export function dayText(date: string, today: string) {
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  return `on ${weekday(date)}`;
}

export function rainText(chance: number) {
  return chance ? `a rain chance of ${chance} percent` : "no rain expected";
}

export function peopleText(count: number) {
  return count === 1 ? "1 person" : `${count} people`;
}

function askText(field: Field) {
  return BOOK_VENUE.fields.find((spec) => spec.name === field)?.ask.en ?? "";
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
      return "I can only book a week ahead, while the forecast is reliable.";
    case "not_on_hour":
      return "Bookings start on the hour.";
    case "too_many":
      return `That venue fits up to ${failure.capacity} people.`;
    case "closed": {
      const opens = clockTime(failure.opensAt * 60);
      const closes = clockTime(failure.closesAt * 60);
      return sentences(
        `It's open from ${opens} to ${closes}.`,
        "Bookings must end by closing.",
      );
    }
    case "taken":
      return "That slot is already booked.";
    case "heat":
    case "cold": {
      const feels = failure.weather.apparentTemperature;
      const verdict = failure.rule === "heat" ? "too hot" : "too cold";
      return `It'll feel like ${feels} degrees outside. That's ${verdict}.`;
    }
    case "wind": {
      const wind = failure.weather.windSpeed;
      return sentences(
        `The wind will reach ${wind} kilometers an hour.`,
        "That's too windy.",
      );
    }
    case "rain":
      return `The chance of rain is ${failure.weather.rainChance} percent.`;
    case "no_forecast":
      return "I can't get the forecast for that time.";
  }
}

function weatherText(weather: HourWeather) {
  const feels = weather.apparentTemperature;
  const rain = rainText(weather.rainChance);
  return `It should feel like ${feels} degrees, with ${rain}.`;
}

// Offers are all in the city the user asked for, so it isn't repeated.
function slotText(slot: Slot, ctx: TemplateContext) {
  return `${findVenue(slot.venueId, ctx.venues).name} ${when(slot, ctx)}`;
}

function where(slot: Slot, ctx: TemplateContext) {
  return `${findVenue(slot.venueId, ctx.venues).name} in ${slot.city}`;
}

function when(slot: Slot, ctx: TemplateContext) {
  return `${dayText(slot.date, ctx.today)} at ${clockTime(slot.hour * 60)}`;
}

function sentences(...parts: (string | null)[]) {
  return parts.filter(Boolean).join(" ");
}
