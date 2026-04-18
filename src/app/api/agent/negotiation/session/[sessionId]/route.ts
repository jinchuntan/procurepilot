import { NextResponse } from "next/server";
import { getNegotiationRoom } from "@/lib/server/negotiation-room";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const room = await getNegotiationRoom(sessionId);

    return NextResponse.json({ room });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load negotiation session.",
      },
      { status: 404 },
    );
  }
}
