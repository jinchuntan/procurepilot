import { NextResponse } from "next/server";
import { getWhatsAppNegotiationStatus } from "@/lib/server/whatsapp-negotiation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const negotiation = await getWhatsAppNegotiationStatus(sessionId);

    return NextResponse.json({ negotiation });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load WhatsApp negotiation status.",
      },
      { status: 404 },
    );
  }
}
