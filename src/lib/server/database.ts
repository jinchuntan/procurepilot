import "server-only";

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildSeedRequests } from "@/lib/data";

let database: Database.Database | null = null;

function databasePath() {
  return resolve(process.cwd(), "data", "procurepilot.sqlite");
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
