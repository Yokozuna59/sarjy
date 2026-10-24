import { getClient, models } from "~/services/openai";

// Keeps accented English in English spelling, and spells the place names.
const PROMPT =
  "An English conversation with Sarjy, a booking assistant, about padel " +
  "courts, football pitches, coffee shop tables, the weather, and cities " +
  "like Riyadh, Khobar, Dammam and Jeddah.";

export async function transcribe(audio: File): Promise<string> {
  const transcription = await getClient().audio.transcriptions.create({
    file: audio,
    model: models.stt,
    language: "en",
    prompt: PROMPT,
  });
  return transcription.text.trim();
}
