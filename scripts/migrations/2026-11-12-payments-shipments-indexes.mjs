/**
 * P0 migration: payment/shipment/order indexes.
 *
 * Production connects with `autoIndex: false`, so schema declarations do not
 * create indexes on Atlas. Run this once per environment (sandbox first):
 *
 *   node scripts/migrations/2026-11-12-payments-shipments-indexes.mjs --dry-run
 *   node scripts/migrations/2026-11-12-payments-shipments-indexes.mjs
 *
 * It is idempotent: MongoDB ignores an index that already exists with the same
 * key + options. It never writes application documents.
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

const dryRun = process.argv.includes("--dry-run");

const plan = [
  ["orders", { orderNumber: 1 }, { unique: true, name: "orderNumber_1" }],
  ["orders", { paymentMethod: 1 }, { name: "paymentMethod_1" }],
  ["orders", { paymentStatus: 1 }, { name: "paymentStatus_1" }],
  ["orders", { idempotencyKey: 1 }, { unique: true, sparse: true, name: "idempotencyKey_1" }],
  ["orders", { createdAt: -1 }, { name: "createdAt_-1" }],
  ["orders", { orderStatus: 1, createdAt: -1 }, { name: "orderStatus_1_createdAt_-1" }],
  ["orders", { userId: 1, createdAt: -1 }, { name: "userId_1_createdAt_-1" }],
  ["orders", { "customer.email": 1 }, { name: "customer.email_1" }],
  ["orders", { "customer.phone": 1 }, { name: "customer.phone_1" }],
  ["orders", { shipmentStatus: 1 }, { name: "shipmentStatus_1" }],
  ["payments", { tranId: 1 }, { unique: true, name: "tranId_1" }],
  ["payments", { orderNumber: 1 }, { name: "orderNumber_1" }],
  ["payments", { valId: 1 }, { unique: true, sparse: true, name: "valId_1" }],
  ["payments", { orderId: 1, createdAt: -1 }, { name: "orderId_1_createdAt_-1" }],
  ["payments", { status: 1 }, { name: "status_1" }],
  ["payments", { idempotencyKey: 1 }, { unique: true, sparse: true, name: "idempotencyKey_1" }],
  ["shipments", { orderId: 1, createdAt: -1 }, { name: "orderId_1_createdAt_-1" }],
  ["shipments", { orderNumber: 1 }, { name: "orderNumber_1" }],
  ["shipments", { idempotencyKey: 1 }, { unique: true, name: "idempotencyKey_1" }],
  ["shipments", { consignmentId: 1 }, { unique: true, sparse: true, name: "consignmentId_1" }],
  ["shipments", { trackingCode: 1 }, { unique: true, sparse: true, name: "trackingCode_1" }],
  ["shipments", { status: 1 }, { name: "status_1" }],
  ["admin_audit_logs", { createdAt: -1 }, { name: "createdAt_-1" }],
  ["admin_audit_logs", { targetId: 1, createdAt: -1 }, { name: "targetId_1_createdAt_-1" }],
  ["admin_audit_logs", { actor: 1, createdAt: -1 }, { name: "actor_1_createdAt_-1" }],
  // MongoDB rate limiting. The unique key makes the upsert atomic; the TTL
  // index only cleans up finished windows (enforcement is mathematical).
  ["ratelimitbuckets", { key: 1 }, { unique: true, name: "key_1" }],
  ["ratelimitbuckets", { expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_1" }],
];

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 30_000 });
let failures = 0;

try {
  await client.connect();
  const db = client.db();

  for (const [collectionName, keys, options] of plan) {
    const label = `${collectionName} ${JSON.stringify(keys)} ${JSON.stringify(options)}`;
    if (dryRun) {
      console.log(`[dry-run] ${label}`);
      continue;
    }
    try {
      const name = await db.collection(collectionName).createIndex(keys, options);
      console.log(`✓ ${collectionName}: ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`✗ ${collectionName}: ${error.message}`);
    }
  }

  if (dryRun) {
    console.log(`\nDry run complete — ${plan.length} index definitions.`);
  } else {
    console.log(
      failures === 0
        ? `\nDone — ${plan.length} indexes ensured.`
        : `\nFinished with ${failures} failure(s).`
    );
  }
} finally {
  await client.close();
}

if (failures > 0) process.exitCode = 1;
