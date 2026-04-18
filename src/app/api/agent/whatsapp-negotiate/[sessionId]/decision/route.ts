import { NextResponse } from "next/server";
import { setNegotiationDecision } from "@/lib/server/negotiation-room";
import { getWhatsAppNegotiationStatus } from "@/lib/server/whatsapp-negotiation";
import { z } from "zod";

export const runtime = "nodejs";

const decisionSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const payload = await request.json();
    const parsed = decisionSchema.parse(payload);
    const { sessionId } = await context.params;

    await setNegotiationDecision(sessionId, parsed.decision);
    const negotiation = await getWhatsAppNegotiationStatus(sessionId);

    return NextResponse.json({ negotiation });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update WhatsApp negotiation decision.",
      },
      { status: 400 },
    );
  }
}
