import { getClient, MODELS } from "~/services/openai";

export function speak(text: string): Promise<Response> {
  return getClient().audio.speech.create({
    model: MODELS.tts,
    voice: MODELS.ttsVoice,
    input: text,
    response_format: "wav",
    instructions: "Speak in a warm, friendly tone.",
  });
}
