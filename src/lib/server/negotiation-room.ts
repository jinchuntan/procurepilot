import "server-only";

import { randomUUID } from "node:crypto";
import { sendLiveLuaAgentMessage } from "@/lib/lua/live-chat";
import { assessRequestById } from "@/lib/lua/runtime";
import { simulateSupplierNegotiation } from "@/lib/negotiation";
import {
  NegotiationRoom,
  NegotiationRoomMessage,
  NegotiationSessionStatus,
  RecommendationKey,
} from "@/lib/types";
import { getDatabase } from "./database";
import { getRequestById } from "./request-repository";

type SessionRow = {
  id: string;
  request_id: string;
  thread_id: string;
  supplier_id: string;
  supplier_name: string;
  recommendation_key: RecommendationKey;
  recommendation_label: string;
  status: NegotiationSessionStatus;
  opened_total: number;
  target_total: number;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  session_id: string;
  role: NegotiationRoomMessage["role"];
  speaker: string;
  text: string;
  created_at: string;
};

function mapMessageRow(row: MessageRow): NegotiationRoomMessage {
  return {
    id: row.id,
    role: row.role,
    speaker: row.speaker,
    text: row.text,
    createdAt: row.created_at,
  };
}

function stripControlMarkers(value: string) {
  return value.replace(/\[DEAL_CLOSED\]/gi, "").trim();
}

function sellerAcceptedOffer(message: string) {
  return /\b(accept|accepted|agreed|deal|done|proceed|works for me|let's do it|lets do it)\b/i.test(
    message,
  );
}

function buildOpeningPrompt(
  requestSummary: string,
  supplierName: string,
  recommendationLabel: string,
  openedTotal: number,
  targetTotal: number,
) {
  return [
    "You are ProcurePilot acting only as the BUYER in a live supplier negotiation.",
    `Supplier: ${supplierName}. Recommendation path: ${recommendationLabel}.`,
    `Request brief: ${requestSummary}.`,
    `Opening quote: USD ${openedTotal.toFixed(0)} total.`,
    `Your internal target is to improve the deal toward USD ${targetTotal.toFixed(0)} while protecting lead time and supply confidence.`,
    "Write the opening buyer message only. Be concise, commercially realistic, and persuasive.",
  ].join(" ");
}

function buildReplyPrompt(
  requestSummary: string,
  supplierName: string,
  openedTotal: number,
  targetTotal: number,
  sellerMessage: string,
  sellerIsAccepting: boolean,
) {
  return [
    "Continue acting only as ProcurePilot, the BUYER in a live supplier negotiation.",
    `Supplier: ${supplierName}.`,
    `Request brief: ${requestSummary}.`,
    `Opening quote: USD ${openedTotal.toFixed(0)} total. Internal target: USD ${targetTotal.toFixed(0)} total.`,
    `Seller message: "${sellerMessage}".`,
    sellerIsAccepting
      ? "The seller is accepting the current terms. Reply with a short close confirmation and append [DEAL_CLOSED]."
      : "Reply in 2 to 4 short sentences. Push for stronger commercial terms if there is room. If the seller's terms are acceptable, confirm the deal and append [DEAL_CLOSED].",
  ].join(" ");
}

function getSessionRow(sessionId: string) {
  const db = getDatabase();

  return db
    .prepare(
      `
        SELECT
          id,
          request_id,
          thread_id,
          supplier_id,
          supplier_name,
          recommendation_key,
          recommendation_label,
          status,
          opened_total,
          target_total,
          created_at,
          updated_at
        FROM negotiation_sessions
        WHERE id = ?
      `,
    )
    .get(sessionId) as SessionRow | undefined;
}

function getLatestSessionRowByRequest(requestId: string, recommendationKey: RecommendationKey) {
  const db = getDatabase();

  return db
    .prepare(
      `
        SELECT
          id,
          request_id,
          thread_id,
          supplier_id,
          supplier_name,
          recommendation_key,
          recommendation_label,
          status,
          opened_total,
          target_total,
          created_at,
          updated_at
        FROM negotiation_sessions
        WHERE request_id = ? AND recommendation_key = ?
        ORDER BY datetime(updated_at) DESC
        LIMIT 1
      `,
    )
    .get(requestId, recommendationKey) as SessionRow | undefined;
}

function getLatestOpenSessionRow() {
  const db = getDatabase();

  return db
    .prepare(
      `
        SELECT
          id,
          request_id,
          thread_id,
          supplier_id,
          supplier_name,
          recommendation_key,
          recommendation_label,
          status,
          opened_total,
          target_total,
          created_at,
          updated_at
        FROM negotiation_sessions
        WHERE status = 'open'
        ORDER BY datetime(updated_at) DESC
        LIMIT 1
      `,
    )
    .get() as SessionRow | undefined;
}

function listMessageRows(sessionId: string) {
  const db = getDatabase();

  return db
    .prepare(
      `
        SELECT
          id,
          session_id,
          role,
          speaker,
          text,
          created_at
        FROM negotiation_messages
        WHERE session_id = ?
        ORDER BY datetime(created_at) ASC
      `,
    )
    .all(sessionId) as MessageRow[];
}

function appendMessage(
  sessionId: string,
  role: NegotiationRoomMessage["role"],
  speaker: string,
  text: string,
) {
  const db = getDatabase();
  const createdAt = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO negotiation_messages (
        id,
        session_id,
        role,
        speaker,
        text,
        created_at
      ) VALUES (
        @id,
        @sessionId,
        @role,
        @speaker,
        @text,
        @createdAt
      )
    `,
  ).run({
    id: `msg-${randomUUID().slice(0, 12)}`,
    sessionId,
    role,
    speaker,
    text,
    createdAt,
  });
}

function updateSession(sessionId: string, status: NegotiationSessionStatus) {
  const db = getDatabase();

  db.prepare(
    `
      UPDATE negotiation_sessions
      SET status = @status, updated_at = @updatedAt
      WHERE id = @id
    `,
  ).run({
    id: sessionId,
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function setNegotiationDecision(
  sessionId: string,
  decision: Extract<NegotiationSessionStatus, "accepted" | "rejected">,
) {
  const session = getSessionRow(sessionId);

  if (!session) {
    throw new Error(`Negotiation session "${sessionId}" was not found.`);
  }

  updateSession(sessionId, decision);
  appendMessage(
    sessionId,
    "buyer",
    "ProcurePilot Buyer",
    decision === "accepted"
      ? "The buyer approved the negotiated deal and the order can proceed."
      : "The buyer declined the negotiated terms, so this sourcing path is now closed.",
  );

  return getNegotiationRoom(sessionId);
}

export async function getNegotiationRoom(sessionId: string): Promise<NegotiationRoom> {
  const session = getSessionRow(sessionId);

  if (!session) {
    throw new Error(`Negotiation session "${sessionId}" was not found.`);
  }

  const request = getRequestById(session.request_id);

  if (!request) {
    throw new Error(`Request "${session.request_id}" was not found for this negotiation.`);
  }

  const assessment = await assessRequestById(request.id);
  const recommendation = assessment.recommendations[session.recommendation_key];

  if (!recommendation) {
    throw new Error(`Recommendation "${session.recommendation_key}" is no longer available.`);
  }

  return {
    session: {
      id: session.id,
      requestId: session.request_id,
      supplierId: session.supplier_id,
      supplierName: session.supplier_name,
      recommendationKey: session.recommendation_key,
      recommendationLabel: session.recommendation_label,
      status: session.status,
      openedTotal: session.opened_total,
      targetTotal: session.target_total,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    },
    request,
    recommendation,
    messages: listMessageRows(session.id).map(mapMessageRow),
  };
}

export async function createNegotiationRoom(
  requestId: string,
  recommendationKey: RecommendationKey,
) {
  const existingSession = getLatestSessionRowByRequest(requestId, recommendationKey);

  if (existingSession && existingSession.status !== "accepted" && existingSession.status !== "rejected") {
    return getNegotiationRoom(existingSession.id);
  }

  const request = getRequestById(requestId);

  if (!request) {
    throw new Error(`Request "${requestId}" was not found.`);
  }

  const assessment = await assessRequestById(requestId);
  const recommendation = assessment.recommendations[recommendationKey];

  if (!recommendation) {
    throw new Error(`Recommendation "${recommendationKey}" was not found.`);
  }

  const targetTerms = simulateSupplierNegotiation(
    request,
    recommendation.supplier,
    recommendationKey,
    recommendation.label,
  );
  const sessionId = `deal-${randomUUID().slice(0, 8)}`;
  const provisionalThreadId = randomUUID();
  const requestSummary = `${request.quantity} units of ${request.itemName}, required by ${request.requiredBy}, budget ceiling USD ${request.budgetMax}, minimum supplier rating ${request.minSupplierRating}, priority ${request.priority}.`;
  const openingMessage = await sendLiveLuaAgentMessage(
    buildOpeningPrompt(
      requestSummary,
      recommendation.supplier.supplierName,
      recommendation.label,
      recommendation.supplier.totalCost,
      targetTerms.negotiatedTotalCost,
    ),
    provisionalThreadId,
  );

  const db = getDatabase();
  const createdAt = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO negotiation_sessions (
        id,
        request_id,
        thread_id,
        supplier_id,
        supplier_name,
        recommendation_key,
        recommendation_label,
        status,
        opened_total,
        target_total,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @requestId,
        @threadId,
        @supplierId,
        @supplierName,
        @recommendationKey,
        @recommendationLabel,
        @status,
        @openedTotal,
        @targetTotal,
        @createdAt,
        @updatedAt
      )
    `,
  ).run({
    id: sessionId,
    requestId,
    threadId: openingMessage.threadId,
    supplierId: recommendation.supplier.supplierId,
    supplierName: recommendation.supplier.supplierName,
    recommendationKey,
    recommendationLabel: recommendation.label,
    status: "open",
    openedTotal: recommendation.supplier.totalCost,
    targetTotal: targetTerms.negotiatedTotalCost,
    createdAt,
    updatedAt: createdAt,
  });

  appendMessage(sessionId, "buyer", "ProcurePilot Buyer", stripControlMarkers(openingMessage.reply));

  return getNegotiationRoom(sessionId);
}

export async function replyToNegotiationRoom(sessionId: string, sellerMessage: string) {
  const session = getSessionRow(sessionId);

  if (!session) {
    throw new Error(`Negotiation session "${sessionId}" was not found.`);
  }

  const request = getRequestById(session.request_id);

  if (!request) {
    throw new Error(`Request "${session.request_id}" was not found.`);
  }

  const trimmedMessage = sellerMessage.trim();

  if (!trimmedMessage) {
    throw new Error("Seller message cannot be empty.");
  }

  appendMessage(sessionId, "seller", "Seller", trimmedMessage);

  const requestSummary = `${request.quantity} units of ${request.itemName}, required by ${request.requiredBy}, budget ceiling USD ${request.budgetMax}, minimum supplier rating ${request.minSupplierRating}, priority ${request.priority}.`;
  const accepted = sellerAcceptedOffer(trimmedMessage);

  if (accepted) {
    appendMessage(
      sessionId,
      "buyer",
      "ProcurePilot Buyer",
      "Thank you. We have aligned on the commercial terms and I’m marking this deal as ready for buyer approval.",
    );
    updateSession(sessionId, "closed");

    return getNegotiationRoom(sessionId);
  }

  const buyerReply = await sendLiveLuaAgentMessage(
    buildReplyPrompt(
      requestSummary,
      session.supplier_name,
      session.opened_total,
      session.target_total,
      trimmedMessage,
      false,
    ),
    session.thread_id,
  );
  const closed = /\[DEAL_CLOSED\]/i.test(buyerReply.reply);

  appendMessage(
    sessionId,
    "buyer",
    "ProcurePilot Buyer",
    stripControlMarkers(buyerReply.reply),
  );
  updateSession(sessionId, closed ? "closed" : "open");

  return getNegotiationRoom(sessionId);
}

export async function replyToLatestOpenNegotiationRoom(sellerMessage: string) {
  const session = getLatestOpenSessionRow();

  if (!session) {
    throw new Error("No open negotiation session is waiting for a seller reply.");
  }

  return replyToNegotiationRoom(session.id, sellerMessage);
}
