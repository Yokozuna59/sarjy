import type { Booking, FlowState } from "~/engine/types";

export const MAX_MESSAGE_LENGTH = 1000;

// Vercel rejects request bodies over 4.5 MB.
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export type Memories = Record<string, string>;

// How many earlier messages each turn sends as context.
export const HISTORY_LENGTH = 6;

export interface HistoryMessage {
  role: "user" | "assistant";
  text: string;
}

export interface TurnResponse {
  userText: string;
  reply: { text: string; sentences: string[] };
  memories: Memories;
  flow: FlowState;
  bookings: Booking[];
}

export interface TurnError {
  error: string;
}
