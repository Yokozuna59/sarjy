import type { HistoryMessage, Memories } from "~/lib/turn";
import { zodResponseFormat } from "openai/helpers/zod";
import * as z from "zod";
import { today, weekday } from "~/lib/time";
import { getClient, models } from "~/services/openai";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const interpretationSchema = z.object({
  remember: z.array(z.object({ key: z.string(), value: z.string() })),
  question: z
    .object({
      kind: z.enum(["memory", "weather", "bookings", "general"]),
      answer: z.string().nullable(),
      place: z.string().nullable(),
      date: z.string().nullable(),
    })
    .nullable(),
});

export type Interpretation = z.infer<typeof interpretationSchema>;

const INTERPRET_PROMPT = [
  "You read the last message from a user of Sarjy, a voice assistant that",
  "books padel courts, football pitches and coffee shop tables. Earlier",
  "messages are context. If the last message answers Sarjy's question,",
  "like a city after Sarjy asks which city, fill in that question.",
  "remember: lasting facts about the user, like their name, city or",
  "favorite things. Use short snake_case keys such as name, city or",
  "favorite_color, and reuse a known key when a fact changes. Never store",
  "bookings, plans, questions, or a city named only for a question.",
  "question: set it when the user asks something. kind is memory for",
  "questions about the user, weather, bookings for their bookings, or",
  "general. For memory questions, answer in one short sentence using only",
  "the known facts, or say you don't know yet. Otherwise answer is null.",
  "For weather questions, place is the city in English, or null, and date is",
  "the day asked about as YYYY-MM-DD, or null for today. For a period,",
  "like next month, use its first day. Otherwise both are null.",
  "Use plain words and no em dashes.",
].join(" ");

export function interpret(
  text: string,
  memories: Memories,
  history: HistoryMessage[],
) {
  const date = today();
  const context = [
    `Today is ${weekday(date)}, ${date}.`,
    `Known facts: ${JSON.stringify(memories)}`,
  ].join("\n");
  return completeJson(interpretationSchema, "interpretation", [
    { role: "system", content: `${INTERPRET_PROMPT}\n${context}` },
    ...history.map(({ role, text }) => ({ role, content: text })),
    { role: "user", content: text },
  ]);
}

export async function completeJson<Schema extends z.ZodType>(
  schema: Schema,
  name: string,
  messages: LlmMessage[],
) {
  const completion = await getClient().chat.completions.parse({
    model: models.llm,
    messages,
    reasoning_effort: "none",
    response_format: zodResponseFormat(schema, name),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("The LLM returned no structured output.");
  }
  return parsed;
}

export async function completeText(messages: LlmMessage[]): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: models.llm,
    messages,
    reasoning_effort: "none",
  });
  const text = completion.choices[0]?.message.content?.trim();
  if (!text) {
    throw new Error("The LLM returned an empty reply.");
  }
  return text;
}
