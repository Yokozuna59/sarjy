import type { Booking, FlowState } from "~/engine/types";
import type { HistoryMessage, Memories, TurnResponse } from "~/lib/turn";
import * as z from "zod";
import { MAX_OFFERS } from "~/engine/config";
import { IDLE } from "~/engine/engine";
import { VENUES } from "~/engine/venues";
import { replyFor } from "~/lib/reply";
import { splitSentences } from "~/lib/sentences";
import {
  HISTORY_LENGTH,
  MAX_AUDIO_BYTES,
  MAX_MESSAGE_LENGTH,
} from "~/lib/turn";
import { interpret } from "~/services/llm";
import { friendlyError } from "~/services/openai";
import { transcribe } from "~/services/stt";

export const maxDuration = 60;

const memoriesSchema = z.record(z.string(), z.string().max(200)).default({});

const historySchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string().max(MAX_MESSAGE_LENGTH * 2),
    }),
  )
  .max(HISTORY_LENGTH)
  .default([]);

const slotSchema = z.object({
  venueId: z.string().refine((id) => VENUES.some((venue) => venue.id === id)),
  city: z.string().max(100),
  date: z.iso.date(),
  hour: z.number().int().min(0).max(23),
});

const bookingSchema = slotSchema.extend({
  minutes: z.number(),
  groupSize: z.number(),
  name: z.string().max(100),
});

const flowSchema = z
  .object({
    status: z.enum(["idle", "collecting", "offering", "confirming"]),
    fields: z.object({
      activity: z.enum(["padel", "football", "cafe"]).optional(),
      city: z.string().max(100).optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      group_size: z.number().optional(),
      booking_name: z.string().max(100).optional(),
      setting: z.enum(["indoor", "outdoor"]).optional(),
    }),
    pending: z
      .enum(["activity", "city", "date", "time", "group_size", "booking_name"])
      .nullable(),
    offers: z.array(slotSchema).max(MAX_OFFERS),
    draft: bookingSchema.nullable(),
  })
  .default(IDLE);

const bookingsSchema = z.array(bookingSchema).max(100).default([]);

const textSchema = z.object({
  text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  memories: memoriesSchema,
  history: historySchema,
  flow: flowSchema,
  bookings: bookingsSchema,
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
  history: HistoryMessage[];
  flow: FlowState;
  bookings: Booking[];
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

    const interpretation = await interpret(
      input.text,
      input.memories,
      input.history,
      input.flow,
    );
    const facts = interpretation.remember.map((f) => [f.key, f.value]);
    const memories = { ...input.memories, ...Object.fromEntries(facts) };
    const reply = await replyFor(
      interpretation,
      memories,
      input.flow,
      input.bookings,
    );
    const response: TurnResponse = {
      userText: input.text,
      reply: { text: reply.text, sentences: splitSentences(reply.text) },
      memories,
      flow: reply.flow,
      bookings: reply.bookings,
    };
    return Response.json(response);
  } catch (error) {
    const message = friendlyError(error);
    if (!message) throw error;
    return Response.json({ error: message }, { status: 503 });
  }
}

async function readText(request: Request): Promise<TurnInput | null> {
  const body = textSchema.safeParse(await request.json().catch(() => null));
  return body.success ? body.data : null;
}

async function readAudio(request: Request): Promise<TurnInput | null> {
  const form = await request.formData().catch(() => null);
  const audio = audioSchema.safeParse(form?.get("audio"));
  const memories = memoriesSchema.safeParse(parseJson(form?.get("memories")));
  const history = historySchema.safeParse(parseJson(form?.get("history")));
  const flow = flowSchema.safeParse(parseJson(form?.get("flow")));
  const bookings = bookingsSchema.safeParse(parseJson(form?.get("bookings")));
  if (
    !audio.success ||
    !memories.success ||
    !history.success ||
    !flow.success ||
    !bookings.success
  ) {
    return null;
  }
  return {
    text: await transcribe(audio.data),
    memories: memories.data,
    history: history.data,
    flow: flow.data,
    bookings: bookings.data,
  };
}

function parseJson(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
