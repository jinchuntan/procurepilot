import "server-only";

import { randomUUID } from "node:crypto";
import { getItemById, inferCategoryFromText } from "@/lib/data";
import { requestDraftSchema } from "@/lib/procurement-schemas";
import { ProcurementRequest, ProcurementRequestDraft } from "@/lib/types";
import {
  ensureStorageReady,
  getDatabase,
  getPostgresClient,
  isPostgresConfigured,
} from "./database";

type RequestRow = {
  id: string;
  item_id: string;
  item_name: string;
  category: ProcurementRequest["category"];
  quantity: number;
  required_by: string;
  budget_min: number;
  budget_max: number;
  priority: ProcurementRequest["priority"];
  min_supplier_rating: number;
  notes: string;
  created_at: string;
};

function mapRow(row: RequestRow): ProcurementRequest {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    category: row.category,
    quantity: row.quantity,
    requiredBy: row.required_by,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    priority: row.priority,
    minSupplierRating: row.min_supplier_rating,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function listRequests() {
  await ensureStorageReady();

  if (isPostgresConfigured()) {
    const sql = getPostgresClient();
    const rows = await sql<RequestRow[]>`
      SELECT
        id,
        item_id,
        item_name,
        category,
        quantity,
        required_by,
        budget_min,
        budget_max,
        priority,
        min_supplier_rating,
        notes,
        created_at
      FROM procurement_requests
      ORDER BY created_at DESC
    `;

    return rows.map(mapRow);
  }

  const db = getDatabase();
  const rows = db
    .prepare(
      `
        SELECT
          id,
          item_id,
          item_name,
          category,
          quantity,
          required_by,
          budget_min,
          budget_max,
          priority,
          min_supplier_rating,
          notes,
          created_at
        FROM procurement_requests
        ORDER BY datetime(created_at) DESC
      `,
    )
    .all() as RequestRow[];

  return rows.map(mapRow);
}

export async function getRequestById(id: string) {
  await ensureStorageReady();

  if (isPostgresConfigured()) {
    const sql = getPostgresClient();
    const rows = await sql<RequestRow[]>`
      SELECT
        id,
        item_id,
        item_name,
        category,
        quantity,
        required_by,
        budget_min,
        budget_max,
        priority,
        min_supplier_rating,
        notes,
        created_at
      FROM procurement_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    return rows[0] ? mapRow(rows[0]) : null;
  }

  const db = getDatabase();
  const row = db
    .prepare(
      `
        SELECT
          id,
          item_id,
          item_name,
          category,
          quantity,
          required_by,
          budget_min,
          budget_max,
          priority,
          min_supplier_rating,
          notes,
          created_at
        FROM procurement_requests
        WHERE id = ?
      `,
    )
    .get(id) as RequestRow | undefined;

  return row ? mapRow(row) : null;
}

export async function createRequest(input: ProcurementRequestDraft) {
  const parsed = requestDraftSchema.parse(input);
  const item = getItemById(parsed.itemId ?? "");
  const freeformItemName = parsed.itemName?.trim();
  const fallbackLabel = freeformItemName ?? parsed.itemId ?? "custom procurement item";

  if (!item && !freeformItemName) {
    throw new Error("An item name or supported item ID is required.");
  }

  const request: ProcurementRequest = {
    id: `req-${randomUUID().slice(0, 8)}`,
    itemId: item?.id ?? `custom-${randomUUID().slice(0, 8)}`,
    itemName: item?.name ?? freeformItemName ?? fallbackLabel,
    category: item?.category ?? inferCategoryFromText(fallbackLabel, parsed.category, parsed.notes),
    quantity: parsed.quantity,
    requiredBy: parsed.requiredBy,
    budgetMin: parsed.budgetMin,
    budgetMax: parsed.budgetMax,
    priority: parsed.priority,
    minSupplierRating: parsed.minSupplierRating,
    notes: parsed.notes,
    createdAt: new Date().toISOString(),
  };

  await ensureStorageReady();

  if (isPostgresConfigured()) {
    const sql = getPostgresClient();

    await sql`
      INSERT INTO procurement_requests (
        id,
        item_id,
        item_name,
        category,
        quantity,
        required_by,
        budget_min,
        budget_max,
        priority,
        min_supplier_rating,
        notes,
        created_at
      ) VALUES (
        ${request.id},
        ${request.itemId},
        ${request.itemName},
        ${request.category},
        ${request.quantity},
        ${request.requiredBy},
        ${request.budgetMin},
        ${request.budgetMax},
        ${request.priority},
        ${request.minSupplierRating},
        ${request.notes},
        ${request.createdAt}
      )
    `;

    return request;
  }

  const db = getDatabase();
  db.prepare(
    `
      INSERT INTO procurement_requests (
        id,
        item_id,
        item_name,
        category,
        quantity,
        required_by,
        budget_min,
        budget_max,
        priority,
        min_supplier_rating,
        notes,
        created_at
      ) VALUES (
        @id,
        @itemId,
        @itemName,
        @category,
        @quantity,
        @requiredBy,
        @budgetMin,
        @budgetMax,
        @priority,
        @minSupplierRating,
        @notes,
        @createdAt
      )
    `,
  ).run(request);

  return request;
}
