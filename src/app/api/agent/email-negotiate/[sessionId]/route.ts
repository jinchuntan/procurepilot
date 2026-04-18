import { NextResponse } from "next/server";
import { getEmailNegotiationStatus } from "@/lib/server/email-negotiation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const negotiation = await getEmailNegotiationStatus(sessionId);

    return NextResponse.json({ negotiation });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load email negotiation status.",
      },
      { status: 400 },
    );
  }
}
