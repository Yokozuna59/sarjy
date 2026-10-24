import type { Booking, Context, FlowState } from "~/engine/types";
import type { Memories } from "~/lib/turn";
import type { Interpretation } from "~/services/llm";
import { FORECAST_DAYS } from "~/engine/config";
import { resume, step } from "~/engine/engine";
import {
  bookingsText,
  dayText,
  hourText,
  rainText,
  render,
} from "~/engine/templates";
import { VENUES } from "~/engine/venues";
import { addDays, currentHour, TIME_FORMAT, today } from "~/lib/time";
import { geocode, getDayWeather, getHourWeather } from "~/services/weather";

export interface Reply {
  text: string;
  flow: FlowState;
  bookings: Booking[];
  cards: Booking[];
}

const INTRO =
  "I can book a padel court, a football pitch or a coffee shop table in " +
  "any city, and I check the weather first. What would you like?";

// The engine handles anything about the booking. Otherwise Sarjy answers
// the question, then picks the booking back up where it was.
export async function replyFor(
  interpretation: Interpretation,
  memories: Memories,
  flow: FlowState,
  bookings: Booking[],
): Promise<Reply> {
  const ctx = bookingContext(memories, bookings);
  const { state, action } = await step(flow, interpretation.booking, ctx);
  if (action.type === "booked") {
    return {
      text: render(action, ctx),
      flow: state,
      bookings: [...bookings, action.booking],
      cards: [action.booking],
    };
  }
  if (action.type !== "none") {
    return { text: render(action, ctx), flow: state, bookings, cards: [] };
  }

  // A weather question mid-booking is usually about the booking's city.
  const city = state.fields.city ?? memories.city;
  const answer = await answerFor(interpretation, city, ctx);
  const cards =
    interpretation.question?.kind === "bookings"
      ? bookings.filter((booking) => booking.date >= ctx.today)
      : [];
  if (state.status === "idle") {
    const general = interpretation.question?.kind === "general";
    const text = general ? `${answer} ${INTRO}` : (answer ?? INTRO);
    return { text, flow: state, bookings, cards };
  }
  const back = render(resume(state), ctx);
  const text = answer ? `${answer} Back to your booking. ${back}` : back;
  return { text, flow: state, bookings, cards };
}

function bookingContext(memories: Memories, bookings: Booking[]): Context {
  return {
    today: today(),
    // Falls back to Riyadh's clock if the city can't be looked up.
    nowIn: async (city) => {
      const place = await geocode(city).catch(() => null);
      const zone = place?.timezone;
      return { date: today(zone), hour: currentHour(zone) };
    },
    venues: VENUES,
    bookings,
    userName: memories.name ?? null,
    userCity: memories.city ?? null,
    findCity: async (name) => {
      const place = await geocode(name).catch(() => null);
      return place?.name ?? null;
    },
    // No forecast means no outdoor booking, so a failed fetch is safe.
    getWeather: async (city, date, hour) => {
      try {
        const place = await geocode(city);
        if (!place) return null;
        return await getHourWeather(place, date, hour);
      } catch {
        return null;
      }
    },
  };
}

async function answerFor(
  { question, remember }: Interpretation,
  city: string | undefined,
  ctx: Context,
): Promise<string | null> {
  if (question?.kind === "memory") {
    return question.answer ?? "I don't know that yet.";
  }
  if (question?.kind === "weather") {
    const place = question.place ?? city;
    return weatherReply(place, question.date, question.times, ctx);
  }
  if (question?.kind === "bookings") return bookingsText(ctx.bookings, ctx);
  // The LLM answers small talk only. Anything else gets this.
  if (question) {
    return (
      question.answer ?? "Sorry, I can only help with bookings and the weather."
    );
  }

  const name = remember.find((fact) => fact.key === "name")?.value;
  if (name) return `Nice to meet you, ${name}. I'll remember that.`;
  if (remember.length > 0) return "Got it. I'll remember that.";
  return null;
}

async function weatherReply(
  place: string | undefined,
  date: string | null,
  times: string[],
  ctx: Context,
) {
  if (!place) return "Which city? Tell me, and I'll check the weather.";

  const day = date ?? ctx.today;
  if (day < ctx.today || day >= addDays(ctx.today, FORECAST_DAYS)) {
    return `I can only check the next ${FORECAST_DAYS} days.`;
  }

  try {
    const found = await geocode(place);
    if (!found) return `I couldn't find ${place}.`;
    const label = `${found.name} ${dayText(day, ctx.today)}`;

    // One short sentence per hour asked about, up to three.
    const hours = times
      .filter((time) => TIME_FORMAT.test(time))
      .slice(0, 3)
      .map((time) => Number(time.slice(0, 2)));
    if (hours.length > 0) {
      const lines: string[] = [];
      for (const hour of hours) {
        const weather = await getHourWeather(found, day, hour);
        if (!weather) continue;
        lines.push(
          `${label} at ${hourText(hour)}: feels like ` +
            `${weather.apparentTemperature} degrees, with ` +
            `${rainText(weather.rainChance)}.`,
        );
      }
      return lines.join(" ") || "I couldn't get the forecast for that time.";
    }

    const forecast = await getDayWeather(found, day);
    return (
      `${label}: up to ${Math.round(forecast.high)} degrees, down to ` +
      `${Math.round(forecast.low)}, with ${rainText(forecast.rainChance)}.`
    );
  } catch {
    return "I couldn't get the forecast right now. Please try again.";
  }
}
