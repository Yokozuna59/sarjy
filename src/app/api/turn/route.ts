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
      // Sarjy's replies, like a list of bookings, can be longer.
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

const weatherSchema = z.object({
  apparentTemperature: z.number(),
  windSpeed: z.number(),
  rainChance: z.number(),
});

const bookingSchema = slotSchema.extend({
  minutes: z.number(),
  groupSize: z.number(),
  name: z.string().max(100),
  // Bookings saved before the card showed the forecast have none.
  weather: weatherSchema.nullable().default(null),
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

// What the browser keeps and sends with every turn.
const storedSchema = z.object({
  memories: memoriesSchema,
  history: historySchema,
  flow: flowSchema,
  bookings: bookingsSchema,
});

const textSchema = storedSchema.extend({
  text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

const audioSchema = storedSchema.extend({
  audio: z.file().min(1).max(MAX_AUDIO_BYTES).mime("audio/wav"),
});

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
    const facts = interpretation.remember.map((fact) => [fact.key, fact.value]);
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
      cards: reply.cards,
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

// Next to the WAV file, the stored state comes as JSON strings.
async function readAudio(request: Request): Promise<TurnInput | null> {
  const form = await request.formData().catch(() => null);
  const body = audioSchema.safeParse({
    audio: form?.get("audio"),
    memories: parseJson(form?.get("memories")),
    history: parseJson(form?.get("history")),
    flow: parseJson(form?.get("flow")),
    bookings: parseJson(form?.get("bookings")),
  });
  if (!body.success) return null;
  const { audio, ...stored } = body.data;
  return { ...stored, text: await transcribe(audio) };
}

function parseJson(value: FormDataEntryValue | null | undefined) {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
