import { NextResponse } from "next/server";
import { replyToNegotiationRoom } from "@/lib/server/negotiation-room";
import { z } from "zod";

export const runtime = "nodejs";

const replySchema = z.object({
  message: z.string().min(1, "message is required"),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const payload = await request.json();
    const parsed = replySchema.parse(payload);
    const { sessionId } = await context.params;
    const room = await replyToNegotiationRoom(sessionId, parsed.message);

    return NextResponse.json({ room });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to post negotiation reply.",
      },
      { status: 400 },
    );
  }
}
