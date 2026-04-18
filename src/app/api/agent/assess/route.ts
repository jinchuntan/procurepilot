import { NextResponse } from "next/server";
import { assessmentRouteSchema } from "@/lib/procurement-schemas";
import { assessRequestById, getLuaAgentHealth } from "@/lib/lua/runtime";

export const runtime = "nodejs";

export async function GET() {
  const health = await getLuaAgentHealth();
  return NextResponse.json(health);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = assessmentRouteSchema.parse(payload);
    const assessment = await assessRequestById(parsed.requestId, parsed.weights);

    return NextResponse.json(assessment);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run Lua assessment.",
      },
      { status: 400 },
    );
  }
}
