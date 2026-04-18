import "server-only";

import { getNegotiationRoom, createNegotiationRoom } from "@/lib/server/negotiation-room";
import { EmailNegotiationStatus, RecommendationKey } from "@/lib/types";

const NEGOTIATION_SENDER_EMAIL =
  process.env.NEGOTIATION_SENDER_EMAIL ?? "nigeltanjc@gmail.com";
const NEGOTIATION_RECIPIENT_EMAIL =
  process.env.NEGOTIATION_RECIPIENT_EMAIL ?? "chunchun266@gmail.com";

function buildEmailSubject(
  room: Awaited<ReturnType<typeof getNegotiationRoom>>,
) {
  return `ProcurePilot negotiation: ${room.request.itemName} with ${room.session.supplierName}`;
}

function buildComposeUrl(subject: string, body: string) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    tf: "1",
    to: NEGOTIATION_RECIPIENT_EMAIL,
    su: subject,
    body,
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
}

function buildStatus(
  room: Awaited<ReturnType<typeof getNegotiationRoom>>,
  options: {
    delivery: EmailNegotiationStatus["delivery"];
    detail: string;
    canAutoSend: boolean;
    composeUrl?: string;
    actionRequired?: string;
  },
): EmailNegotiationStatus {
  const latestBuyerMessage =
    [...room.messages].reverse().find((message) => message.role === "buyer")?.text ??
    "Buyer message unavailable.";
  const subject = buildEmailSubject(room);

  return {
    sessionId: room.session.id,
    requestId: room.session.requestId,
    recommendationKey: room.session.recommendationKey,
    supplierName: room.session.supplierName,
    senderEmail: NEGOTIATION_SENDER_EMAIL,
    recipientEmail: NEGOTIATION_RECIPIENT_EMAIL,
    delivery: options.delivery,
    headline:
      options.delivery === "waiting_reply"
        ? "AI agent is negotiating with the seller by email."
        : options.delivery === "deal_ready"
          ? "An email-negotiated deal is ready for buyer approval."
          : options.delivery === "accepted"
            ? "The buyer accepted the negotiated email deal."
            : options.delivery === "rejected"
              ? "The buyer rejected the negotiated email deal."
              : "AI agent prepared the negotiation email draft.",
    detail: options.detail,
    subject,
    latestBuyerMessage,
    composeUrl: options.composeUrl,
    canAutoSend: options.canAutoSend,
    actionRequired: options.actionRequired,
  };
}

export async function startEmailNegotiation(
  requestId: string,
  recommendationKey: RecommendationKey,
): Promise<EmailNegotiationStatus> {
  const room = await createNegotiationRoom(requestId, recommendationKey);
  const subject = buildEmailSubject(room);
  const latestBuyerMessage =
    [...room.messages].reverse().find((message) => message.role === "buyer")?.text ??
    "Buyer message unavailable.";

  return buildStatus(room, {
    delivery: "drafted",
    detail:
      "ProcurePilot prepared the negotiation email. Open the Gmail draft below to send it from the buyer inbox, then keep the page open to track the sourcing path.",
    canAutoSend: false,
    composeUrl: buildComposeUrl(subject, latestBuyerMessage),
    actionRequired:
      "Send the prepared email from the buyer inbox, then continue the negotiation from the email thread.",
  });
}

export async function getEmailNegotiationStatus(sessionId: string) {
  const room = await getNegotiationRoom(sessionId);
  const subject = buildEmailSubject(room);
  const latestBuyerMessage =
    [...room.messages].reverse().find((message) => message.role === "buyer")?.text ??
    "Buyer message unavailable.";

  if (room.session.status === "closed") {
    return buildStatus(room, {
      delivery: "deal_ready",
      detail:
        "The seller has accepted the commercial terms in the hidden negotiation session. The buyer can now accept or reject the final deal.",
      canAutoSend: false,
    });
  }

  if (room.session.status === "accepted") {
    return buildStatus(room, {
      delivery: "accepted",
      detail: "The buyer accepted the negotiated email deal.",
      canAutoSend: false,
    });
  }

  if (room.session.status === "rejected") {
    return buildStatus(room, {
      delivery: "rejected",
      detail: "The buyer rejected the negotiated email deal.",
      canAutoSend: false,
    });
  }

  return buildStatus(room, {
    delivery: "drafted",
    detail:
      "The negotiation email draft is ready. Send it from Gmail to start the live email thread with the seller.",
    canAutoSend: false,
    composeUrl: buildComposeUrl(subject, latestBuyerMessage),
    actionRequired:
      "Open the Gmail draft, send it, and let the seller reply in the same email thread.",
  });
}
