import { getClient, models } from "~/services/openai";

export async function transcribe(audio: File): Promise<string> {
  const transcription = await getClient().audio.transcriptions.create({
    file: audio,
    model: models.stt,
  });
  return transcription.text.trim();
}
