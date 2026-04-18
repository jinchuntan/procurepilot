import { NextResponse } from "next/server";
import { replyToLatestOpenNegotiationRoom } from "@/lib/server/negotiation-room";
import { sendTwilioWhatsAppMessage } from "@/lib/server/whatsapp-negotiation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const payload = new URLSearchParams(rawBody);
    const sellerMessage = String(payload.get("Body") ?? "").trim();
    const sellerFrom = String(payload.get("From") ?? "").replace(/^whatsapp:/, "");

    if (!sellerMessage) {
      return new NextResponse("ok", { status: 200 });
    }

    const room = await replyToLatestOpenNegotiationRoom(sellerMessage);
    const latestBuyerMessage =
      [...room.messages].reverse().find((message) => message.role === "buyer")?.text ?? "";

    if (latestBuyerMessage) {
      await sendTwilioWhatsAppMessage(latestBuyerMessage, sellerFrom || undefined);
    }

    return new NextResponse("ok", { status: 200 });
  } catch {
    return new NextResponse("ok", { status: 200 });
  }
}
