import OpenAI from "openai";

// The SDK also reads OPENAI_BASE_URL, to use another OpenAI-compatible API.
export const MODELS = {
  stt: process.env.STT_MODEL || "gpt-4o-mini-transcribe",
  llm: process.env.LLM_MODEL || "gpt-6-luna",
  tts: process.env.TTS_MODEL || "gpt-4o-mini-tts",
  ttsVoice: process.env.TTS_VOICE || "marin",
};

let client: OpenAI | undefined;

// Lazy: the constructor throws without OPENAI_API_KEY, which breaks builds.
export function getClient() {
  client ??= new OpenAI();
  return client;
}

export function friendlyError(error: unknown): string | null {
  if (!(error instanceof OpenAI.APIError) || error.status !== 429) {
    return null;
  }
  return error.code === "insufficient_quota"
    ? "Sarjy is out of credit right now. Please try again later."
    : "Sarjy is busy right now. Please try again in a moment.";
}
