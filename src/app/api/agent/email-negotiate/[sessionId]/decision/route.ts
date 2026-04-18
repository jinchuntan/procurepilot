import { NextResponse } from "next/server";
import { z } from "zod";
import { getEmailNegotiationStatus } from "@/lib/server/email-negotiation";
import { setNegotiationDecision } from "@/lib/server/negotiation-room";

export const runtime = "nodejs";

const decisionSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const payload = await request.json();
    const parsed = decisionSchema.parse(payload);

    await setNegotiationDecision(sessionId, parsed.decision);
    const negotiation = await getEmailNegotiationStatus(sessionId);

    return NextResponse.json({ negotiation });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update email negotiation decision.",
      },
      { status: 400 },
    );
  }
}
