import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getCronSecret,
  getJwtSecret,
  getMasterEncryptionSecret,
  hasJwtSecret,
} from "../src/lib/env.ts";

/**
 * P4 contract: fail closed in production, no hardcoded signing secrets,
 * rate-limited payment/webhook endpoints, and an admin audit trail.
 */

const read = (file) => fs.readFileSync(file, "utf8");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const auth = read("src/server/auth.ts");
const adminAuth = read("src/server/admin-auth.ts");
const sslcommerz = read("src/server/sslcommerz.ts");
const emailCode = read("src/server/email-code.ts");
const returnToken = read("src/server/payments/return-token.ts");
const proxy = read("src/proxy.ts");
const cronMeta = read("src/app/api/cron/meta-sync/route.ts");
const cronReconcile = read("src/app/api/payment/sslcommerz/reconcile/route.ts");
const callback = read("src/app/api/payment/sslcommerz/callback/route.ts");
const ipn = read("src/app/api/payment/sslcommerz/ipn/route.ts");
const webhook = read("src/app/api/webhooks/steadfast/route.ts");
const adminOrder = read("src/app/api/admin/orders/[id]/route.ts");
const migration = read("scripts/migrations/2026-11-12-payments-shipments-indexes.mjs");
const envExample = read(".env.example");

test("env: production fails closed when JWT_SECRET is missing", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "production";
    assert.equal(hasJwtSecret(), false);
    assert.throws(() => getJwtSecret(), /JWT_SECRET is required/);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("env: development and tests keep a usable local secret", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = "test";
    assert.ok(getJwtSecret().length > 20);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("env: cron and encryption secrets are resolved only from the environment", () => {
  const prevCron = process.env.CRON_SECRET;
  const prevJwt = process.env.JWT_SECRET;
  try {
    process.env.CRON_SECRET = "cron-abc";
    assert.equal(getCronSecret(), "cron-abc");
    process.env.CRON_SECRET = "";
    process.env.JWT_SECRET = "jwt-abc";
    assert.equal(getCronSecret(), "jwt-abc");
    delete process.env.CRON_SECRET;
    delete process.env.JWT_SECRET;
    assert.equal(getCronSecret(), null);
    assert.equal(getMasterEncryptionSecret(), null);
  } finally {
    if (prevCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevCron;
    if (prevJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevJwt;
  }
});

test("signing modules use the guarded secret, not a literal fallback", () => {
  for (const [name, source] of [
    ["auth", auth],
    ["admin-auth", adminAuth],
    ["sslcommerz", sslcommerz],
    ["email-code", emailCode],
    ["return-token", returnToken],
  ]) {
    assert.ok(source.includes("getJwtSecret"), `${name} must use getJwtSecret()`);
  }
  assert.ok(proxy.includes('process.env.JWT_SECRET?.trim() || ""'));
  assert.ok(proxy.includes("if (!JWT_SECRET) return null;"));
});

test("no hardcoded JWT secret remains outside legacy decryption keys", () => {
  const files = walk("src");
  for (const file of files) {
    if (file.endsWith(path.join("src", "lib", "security", "token-encryption.ts"))) continue;
    const source = read(file);
    assert.ok(
      !source.includes("angkon_secure_jwt_secret_2026"),
      `${file} still contains the old fallback secret`
    );
    assert.ok(
      !source.includes(
        "35c6873774cfc2f4ca50ec33e8035e8db6f326a0c13c452527c57c5439dadbabc29b834bc77365846171055743c5d1d38c7d5a078c88b7b691199f57d78bdb92"
      ),
      `${file} still contains the hardcoded encryption fallback`
    );
  }

  const encryption = read("src/lib/security/token-encryption.ts");
  const masterKeyBody = encryption.slice(
    encryption.indexOf("export function getMasterKey"),
    encryption.indexOf("export function getRotationKeys")
  );
  assert.ok(
    !masterKeyBody.includes("35c6873774cfc2f4ca50ec33e8035e8db6f326a0c13c452527c57c5439dadbabc29b834bc77365846171055743c5d1d38c7d5a078c88b7b691199f57d78bdb92"),
    "new encryption must not use the hardcoded fallback"
  );
  assert.ok(
    encryption.includes("Legacy decryption keys only"),
    "rotation keys must be marked legacy/decryption-only"
  );
});

test("cron routes require a configured secret; a spoofed Vercel header is not enough", () => {
  for (const [name, source] of [
    ["meta-sync", cronMeta],
    ["reconcile", cronReconcile],
  ]) {
    assert.ok(source.includes("getCronSecret"), `${name} must use getCronSecret()`);
    assert.ok(!source.includes("isVercelCron"), `${name} must not trust x-vercel-cron alone`);
    assert.ok(source.includes("Authorization") || source.includes("authorization"), `${name} must read the bearer header`);
  }
});

test("payment and webhook endpoints are rate-limited", () => {
  for (const [name, source] of [
    ["callback", callback],
    ["ipn", ipn],
    ["steadfast webhook", webhook],
    ["reconcile", cronReconcile],
  ]) {
    assert.ok(source.includes("rateLimit"), `${name} must rate-limit`);
  }
});

test("admin overrides are audited", () => {
  assert.ok(adminOrder.includes("AdminAuditLog.create"));
  assert.ok(adminOrder.includes("beforeOrder"));
  assert.ok(adminOrder.includes("after:"));
  assert.ok(migration.includes('"admin_audit_logs"'));
});

test("env example documents the new secrets", () => {
  assert.ok(envExample.includes("CRON_SECRET="));
  assert.ok(envExample.includes("META_TOKEN_ENCRYPTION_KEY="));
});
