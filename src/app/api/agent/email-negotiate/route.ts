import { NextResponse } from "next/server";
import { z } from "zod";
import { startEmailNegotiation } from "@/lib/server/email-negotiation";

export const runtime = "nodejs";

const negotiationSchema = z.object({
  requestId: z.string().min(1),
  recommendationKey: z.enum(["overall", "lowCost", "fastest", "balanced"]),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = negotiationSchema.parse(payload);
    const result = await startEmailNegotiation(parsed.requestId, parsed.recommendationKey);

    return NextResponse.json({ negotiation: result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to start email negotiation.",
      },
      { status: 400 },
    );
  }
}
