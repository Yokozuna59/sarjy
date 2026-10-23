import * as z from "zod";
import { MAX_MESSAGE_LENGTH } from "~/lib/turn";
import { speak } from "~/services/tts";

const textSchema = z.string().trim().min(1).max(MAX_MESSAGE_LENGTH);

export async function GET(request: Request) {
  const text = textSchema.safeParse(
    new URL(request.url).searchParams.get("text"),
  );
  if (!text.success) {
    return Response.json(
      { error: `Send ?text= with 1 to ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const audio = await speak(text.data);
  return new Response(audio.body, {
    headers: { "Content-Type": "audio/wav" },
  });
}
