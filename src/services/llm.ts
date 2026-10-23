import type * as z from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getClient, models } from "~/services/openai";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
