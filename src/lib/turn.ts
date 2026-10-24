export const MAX_MESSAGE_LENGTH = 1000;

// Vercel rejects request bodies over 4.5 MB.
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export type Memories = Record<string, string>;

export interface TurnResponse {
  userText: string;
  reply: { text: string; sentences: string[] };
  memories: Memories;
}

export interface TurnError {
  error: string;
}
