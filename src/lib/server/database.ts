import "server-only";

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import postgres from "postgres";
import { buildSeedRequests } from "@/lib/data";

let database: Database.Database | null = null;
let postgresClient: ReturnType<typeof postgres> | null = null;
let storageReadyPromise: Promise<void> | null = null;

function databasePath() {
  return resolve(process.cwd(), "data", "procurepilot.sqlite");
}

function postgresUrl() {
  return process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim() || null;
}

export function isPostgresConfigured() {
  return Boolean(postgresUrl());
}

export function getPostgresClient() {
  const connectionString = postgresUrl();

  if (!connectionString) {
    throw new Error(
      "A Postgres connection string was not found. Set DATABASE_URL or POSTGRES_URL.",
    );
  }

  if (postgresClient) {
    return postgresClient;
  }

  postgresClient = postgres(connectionString, {
    max: 1,
    prepare: false,
  });

  return postgresClient;
}

function ensureDatabaseFile() {
  const path = databasePath();
  const folder = dirname(path);

  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }

  return path;
}

function seedRequestsIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as count FROM procurement_requests").get() as {
    count: number;
  };

  if (count.count > 0) {
    return;
  }

  const insert = db.prepare(`
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
  `);

  const transaction = db.transaction(() => {
    for (const request of buildSeedRequests()) {
      insert.run(request);
    }
  });

  transaction();
}

async function seedRequestsIfEmptyWithPostgres() {
  const sql = getPostgresClient();
  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM procurement_requests
  `;

  if ((rows[0]?.count ?? 0) > 0) {
    return;
  }

  await sql.begin(async (transaction) => {
    for (const request of buildSeedRequests()) {
      await transaction`
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
        ON CONFLICT (id) DO NOTHING
      `;
    }
  });
}

async function ensurePostgresStorage() {
  const sql = getPostgresClient();

  await sql`
    CREATE TABLE IF NOT EXISTS procurement_requests (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      required_by TEXT NOT NULL,
      budget_min DOUBLE PRECISION NOT NULL,
      budget_max DOUBLE PRECISION NOT NULL,
      priority TEXT NOT NULL,
      min_supplier_rating INTEGER NOT NULL,
      notes TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS negotiation_sessions (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      recommendation_key TEXT NOT NULL,
      recommendation_label TEXT NOT NULL,
      status TEXT NOT NULL,
      opened_total DOUBLE PRECISION NOT NULL,
      target_total DOUBLE PRECISION NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS negotiation_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      speaker TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;

  await seedRequestsIfEmptyWithPostgres();
}

export async function ensureStorageReady() {
  if (!storageReadyPromise) {
    storageReadyPromise = (async () => {
      if (isPostgresConfigured()) {
        await ensurePostgresStorage();
        return;
      }

      getDatabase();
    })().catch((error) => {
      storageReadyPromise = null;
      throw error;
    });
  }

  await storageReadyPromise;
}

export function getDatabase() {
  if (database) {
    return database;
  }

  database = new Database(ensureDatabaseFile());
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS procurement_requests (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      required_by TEXT NOT NULL,
      budget_min REAL NOT NULL,
      budget_max REAL NOT NULL,
      priority TEXT NOT NULL,
      min_supplier_rating INTEGER NOT NULL,
      notes TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS negotiation_sessions (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      recommendation_key TEXT NOT NULL,
      recommendation_label TEXT NOT NULL,
      status TEXT NOT NULL,
      opened_total REAL NOT NULL,
      target_total REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS negotiation_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      speaker TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  seedRequestsIfEmpty(database);

  return database;
}
