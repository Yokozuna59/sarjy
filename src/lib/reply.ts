import type { Memories } from "~/lib/turn";
import type { Interpretation } from "~/services/llm";
import { addDays, today, weekday } from "~/lib/time";
import { geocode, getDayForecast } from "~/services/weather";

const FORECAST_DAYS = 7;

// Templates decide the reply until the flow engine does (step 6).
export async function replyFor(
  { question, remember }: Interpretation,
  memories: Memories,
): Promise<string> {
  if (question?.kind === "memory") {
    return question.answer ?? "I don't know that yet.";
  }
  if (question?.kind === "weather") {
    return weatherReply(question.place ?? memories.city, question.date);
  }
  if (question) return "I can't check that yet.";

  const name = remember.find((fact) => fact.key === "name")?.value;
  if (name) return `Nice to meet you, ${name}. I'll remember that.`;
  if (remember.length > 0) return "Got it. I'll remember that.";
  return (
    "Booking is coming soon. " +
    "For now, tell me about yourself and I'll remember it."
  );
}

async function weatherReply(place: string | undefined, date: string | null) {
  if (!place) return "Which city? Tell me, and I'll check the weather.";

  const now = today();
  const day = date ?? now;
  if (day < now || day >= addDays(now, FORECAST_DAYS)) {
    return `I can only check the next ${FORECAST_DAYS} days.`;
  }

  try {
    const found = await geocode(place);
    if (!found) return `I couldn't find ${place}.`;
    const forecast = await getDayForecast(found, day);
    const rain =
      forecast.rainChance < 10
        ? "and no rain expected"
        : `with a ${forecast.rainChance}% chance of rain`;
    return (
      `${dayLabel(day, now)} in ${found.name}: up to ` +
      `${Math.round(forecast.high)} degrees, down to ` +
      `${Math.round(forecast.low)}, ${rain}.`
    );
  } catch {
    return "I couldn't get the forecast right now. Please try again.";
  }
}

function dayLabel(day: string, now: string) {
  if (day === now) return "Today";
  if (day === addDays(now, 1)) return "Tomorrow";
  return `On ${weekday(day)}`;
}
