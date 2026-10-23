import type { TurnResponse } from "~/lib/turn";
import * as z from "zod";
import { MAX_AUDIO_BYTES, MAX_MESSAGE_LENGTH } from "~/lib/turn";
import { transcribe } from "~/services/stt";

export const maxDuration = 60;

const textSchema = z.object({
  text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

const audioSchema = z.file().min(1).max(MAX_AUDIO_BYTES).mime("audio/wav");

const errors = {
  text: `Send { "text" } with 1 to ${MAX_MESSAGE_LENGTH} characters.`,
  audio: `Send an "audio" WAV file of up to ${MAX_AUDIO_BYTES / 1024 ** 2} MB.`,
  silence: "I didn't catch that.",
};

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const isAudio = contentType.startsWith("multipart/form-data");

  const userText = isAudio ? await readAudio(request) : await readText(request);
  if (userText === null) {
    const error = isAudio ? errors.audio : errors.text;
    return Response.json({ error }, { status: 400 });
  }
  if (!userText) {
    return Response.json({ error: errors.silence }, { status: 422 });
  }

  // Echo until the LLM and the flow engine are wired in.
  const response: TurnResponse = {
    userText,
    reply: { text: `You said: ${userText}` },
  };
  return Response.json(response);
}

async function readText(request: Request) {
  const body = textSchema.safeParse(await request.json().catch(() => null));
  return body.success ? body.data.text : null;
}

async function readAudio(request: Request) {
  const form = await request.formData().catch(() => null);
  const audio = audioSchema.safeParse(form?.get("audio"));
  return audio.success ? transcribe(audio.data) : null;
}
