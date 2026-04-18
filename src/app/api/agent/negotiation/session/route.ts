import { NextResponse } from "next/server";
import { createNegotiationRoom } from "@/lib/server/negotiation-room";
import { z } from "zod";

export const runtime = "nodejs";

const createSessionSchema = z.object({
  requestId: z.string().min(1),
  recommendationKey: z.enum(["overall", "lowCost", "fastest", "balanced"]),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = createSessionSchema.parse(payload);
    const room = await createNegotiationRoom(parsed.requestId, parsed.recommendationKey);

    return NextResponse.json({
      room,
      href: `/negotiate/${room.session.id}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create negotiation session.",
      },
      { status: 400 },
    );
  }
}
