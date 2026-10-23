import { getClient, models } from "~/services/openai";

export function speak(text: string): Promise<Response> {
  return getClient().audio.speech.create({
    model: models.tts,
    voice: models.ttsVoice,
    input: text,
    response_format: "wav",
    instructions: "Speak in a warm, friendly tone.",
  });
}
