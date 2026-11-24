import "server-only";
import { EJSON } from "bson";
import type { AnyBulkWriteOperation, Document } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * Whole-database backup and restore.
 *
 * The backup is a single JSON file using MongoDB Extended JSON, so `ObjectId`,
 * `Date`, `Decimal128` and binary values survive a round-trip. A plain
 * `JSON.stringify` would silently turn every `_id` into a string and break
 * every reference on restore.
 *
 * Restore is **merge/upsert only** — records are matched by `_id` and replaced
 * in place; nothing is ever dropped. Running the same file twice is therefore
 * safe, and data created after the backup is never lost.
 */

export const BACKUP_FORMAT = "angkon-db-backup";
export const BACKUP_VERSION = 1;

/**
 * Collections a restore will not touch unless explicitly allowed.
 * Restoring `users` can overwrite the account you are signed in with.
 */
export const PROTECTED_COLLECTIONS = ["users"] as const;

/** Hard caps so a runaway export cannot exhaust server memory. */
export const MAX_DOCUMENTS_PER_COLLECTION = 50_000;
export const MAX_COLLECTIONS = 200;

const SAFE_COLLECTION_NAME = /^[A-Za-z0-9_-]{1,120}$/;

export interface BackupCollection {
  name: string;
  count: number;
  documents: Record<string, unknown>[];
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  generatedAt: string;
  database: string;
  collections: BackupCollection[];
}

export interface CollectionStat {
  name: string;
  count: number;
}

export interface RestoreReport {
  collections: Array<{
    name: string;
    matched: number;
    modified: number;
    upserted: number;
  }>;
  skipped: Array<{ name: string; reason: string }>;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Pure helpers (unit-testable without a database)
 * ────────────────────────────────────────────────────────────────────────── */

export function isSystemCollection(name: string): boolean {
  return name.startsWith("system.") || name.startsWith("$");
}

export function isSafeCollectionName(name: string): boolean {
  return SAFE_COLLECTION_NAME.test(name) && !isSystemCollection(name);
}

export function isProtectedCollection(name: string): boolean {
  return (PROTECTED_COLLECTIONS as readonly string[]).includes(name);
}

export function serializeDocument(doc: Record<string, unknown>): Record<string, unknown> {
  return EJSON.serialize(doc, { relaxed: false }) as Record<string, unknown>;
}

export function deserializeDocument(doc: Record<string, unknown>): Record<string, unknown> {
  return EJSON.deserialize(doc, { relaxed: false }) as Record<string, unknown>;
}

export type ValidationResult =
  | { ok: true; file: BackupFile }
  | { ok: false; error: string };

/**
 * Validates an uploaded backup before a single write happens.
 *
 * Deliberately strict: an unknown format, a different version, or an unsafe
 * collection name is rejected outright rather than partially applied.
 */
export function validateBackupPayload(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "The file is not a JSON object." };
  }

  const payload = input as Record<string, unknown>;

  if (payload.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      error: `Unrecognised backup format. Expected "${BACKUP_FORMAT}".`,
    };
  }

  if (payload.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `Unsupported backup version ${String(payload.version)}. This server supports version ${BACKUP_VERSION}.`,
    };
  }

  if (!Array.isArray(payload.collections)) {
    return { ok: false, error: "The backup has no collections array." };
  }

  if (payload.collections.length > MAX_COLLECTIONS) {
    return {
      ok: false,
      error: `The backup declares ${payload.collections.length} collections, above the ${MAX_COLLECTIONS} limit.`,
    };
  }

  const seen = new Set<string>();
  const collections: BackupCollection[] = [];

  for (const raw of payload.collections) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "A collection entry is not an object." };
    }

    const entry = raw as Record<string, unknown>;
    const name = entry.name;

    if (typeof name !== "string" || !isSafeCollectionName(name)) {
      return { ok: false, error: `Unsafe or missing collection name: ${String(name)}.` };
    }

    if (seen.has(name)) {
      return { ok: false, error: `Collection "${name}" appears more than once.` };
    }
    seen.add(name);

    if (!Array.isArray(entry.documents)) {
      return { ok: false, error: `Collection "${name}" has no documents array.` };
    }

    if (entry.documents.length > MAX_DOCUMENTS_PER_COLLECTION) {
      return {
        ok: false,
        error: `Collection "${name}" has ${entry.documents.length} documents, above the ${MAX_DOCUMENTS_PER_COLLECTION} limit.`,
      };
    }

    collections.push({
      name,
      count: entry.documents.length,
      documents: entry.documents as Record<string, unknown>[],
    });
  }

  return {
    ok: true,
    file: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      generatedAt: typeof payload.generatedAt === "string" ? payload.generatedAt : new Date().toISOString(),
      database: typeof payload.database === "string" ? payload.database : "unknown",
      collections,
    },
  };
}

/** Which collections a restore will actually write, and which it will skip. */
export function selectRestoreTargets(
  file: BackupFile,
  options: { includeUsers?: boolean } = {}
): { targets: BackupCollection[]; skipped: Array<{ name: string; reason: string }> } {
  const targets: BackupCollection[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];

  for (const collection of file.collections) {
    if (isProtectedCollection(collection.name) && !options.includeUsers) {
      skipped.push({
        name: collection.name,
        reason: "Protected collection — enable “include users” to restore it.",
      });
      continue;
    }
    targets.push(collection);
  }

  return { targets, skipped };
}

/** Bulk-write operations that upsert each document by `_id`. */
export function buildUpsertOperations(
  documents: Record<string, unknown>[]
): AnyBulkWriteOperation<Document>[] {
  return documents
    .filter((doc) => doc && typeof doc === "object" && "_id" in doc)
    .map((doc) => ({
      replaceOne: {
        filter: { _id: doc._id } as Document,
        replacement: doc as Document,
        upsert: true,
      },
    }));
}

/* ──────────────────────────────────────────────────────────────────────────
 * Database operations
 * ────────────────────────────────────────────────────────────────────────── */

async function database() {
  const conn = await connectToDatabase();
  const db = conn.connection.db;
  if (!db) throw new Error("Database connection is not ready.");
  return db;
}

export async function listCollectionNames(): Promise<string[]> {
  const db = await database();
  const collections = await db.listCollections().toArray();
  return collections
    .map((c) => c.name)
    .filter((name) => !isSystemCollection(name))
    .sort();
}

export async function getDatabaseStats(): Promise<CollectionStat[]> {
  const db = await database();
  const names = await listCollectionNames();

  const stats = await Promise.all(
    names.map(async (name) => {
      try {
        const count = await db.collection(name).estimatedDocumentCount();
        return { name, count };
      } catch {
        return { name, count: 0 };
      }
    })
  );

  return stats;
}

export async function exportDatabase(): Promise<BackupFile> {
  const db = await database();
  const names = await listCollectionNames();

  const collections: BackupCollection[] = [];

  for (const name of names) {
    const raw = await db.collection(name).find({}).limit(MAX_DOCUMENTS_PER_COLLECTION + 1).toArray();

    if (raw.length > MAX_DOCUMENTS_PER_COLLECTION) {
      throw new Error(
        `Collection "${name}" exceeds the ${MAX_DOCUMENTS_PER_COLLECTION} document export limit.`
      );
    }

    collections.push({
      name,
      count: raw.length,
      documents: raw.map((doc) => serializeDocument(doc as Record<string, unknown>)),
    });
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    generatedAt: new Date().toISOString(),
    database: db.databaseName,
    collections,
  };
}

const BATCH_SIZE = 500;

export async function restoreDatabase(
  file: BackupFile,
  options: { includeUsers?: boolean } = {}
): Promise<RestoreReport> {
  const db = await database();
  const { targets, skipped } = selectRestoreTargets(file, options);

  const report: RestoreReport = { collections: [], skipped };

  for (const collection of targets) {
    const documents = collection.documents.map((doc) => deserializeDocument(doc));
    let matched = 0;
    let modified = 0;
    let upserted = 0;

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      const operations = buildUpsertOperations(batch);

      if (operations.length === 0) continue;

      const result = await db.collection(collection.name).bulkWrite(operations, { ordered: false });
      matched += result.matchedCount ?? 0;
      modified += result.modifiedCount ?? 0;
      upserted += result.upsertedCount ?? 0;
    }

    report.collections.push({ name: collection.name, matched, modified, upserted });
  }

  return report;
}
