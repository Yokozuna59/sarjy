import type { Memories } from "~/lib/turn";
import { zodResponseFormat } from "openai/helpers/zod";
import * as z from "zod";
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
    })
    .nullable(),
});

export type Interpretation = z.infer<typeof interpretationSchema>;

const INTERPRET_PROMPT = [
  "You read one message from a user of Sarjy, a voice assistant that books",
  "padel courts, football pitches and coffee shop tables.",
  "remember: lasting facts about the user, like their name, city or",
  "favorite things. Use short snake_case keys such as name, city or",
  "favorite_color, and reuse a known key when a fact changes. Never store",
  "bookings, plans or questions.",
  "question: set it when the user asks something. kind is memory for",
  "questions about the user, weather, bookings for their bookings, or",
  "general. For memory questions, answer in one short sentence using only",
  "the known facts, or say you don't know yet. Otherwise answer is null.",
  "Use plain words and no em dashes.",
].join(" ");

export function interpret(text: string, memories: Memories) {
  return completeJson(interpretationSchema, "interpretation", [
    {
      role: "system",
      content: `${INTERPRET_PROMPT}\nKnown facts: ${JSON.stringify(memories)}`,
    },
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
