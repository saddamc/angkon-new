#!/usr/bin/env node
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const DATABASE_URL =
  process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.DATABASE_URL;

const args = process.argv.slice(2);
const isHelp = args.includes("--help") || args.includes("-h");
const isApply = args.includes("--apply");
const isRollback = args.includes("--rollback");
const isForceUnlock = args.includes("--force-unlock");
const isDryRun = !isApply && !isRollback;

if (isHelp) {
  console.log(`
=============================================================================
  ANGKON Settings Multi-Tenant Scoping Migration CLI
=============================================================================

Usage:
  node scripts/migrate-settings-tenant.mjs [options]

Options:
  --dry-run        Inspect and simulate migration/status without modifying data (Default)
  --apply          Execute migration safely: backfills records, creates compound index, drops legacy index
  --rollback       Safely roll back compound index to legacy unique index after conflict verification
  --force-unlock   Clear any stale migration lock before running
  --help, -h       Show this documentation

Backup Instructions:
  Before running with --apply in production, take a full snapshot backup:
    mongodump --uri="<MONGODB_URI>" --collection=settings --out=./backup-settings-$(date +%F)

Controlled Rollback Procedure:
  If a rollback to the legacy single-key index is required:
    1. Pre-flight check: node scripts/migrate-settings-tenant.mjs --rollback
       (The script verifies zero duplicate keys exist before modifying indexes)
    2. To restore exact document state from backup:
       mongorestore --uri="<MONGODB_URI>" --collection=settings ./backup-settings-.../settings.bson --drop
=============================================================================
`);
  process.exit(0);
}

if (!DATABASE_URL) {
  console.error("❌ Error: No DATABASE_URL, MONGODB_URI, or MONGODB_URL defined in environment.");
  process.exit(1);
}

async function main() {
  const modeLabel = isRollback
    ? "ROLLBACK MODE"
    : isApply
    ? "APPLY MODE"
    : "DRY-RUN MODE";

  console.log("\n=============================================================================");
  console.log(`  ANGKON Settings Multi-Tenant Scoping (${modeLabel})`);
  console.log("=============================================================================");

  await mongoose.connect(DATABASE_URL);
  const collection = mongoose.connection.collection("settings");
  const LOCK_KEY = "__migration_lock_settings_tenant__";

  try {
    if (isForceUnlock) {
      console.log("⚠️  Clearing any existing migration locks (--force-unlock)...");
      await collection.deleteOne({ key: LOCK_KEY });
    }

    // 1. Pre-flight inspection
    console.log("\n[1/4] Inspecting existing documents and indexes...");
    const rawDocs = await collection.find({ key: { $ne: LOCK_KEY } }).toArray();
    const rawIndexes = await collection.indexes();

    console.log(`- Total Settings documents found: ${rawDocs.length}`);
    const unscoped = rawDocs.filter((d) => !d.tenantId);
    const scoped = rawDocs.filter((d) => Boolean(d.tenantId));
    console.log(`- Scoped documents (with tenantId): ${scoped.length}`);
    console.log(`- Unscoped documents (missing tenantId): ${unscoped.length}`);

    for (const d of rawDocs) {
      console.log(`    • Key: "${d.key}" | tenantId: ${d.tenantId ? `"${d.tenantId}"` : "<MISSING>"} | _id: ${d._id}`);
    }

    // 2. Conflict detection
    console.log("\n[2/4] Checking for duplicate key conflicts across documents...");
    const keyCounts = new Map();
    for (const d of rawDocs) {
      keyCounts.set(d.key, (keyCounts.get(d.key) || 0) + 1);
    }
    const duplicateKeys = Array.from(keyCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([k]) => k);

    if (duplicateKeys.length > 0) {
      console.error(`\n❌ CONFLICT DETECTED: Multiple documents share the same key:`);
      duplicateKeys.forEach((k) => console.error(`    - Key: "${k}"`));
      if (isRollback) {
        console.error("Rollback cannot proceed because single-key unique index would violate uniqueness.");
        console.error("Please resolve duplicate documents manually or restore from backup.");
        process.exit(1);
      }
    } else {
      console.log("✔ Zero duplicate key conflicts detected across collection.");
    }

    // 3. Index inspection
    console.log("\n[3/4] Inspecting collection indexes...");
    const hasOldKeyUnique = rawIndexes.some((idx) => idx.name === "key_1" && idx.unique === true);
    const hasCompound = rawIndexes.some(
      (idx) => idx.key && idx.key.tenantId === 1 && idx.key.key === 1 && idx.unique === true
    );

    console.log(`- Legacy unique index 'key_1': ${hasOldKeyUnique ? "PRESENT" : "NOT PRESENT / NON-UNIQUE"}`);
    console.log(`- Compound unique index 'tenantId_1_key_1': ${hasCompound ? "PRESENT (active)" : "NOT PRESENT"}`);

    // Check if already fully migrated
    const isAlreadyMigrated = unscoped.length === 0 && hasCompound && !hasOldKeyUnique;

    // 4. Handle Rollback Mode
    if (isRollback) {
      console.log("\n[4/4] Executing controlled rollback...");
      if (hasOldKeyUnique && !hasCompound) {
        console.log("✔ Collection is already in legacy state (key_1 unique index active). No rollback needed.");
        return;
      }

      console.log("- Creating legacy unique index 'key_1'...");
      await collection.createIndex({ key: 1 }, { unique: true, name: "key_1" });
      console.log("  ✔ Unique index 'key_1' restored.");

      if (hasCompound) {
        console.log("- Dropping compound index 'tenantId_1_key_1'...");
        await collection.dropIndex("tenantId_1_key_1");
        console.log("  ✔ Compound index dropped.");
      }

      console.log("\n🎉 Rollback completed safely. All setting values preserved.\n");
      return;
    }

    // 5. Handle Dry Run Mode
    if (isDryRun) {
      console.log("\n[4/4] DRY-RUN SIMULATION STATUS");
      console.log("-----------------------------------------------------------------------------");
      if (isAlreadyMigrated) {
        console.log("✔ Database is ALREADY FULLY MIGRATED and healthy.");
        console.log("  - 100% of documents have tenantId assigned.");
        console.log("  - Compound unique index 'tenantId_1_key_1' is active.");
        console.log("  - Legacy unique index 'key_1' is safely removed.");
        console.log("  - No mutations needed when running with --apply.\n");
      } else {
        console.log("Planned actions when run with --apply:");
        if (unscoped.length > 0) {
          console.log(`  1. Backfill ${unscoped.length} document(s) with tenantId: "angkon-main"`);
        }
        if (!hasCompound) {
          console.log(`  2. Create compound unique index { tenantId: 1, key: 1 } (unique: true)`);
        }
        if (hasOldKeyUnique) {
          console.log(`  3. Drop legacy unique index 'key_1'`);
        }
        console.log("\n✔ To execute these planned actions, run:");
        console.log("    node scripts/migrate-settings-tenant.mjs --apply\n");
      }
      return;
    }

    // 6. Handle Apply Mode
    console.log("\n[4/4] Executing migration mutations (--apply)...");

    if (isAlreadyMigrated) {
      console.log("✔ Target database is ALREADY FULLY MIGRATED. Idempotency guard triggered: zero mutations applied.");
      return;
    }

    // Acquire Lock
    console.log("- Acquiring atomic migration lock...");
    const lockRes = await collection.findOneAndUpdate(
      { key: LOCK_KEY },
      { $setOnInsert: { lockedAt: new Date(), lockedBy: `pid_${process.pid}` } },
      { upsert: true, returnDocument: "after" }
    );
    if (!lockRes) {
      throw new Error("Could not acquire migration lock.");
    }

    try {
      // Step A: Backfill
      if (unscoped.length > 0) {
        console.log(`- Backfilling ${unscoped.length} document(s) with tenantId: "angkon-main"...`);
        const updateRes = await collection.updateMany(
          {
            key: { $ne: LOCK_KEY },
            $or: [{ tenantId: { $exists: false } }, { tenantId: null }, { tenantId: "" }],
          },
          { $set: { tenantId: "angkon-main" } }
        );
        console.log(`  ✔ Modified ${updateRes.modifiedCount} document(s).`);
      }

      // Step B: Create Compound Unique Index
      if (!hasCompound) {
        console.log("- Creating compound unique index { tenantId: 1, key: 1 }...");
        await collection.createIndex({ tenantId: 1, key: 1 }, { unique: true, name: "tenantId_1_key_1" });
        console.log("  ✔ Compound unique index 'tenantId_1_key_1' created successfully.");
      }

      // Step C: Drop old unique index if it was unique
      if (hasOldKeyUnique) {
        console.log("- Dropping legacy single-key unique index 'key_1'...");
        await collection.dropIndex("key_1");
        console.log("  ✔ Legacy index 'key_1' dropped successfully.");
      }

      // Step D: Final Verification
      console.log("\n- Running post-migration verification...");
      const finalDocs = await collection.find({ key: { $ne: LOCK_KEY } }).toArray();
      const finalIndexes = await collection.indexes();

      const finalUnscoped = finalDocs.filter((d) => !d.tenantId);
      const finalHasCompound = finalIndexes.some(
        (idx) => idx.key && idx.key.tenantId === 1 && idx.key.key === 1 && idx.unique === true
      );

      if (finalUnscoped.length > 0) {
        throw new Error(`Verification failed: ${finalUnscoped.length} documents still lack tenantId.`);
      }
      if (!finalHasCompound) {
        throw new Error("Verification failed: Compound index was not found on collection.");
      }

      console.log(`  ✔ Verification successful: 100% of documents (${finalDocs.length}) have valid tenantId.`);
      console.log(`  ✔ Verification successful: Compound unique index active on (tenantId, key).`);
      console.log("\n🎉 MIGRATION COMPLETED SUCCESSFULLY WITH ZERO ERRORS.\n");
    } finally {
      // Release lock
      await collection.deleteOne({ key: LOCK_KEY });
      console.log("- Released migration lock.");
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("\n❌ Migration operation failed with error:", err);
  process.exit(1);
});
