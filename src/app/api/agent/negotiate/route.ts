import { NextResponse } from "next/server";
import { assessmentRouteSchema } from "@/lib/procurement-schemas";
import { negotiateRecommendationByRequestId } from "@/lib/lua/runtime";
import { z } from "zod";

export const runtime = "nodejs";

const negotiationRouteSchema = assessmentRouteSchema.extend({
  recommendationKey: z.enum(["overall", "lowCost", "fastest", "balanced"]),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = negotiationRouteSchema.parse(payload);
    const result = await negotiateRecommendationByRequestId(
      parsed.requestId,
      parsed.recommendationKey,
      parsed.weights,
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run supplier negotiation.",
      },
      { status: 400 },
    );
  }
}
