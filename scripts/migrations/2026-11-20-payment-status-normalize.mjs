/**
 * One-time payment status normalization.
 *
 * Legacy rows in the shared `payments` collection use `paid` / `initiated`.
 * The centralized module uses `succeeded` / `pending`. Reads already normalize
 * both, but normalizing the data removes the last ambiguity for reporting and
 * external exports.
 *
 * Safe by default: prints what would change and writes nothing. Apply with:
 *
 *   node scripts/migrations/2026-11-20-payment-status-normalize.mjs --apply
 *
 * `orders.paymentStatus` is intentionally NOT touched: `paid` is the canonical
 * customer-facing order payment state.
 */

import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key]) continue;
      process.env[key] = raw.replace(/^["']|["']$/g, "").trim();
    }
  }
}

loadEnv();

const uri =
  process.env.DATABASE_URL || process.env.MONGODB_URI || process.env.MONGODB_URL;

if (!uri) {
  console.error("DATABASE_URL / MONGODB_URI is required.");
  process.exit(1);
}

const apply = process.argv.includes("--apply");

const REMAP = [
  { from: "paid", to: "succeeded" },
  { from: "initiated", to: "pending" },
];

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 30_000 });

try {
  await client.connect();
  const db = client.db();
  const payments = db.collection("payments");

  for (const { from, to } of REMAP) {
    const count = await payments.countDocuments({ status: from });
    console.log(`${from} -> ${to}: ${count} document(s)`);

    if (apply && count > 0) {
      const result = await payments.updateMany(
        { status: from },
        { $set: { status: to } }
      );
      console.log(`  updated ${result.modifiedCount}`);
    }
  }

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to write the changes.");
  }
} finally {
  await client.close();
}
