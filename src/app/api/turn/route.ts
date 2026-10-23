import type { TurnResponse } from "~/lib/turn";
import * as z from "zod";
import { MAX_MESSAGE_LENGTH } from "~/lib/turn";

const turnRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export async function POST(request: Request) {
  const body = turnRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return Response.json(
      {
        error:
          'Send JSON like { "text": "Hello" }, ' +
          `up to ${MAX_MESSAGE_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  // Placeholder until memory, the LLM and the flow engine are wired in.
  const { text } = body.data;
  const response: TurnResponse = {
    userText: text,
    reply: { text: `You said: ${text}` },
  };
  return Response.json(response);
}
