import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { DEFAULT_TENANT_ID } from "../tenant";

export interface MigrationInspectionReport {
  totalDocuments: number;
  unscopedDocuments: number;
  scopedDocuments: number;
  documentsList: Array<{ _id: string; key: string; tenantId?: string }>;
  existingIndexes: Array<{ name: string; key: Record<string, number>; unique?: boolean }>;
  hasLegacyUniqueKeyIndex: boolean;
  hasCompoundIndex: boolean;
  conflicts: Array<{ key: string; existingTenantDocId: string; legacyDocId: string }>;
}

export interface MigrationResult {
  dryRun: boolean;
  success: boolean;
  inspection: MigrationInspectionReport;
  actions: {
    lockAcquired: boolean;
    recordsBackfilled: number;
    compoundIndexCreated: boolean;
    legacyIndexDropped: boolean;
    verifiedDocumentCount: number;
    verifiedCompoundIndex: boolean;
  };
  error?: string;
}

const LOCK_KEY = "__migration_lock_settings_tenant__";
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Executes a pre-flight inspection of the `settings` collection without modifying any data.
 */
export async function inspectSettingsCollection(): Promise<MigrationInspectionReport> {
  await connectToDatabase();
  const collection = Settings.collection;

  const rawDocs = await collection.find({ key: { $ne: LOCK_KEY } }).toArray();
  const rawIndexes = await collection.indexes();

  const documentsList = rawDocs.map((d) => ({
    _id: String(d._id),
    key: String(d.key),
    tenantId: typeof d.tenantId === "string" ? d.tenantId : undefined,
  }));

  const unscoped = documentsList.filter((d) => !d.tenantId);
  const scoped = documentsList.filter((d) => Boolean(d.tenantId));

  // Check for conflicts: does an un-scoped doc have the same key as an already scoped doc?
  const conflicts: Array<{ key: string; existingTenantDocId: string; legacyDocId: string }> = [];
  const scopedKeys = new Map<string, string>();

  for (const doc of scoped) {
    if (doc.tenantId === DEFAULT_TENANT_ID) {
      scopedKeys.set(doc.key, doc._id);
    }
  }

  for (const doc of unscoped) {
    if (scopedKeys.has(doc.key)) {
      conflicts.push({
        key: doc.key,
        existingTenantDocId: scopedKeys.get(doc.key)!,
        legacyDocId: doc._id,
      });
    }
  }

  const existingIndexes = rawIndexes.map((idx) => ({
    name: String(idx.name || ""),
    key: (idx.key || {}) as Record<string, number>,
    unique: Boolean(idx.unique),
  }));

  const hasLegacyUniqueKeyIndex = existingIndexes.some(
    (idx) => idx.name === "key_1" && idx.unique === true
  );

  const hasCompoundIndex = existingIndexes.some(
    (idx) => idx.key && idx.key.tenantId === 1 && idx.key.key === 1 && idx.unique === true
  );

  return {
    totalDocuments: documentsList.length,
    unscopedDocuments: unscoped.length,
    scopedDocuments: scoped.length,
    documentsList,
    existingIndexes,
    hasLegacyUniqueKeyIndex,
    hasCompoundIndex,
    conflicts,
  };
}

/**
 * Acquires a distributed lock in MongoDB to prevent concurrent migrations during deployment.
 */
async function acquireMigrationLock(force = false): Promise<boolean> {
  const collection = Settings.collection;
  const now = new Date();

  if (force) {
    await collection.deleteOne({ key: LOCK_KEY });
  }

  try {
    const res = await collection.findOneAndUpdate(
      {
        key: LOCK_KEY,
        $or: [
          { lockedAt: { $lt: new Date(now.getTime() - LOCK_TIMEOUT_MS) } },
          { locked: false },
        ],
      },
      {
        $set: {
          locked: true,
          lockedAt: now,
          lockedBy: `process_${process.pid}_${Math.random().toString(36).slice(2, 7)}`,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    return Boolean(res);
  } catch (err: unknown) {
    // Duplicate key on upsert indicates another active lock
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return false;
    }
    return false;
  }
}

/**
 * Releases the distributed migration lock.
 */
async function releaseMigrationLock(): Promise<void> {
  try {
    const collection = Settings.collection;
    await collection.deleteOne({ key: LOCK_KEY });
  } catch {
    // Ignore lock cleanup error
  }
}

/**
 * Explicit idempotent migration command with dry-run support.
 *
 * Sequence:
 * 1. Pre-flight inspection & conflict check.
 * 2. Acquire atomic migration lock.
 * 3. Dry-run abort if dryRun: true.
 * 4. Backfill unscoped records -> tenantId: "angkon-main".
 * 5. Create compound unique index (tenantId: 1, key: 1).
 * 6. Drop legacy single-key unique index key_1.
 * 7. Post-migration verification.
 * 8. Release lock.
 */
export async function runSettingsTenantMigration(options: {
  dryRun?: boolean;
  forceUnlock?: boolean;
  targetTenantId?: string;
} = {}): Promise<MigrationResult> {
  const isDryRun = options.dryRun !== false; // Default to true (safe by default)
  const targetTenant = options.targetTenantId || DEFAULT_TENANT_ID;

  await connectToDatabase();
  const collection = Settings.collection;

  // 1. Pre-flight inspection
  const inspection = await inspectSettingsCollection();

  // If conflicts are detected, NEVER overwrite or delete conflicting data.
  if (inspection.conflicts.length > 0) {
    return {
      dryRun: isDryRun,
      success: false,
      inspection,
      actions: {
        lockAcquired: false,
        recordsBackfilled: 0,
        compoundIndexCreated: false,
        legacyIndexDropped: false,
        verifiedDocumentCount: inspection.totalDocuments,
        verifiedCompoundIndex: inspection.hasCompoundIndex,
      },
      error: `Migration halted due to ${inspection.conflicts.length} duplicate key conflict(s). Conflicting keys: ${inspection.conflicts
        .map((c) => c.key)
        .join(", ")}. Manual database reconciliation required.`,
    };
  }

  // 2. Acquire atomic distributed lock
  const lockAcquired = await acquireMigrationLock(Boolean(options.forceUnlock));
  if (!lockAcquired) {
    return {
      dryRun: isDryRun,
      success: false,
      inspection,
      actions: {
        lockAcquired: false,
        recordsBackfilled: 0,
        compoundIndexCreated: false,
        legacyIndexDropped: false,
        verifiedDocumentCount: inspection.totalDocuments,
        verifiedCompoundIndex: inspection.hasCompoundIndex,
      },
      error: "Could not acquire migration lock. Another migration is currently running or was abandoned. Use --force-unlock if safe.",
    };
  }

  try {
    // 3. Dry Run Mode
    if (isDryRun) {
      return {
        dryRun: true,
        success: true,
        inspection,
        actions: {
          lockAcquired: true,
          recordsBackfilled: inspection.unscopedDocuments,
          compoundIndexCreated: !inspection.hasCompoundIndex,
          legacyIndexDropped: inspection.hasLegacyUniqueKeyIndex,
          verifiedDocumentCount: inspection.totalDocuments,
          verifiedCompoundIndex: true,
        },
      };
    }

    // 4. Step A: Backfill unscoped records
    let recordsBackfilled = 0;
    if (inspection.unscopedDocuments > 0) {
      const updateRes = await collection.updateMany(
        {
          key: { $ne: LOCK_KEY },
          $or: [
            { tenantId: { $exists: false } },
            { tenantId: null },
            { tenantId: "" },
          ],
        },
        {
          $set: { tenantId: targetTenant },
        }
      );
      recordsBackfilled = updateRes.modifiedCount || 0;
    }

    // 5. Step B: Create compound unique index (tenantId: 1, key: 1)
    let compoundIndexCreated = false;
    if (!inspection.hasCompoundIndex) {
      await collection.createIndex(
        { tenantId: 1, key: 1 },
        { unique: true, name: "tenantId_1_key_1" }
      );
      compoundIndexCreated = true;
    }

    // 6. Step C: Drop legacy single-key unique index key_1 if present
    let legacyIndexDropped = false;
    if (inspection.hasLegacyUniqueKeyIndex) {
      await collection.dropIndex("key_1");
      legacyIndexDropped = true;
    }

    // 7. Post-migration verification
    const postInspection = await inspectSettingsCollection();
    const verifiedCompoundIndex = postInspection.hasCompoundIndex;
    const verifiedDocumentCount = postInspection.totalDocuments;

    if (postInspection.unscopedDocuments > 0) {
      throw new Error(
        `Post-migration verification failed: ${postInspection.unscopedDocuments} documents still lack tenantId.`
      );
    }

    return {
      dryRun: false,
      success: true,
      inspection: postInspection,
      actions: {
        lockAcquired: true,
        recordsBackfilled,
        compoundIndexCreated,
        legacyIndexDropped,
        verifiedDocumentCount,
        verifiedCompoundIndex,
      },
    };
  } finally {
    // Always release lock
    await releaseMigrationLock();
  }
}
