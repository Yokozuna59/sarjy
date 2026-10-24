import type { Memories, TurnResponse } from "~/lib/turn";
import type { Interpretation } from "~/services/llm";
import * as z from "zod";
import { splitSentences } from "~/lib/sentences";
import { MAX_AUDIO_BYTES, MAX_MESSAGE_LENGTH } from "~/lib/turn";
import { interpret } from "~/services/llm";
import { friendlyError } from "~/services/openai";
import { transcribe } from "~/services/stt";

export const maxDuration = 60;

const memoriesSchema = z.record(z.string(), z.string().max(200)).default({});

const textSchema = z.object({
  text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  memories: memoriesSchema,
});

const audioSchema = z.file().min(1).max(MAX_AUDIO_BYTES).mime("audio/wav");

const errors = {
  text: `Send { "text" } with 1 to ${MAX_MESSAGE_LENGTH} characters.`,
  audio: `Send an "audio" WAV file of up to ${MAX_AUDIO_BYTES / 1024 ** 2} MB.`,
  silence: "I didn't catch that.",
};

interface TurnInput {
  text: string;
  memories: Memories;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const isAudio = contentType.startsWith("multipart/form-data");

  try {
    const input = isAudio ? await readAudio(request) : await readText(request);
    if (!input) {
      const error = isAudio ? errors.audio : errors.text;
      return Response.json({ error }, { status: 400 });
    }
    if (!input.text) {
      return Response.json({ error: errors.silence }, { status: 422 });
    }

    const interpretation = await interpret(input.text, input.memories);
    const facts = interpretation.remember.map((f) => [f.key, f.value]);
    const text = replyFor(interpretation);
    const response: TurnResponse = {
      userText: input.text,
      reply: { text, sentences: splitSentences(text) },
      memories: { ...input.memories, ...Object.fromEntries(facts) },
    };
    return Response.json(response);
  } catch (error) {
    const message = friendlyError(error);
    if (!message) throw error;
    return Response.json({ error: message }, { status: 503 });
  }
}

// Templates decide the reply until the flow engine does (step 6).
function replyFor({ question, remember }: Interpretation) {
  if (question?.kind === "memory") {
    return question.answer ?? "I don't know that yet.";
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

async function readText(request: Request): Promise<TurnInput | null> {
  const body = textSchema.safeParse(await request.json().catch(() => null));
  return body.success ? body.data : null;
}

async function readAudio(request: Request): Promise<TurnInput | null> {
  const form = await request.formData().catch(() => null);
  const audio = audioSchema.safeParse(form?.get("audio"));
  const memories = memoriesSchema.safeParse(parseJson(form?.get("memories")));
  if (!audio.success || !memories.success) return null;
  return { text: await transcribe(audio.data), memories: memories.data };
}

function parseJson(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
