import type { FlowState } from "~/engine/types";
import type { HistoryMessage, Memories } from "~/lib/turn";
import { zodResponseFormat } from "openai/helpers/zod";
import * as z from "zod";
import { findVenue, settingOf, VENUES } from "~/engine/venues";
import { today, weekday } from "~/lib/time";
import { getClient, models } from "~/services/openai";

interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// booking comes first: with it last, the model often kept writing
// whitespace after the JSON until it ran out of tokens (4 of 5 tries).
const interpretationSchema = z.object({
  booking: z.object({
    intent: z.enum([
      "booking",
      "choose_offer",
      "confirm",
      "deny",
      "cancel",
      "other",
    ]),
    fields: z.object({
      activity: z.enum(["padel", "football", "cafe"]).nullable(),
      city: z.string().nullable(),
      date: z.string().nullable(),
      time: z.string().nullable(),
      group_size: z.number().nullable(),
      booking_name: z.string().nullable(),
      setting: z.enum(["indoor", "outdoor"]).nullable(),
    }),
    offer_index: z.number().nullable(),
  }),
  remember: z.array(z.object({ key: z.string(), value: z.string() })),
  question: z
    .object({
      kind: z.enum(["memory", "weather", "bookings", "general"]),
      answer: z.string().nullable(),
      place: z.string().nullable(),
      date: z.string().nullable(),
      times: z.array(z.string()),
    })
    .nullable(),
});

export type Interpretation = z.infer<typeof interpretationSchema>;

// In the schema's order: booking, then remember, then question.
const INTERPRET_PROMPT = `
You read the last message from a user of Sarjy, a voice assistant that books
padel courts, football pitches and coffee shop tables. Earlier messages are
context. If the last message answers Sarjy's question, like a city after
Sarjy asks which city for the weather, fill in that question.

booking: intent is booking when the user wants to book, or gives or changes
booking details, even when asked like 'Can I book a court?'. It is
choose_offer when they pick one of Sarjy's offers, with offer_index counting
from 0. It is confirm for yes, deny for no, cancel to stop the booking, and
other for anything else.

fields holds what the last message says, and null for the rest. When Sarjy
just asked for a field, a short answer fills it: '4 p.m.' is the time, 'two'
is the group_size. activity is padel, football, or cafe for a coffee shop
table. city is where to book, as its common English name. If it's in Arabic
letters or sounds misheard, use the well-known city it most likely means.
Users are often in Saudi Arabia, so think of Riyadh, Jeddah, Mecca, Medina,
Dammam, Al Khobar and Dhahran first. date is YYYY-MM-DD. time is 24-hour
HH:MM, and a time from 1 to 11 with no AM or PM is PM. group_size includes
the user. booking_name is the name to book under, in English letters. Don't
remember it as the user's name unless they say it's theirs. setting is
indoor or outdoor.

remember: lasting facts about the user, like their name, city or favorite
things. Use short snake_case keys such as name, city or favorite_color, and
reuse a known key when a fact changes. Never store bookings, plans,
questions, or a city named only for a question or a booking.

question: set it when the user asks something, but a request to book is not
a question. kind is memory for questions about the user, weather for any
weather question (rain or heat at an offered time too), bookings for their
bookings, or general.

For memory questions, answer in one short sentence using only the known
facts, or say you don't know yet. Only for small talk, like hello, how are
you or thanks, answer in one short friendly sentence ending with a period.
For anything else, like facts or general knowledge, answer is null.

For weather questions, place is the city in English or null, date is the day
as YYYY-MM-DD or null for today, and times lists every hour they mention as
HH:MM, or is empty for the whole day. For a period, like next month, use its
first day. While Sarjy is offering or confirming a booking, a weather
question with no time, like 'rain tomorrow?', is about those slots: use
their city, date and times. For other kinds, place and date are null and
times is empty.

Use plain words and no em dashes.
`.trim();

export function interpret(
  text: string,
  memories: Memories,
  history: HistoryMessage[],
  flow: FlowState,
) {
  const date = today();
  const context = [
    `Today is ${weekday(date)}, ${date}.`,
    `Known facts: ${JSON.stringify(memories)}`,
    describeFlow(flow),
  ].join("\n");
  return completeJson(interpretationSchema, "interpretation", [
    { role: "system", content: `${INTERPRET_PROMPT}\n\n${context}` },
    ...history.map(({ role, text }) => ({ role, content: text })),
    { role: "user", content: text },
  ]);
}

function describeFlow({ status, fields, pending, offers }: FlowState) {
  if (status === "idle") return "No booking in progress.";
  const lines = [`Booking so far: ${JSON.stringify(fields)}`];
  if (pending) lines.push(`Sarjy asked for: ${pending}`);
  for (const [index, offer] of offers.entries()) {
    const venue = findVenue(offer.venueId, VENUES);
    const time = `${String(offer.hour).padStart(2, "0")}:00`;
    lines.push(
      `Offer ${index}: ${venue.name} (${settingOf(venue)}), ` +
        `${offer.city}, ${offer.date} at ${time}`,
    );
  }
  if (status === "confirming") lines.push("Sarjy asked to confirm.");
  return lines.join("\n");
}

async function completeJson<Schema extends z.ZodType>(
  schema: Schema,
  name: string,
  messages: LlmMessage[],
) {
  const completion = await getClient().chat.completions.parse({
    model: models.llm,
    messages,
    reasoning_effort: "none",
    // At the default temperature, a plain "9 p.m." was sometimes missed.
    temperature: 0,
    // A normal reply is about 100 tokens. This stops a runaway in seconds.
    max_completion_tokens: 500,
    response_format: zodResponseFormat(schema, name),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("The LLM returned no structured output.");
  }
  return parsed;
}
