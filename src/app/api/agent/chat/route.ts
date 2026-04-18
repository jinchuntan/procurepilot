import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { sendLiveLuaAgentMessage, getLiveLuaAgentStatus } from "@/lib/lua/live-chat";
import { z } from "zod";

export const runtime = "nodejs";

const chatRequestSchema = z.object({
  message: z.string().min(1, "message is required"),
  threadId: z.string().optional(),
});

export async function GET() {
  try {
    return NextResponse.json(getLiveLuaAgentStatus());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Lua agent is not configured.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = chatRequestSchema.parse(payload);
    const result = await sendLiveLuaAgentMessage(parsed.message, parsed.threadId || randomUUID());

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send message to the Lua agent.",
      },
      { status: 400 },
    );
  }
}
