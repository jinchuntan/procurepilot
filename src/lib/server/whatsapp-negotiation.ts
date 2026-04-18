import "server-only";

import { createNegotiationRoom, getNegotiationRoom } from "@/lib/server/negotiation-room";
import { RecommendationKey, WhatsAppNegotiationStatus } from "@/lib/types";

const SELLER_WHATSAPP_NUMBER = process.env.SELLER_WHATSAPP_NUMBER ?? "+601124215639";
const NORMALIZED_WHATSAPP_NUMBER = SELLER_WHATSAPP_NUMBER.replace(/[^\d]/g, "");

function toWhatsAppAddress(value: string) {
  const normalized = value.startsWith("whatsapp:") ? value : `whatsapp:${value}`;
  return normalized;
}

function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${NORMALIZED_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function hasTwilioWhatsAppConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM,
  );
}

export async function sendTwilioWhatsAppMessage(body: string, to = SELLER_WHATSAPP_NUMBER) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio WhatsApp is not configured.");
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: toWhatsAppAddress(from),
        To: toWhatsAppAddress(to),
        Body: body,
      }).toString(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const payload = (await response.json()) as {
      message?: string;
      code?: number;
      more_info?: string;
    };

    throw new Error(payload.message ?? "Failed to send WhatsApp message through Twilio.");
  }
}

function buildStatus(
  room: Awaited<ReturnType<typeof getNegotiationRoom>>,
  options: {
    delivery: WhatsAppNegotiationStatus["delivery"];
    detail: string;
    canAutoSend: boolean;
    whatsappUrl?: string;
    actionRequired?: string;
  },
): WhatsAppNegotiationStatus {
  const latestBuyerMessage =
    [...room.messages].reverse().find((message) => message.role === "buyer")?.text ??
    "Buyer message unavailable.";

  return {
    sessionId: room.session.id,
    requestId: room.session.requestId,
    recommendationKey: room.session.recommendationKey,
    supplierName: room.session.supplierName,
    phoneNumber: SELLER_WHATSAPP_NUMBER,
    delivery: options.delivery,
    headline:
      options.delivery === "waiting_reply"
        ? "AI agent is negotiating with the seller on WhatsApp."
        : options.delivery === "deal_ready"
          ? "A WhatsApp deal is ready for buyer approval."
          : options.delivery === "accepted"
            ? "The buyer accepted the WhatsApp deal."
            : options.delivery === "rejected"
              ? "The buyer rejected the WhatsApp deal."
          : "AI agent is preparing the WhatsApp negotiation.",
    detail: options.detail,
    latestBuyerMessage,
    whatsappUrl: options.whatsappUrl,
    canAutoSend: options.canAutoSend,
    actionRequired: options.actionRequired,
  };
}

export async function startWhatsAppNegotiation(
  requestId: string,
  recommendationKey: RecommendationKey,
): Promise<WhatsAppNegotiationStatus> {
  const room = await createNegotiationRoom(requestId, recommendationKey);
  const latestBuyerMessage =
    [...room.messages].reverse().find((message) => message.role === "buyer")?.text ??
    "Buyer message unavailable.";

  if (hasTwilioWhatsAppConfig()) {
    await sendTwilioWhatsAppMessage(latestBuyerMessage);

    return buildStatus(room, {
      delivery: "waiting_reply",
      detail:
        "The opening buyer message was sent through Twilio WhatsApp. ProcurePilot is now waiting for the seller reply and will continue the negotiation off-platform.",
      canAutoSend: true,
    });
  }

  return buildStatus(room, {
    delivery: "drafted",
    detail:
      "This app generated the buyer opening message and a WhatsApp handoff, but autonomous send/reply still needs Twilio WhatsApp credentials on this machine.",
    canAutoSend: false,
    whatsappUrl: buildWhatsAppUrl(latestBuyerMessage),
    actionRequired:
      "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM to let the agent send and continue the negotiation automatically.",
  });
}

export async function getWhatsAppNegotiationStatus(sessionId: string) {
  const room = await getNegotiationRoom(sessionId);

  if (room.session.status === "closed") {
    return buildStatus(room, {
      delivery: "deal_ready",
      detail:
        "The seller has accepted the commercial terms in the hidden negotiation session. The buyer can now accept or reject the final deal.",
      canAutoSend: hasTwilioWhatsAppConfig(),
    });
  }

  if (room.session.status === "accepted") {
    return buildStatus(room, {
      delivery: "accepted",
      detail: "The buyer accepted the negotiated WhatsApp deal.",
      canAutoSend: hasTwilioWhatsAppConfig(),
    });
  }

  if (room.session.status === "rejected") {
    return buildStatus(room, {
      delivery: "rejected",
      detail: "The buyer rejected the negotiated WhatsApp deal.",
      canAutoSend: hasTwilioWhatsAppConfig(),
    });
  }

  return buildStatus(room, {
    delivery: hasTwilioWhatsAppConfig() ? "waiting_reply" : "drafted",
    detail: hasTwilioWhatsAppConfig()
      ? "ProcurePilot is still waiting for the seller reply on WhatsApp."
      : "Twilio WhatsApp is not configured yet, so the opening message is still in drafted handoff mode.",
    canAutoSend: hasTwilioWhatsAppConfig(),
    whatsappUrl: hasTwilioWhatsAppConfig()
      ? undefined
      : buildWhatsAppUrl(
          [...room.messages].reverse().find((message) => message.role === "buyer")?.text ??
            "",
        ),
  });
}
