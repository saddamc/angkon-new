import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

/**
 * Whole-database backup / restore.
 *
 * Restore is merge-only: documents are upserted by `_id`, nothing is dropped.
 * These tests cover the pure half — validation, target selection, bulk-write
 * planning and Extended-JSON round-tripping — so a malformed file can never
 * reach the database.
 */

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return nextResolve(
        pathToFileURL(path.resolve("tests/stubs/server-only-stub.mjs")).href,
        context
      );
    }
    if (specifier === "@/lib/mongodb") {
      return nextResolve(
        pathToFileURL(path.resolve("tests/stubs/mongodb-stub.mjs")).href,
        context
      );
    }
    return nextResolve(specifier, context);
  },
});

const mod = await import("../src/server/database-backup.ts");
const { ObjectId } = await import("bson");

const {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  PROTECTED_COLLECTIONS,
  MAX_DOCUMENTS_PER_COLLECTION,
  isSystemCollection,
  isSafeCollectionName,
  isProtectedCollection,
  serializeDocument,
  deserializeDocument,
  validateBackupPayload,
  selectRestoreTargets,
  buildUpsertOperations,
} = mod;

function validFile(overrides = {}) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    generatedAt: "2026-11-04T00:00:00.000Z",
    database: "angkon",
    collections: [
      { name: "products", count: 1, documents: [{ _id: { $oid: "65f000000000000000000001" }, name: "Saree" }] },
      { name: "orders", count: 0, documents: [] },
    ],
    ...overrides,
  };
}

/* ── validation ─────────────────────────────────────────────────────────── */

test("accepts a well-formed backup", () => {
  const result = validateBackupPayload(validFile());
  assert.equal(result.ok, true);
  assert.equal(result.file.collections.length, 2);
  assert.equal(result.file.format, BACKUP_FORMAT);
});

test("rejects a foreign file", () => {
  const result = validateBackupPayload({ hello: "world" });
  assert.equal(result.ok, false);
  assert.match(result.error, /format/i);
});

test("rejects an unsupported version", () => {
  const result = validateBackupPayload(validFile({ version: 99 }));
  assert.equal(result.ok, false);
  assert.match(result.error, /version/i);
});

test("rejects unsafe collection names", () => {
  for (const name of ["system.users", "$cmd", "a b", "../etc", "", "x".repeat(200)]) {
    const result = validateBackupPayload(
      validFile({ collections: [{ name, count: 0, documents: [] }] })
    );
    assert.equal(result.ok, false, `"${name}" must be rejected`);
  }
});

test("rejects duplicate collections", () => {
  const result = validateBackupPayload(
    validFile({
      collections: [
        { name: "orders", count: 0, documents: [] },
        { name: "orders", count: 0, documents: [] },
      ],
    })
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /more than once/i);
});

test("rejects a collection without a documents array", () => {
  const result = validateBackupPayload(
    validFile({ collections: [{ name: "orders", count: 0 }] })
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /documents/i);
});

test("rejects a collection above the document cap", () => {
  const documents = new Array(MAX_DOCUMENTS_PER_COLLECTION + 1).fill({ _id: "x" });
  const result = validateBackupPayload(
    validFile({ collections: [{ name: "orders", count: documents.length, documents }] })
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /limit/i);
});

test("rejects non-object input", () => {
  for (const value of [null, undefined, "string", 42, []]) {
    assert.equal(validateBackupPayload(value).ok, false);
  }
});

/* ── collection naming ──────────────────────────────────────────────────── */

test("system collections are never backed up or restored", () => {
  assert.equal(isSystemCollection("system.users"), true);
  assert.equal(isSystemCollection("$cmd"), true);
  assert.equal(isSystemCollection("products"), false);
  assert.equal(isSafeCollectionName("system.indexes"), false);
  assert.equal(isSafeCollectionName("products"), true);
});

test("users is a protected collection", () => {
  assert.deepEqual([...PROTECTED_COLLECTIONS], ["users"]);
  assert.equal(isProtectedCollection("users"), true);
  assert.equal(isProtectedCollection("orders"), false);
});

/* ── restore targeting ──────────────────────────────────────────────────── */

test("restore skips users by default and reports why", () => {
  const file = validateBackupPayload(
    validFile({
      collections: [
        { name: "products", count: 0, documents: [] },
        { name: "users", count: 0, documents: [] },
      ],
    })
  ).file;

  const { targets, skipped } = selectRestoreTargets(file);

  assert.deepEqual(targets.map((t) => t.name), ["products"]);
  assert.deepEqual(skipped.map((s) => s.name), ["users"]);
  assert.match(skipped[0].reason, /protected/i);
});

test("users is restored only when explicitly allowed", () => {
  const file = validateBackupPayload(
    validFile({ collections: [{ name: "users", count: 0, documents: [] }] })
  ).file;

  const { targets, skipped } = selectRestoreTargets(file, { includeUsers: true });

  assert.deepEqual(targets.map((t) => t.name), ["users"]);
  assert.equal(skipped.length, 0);
});

/* ── bulk-write planning ────────────────────────────────────────────────── */

test("upsert operations replace by _id and never delete", () => {
  const docs = [
    { _id: "a", name: "one" },
    { _id: "b", name: "two" },
  ];

  const ops = buildUpsertOperations(docs);

  assert.equal(ops.length, 2);
  for (const op of ops) {
    assert.ok("replaceOne" in op);
    assert.equal(op.replaceOne.upsert, true);
    assert.ok("_id" in op.replaceOne.filter);
    assert.equal(op.replaceOne.filter._id, op.replaceOne.replacement._id);
    assert.ok(!("deleteOne" in op) && !("deleteMany" in op));
  }
});

test("documents without an _id are skipped rather than inserted blindly", () => {
  const ops = buildUpsertOperations([{ _id: "a" }, { name: "no id" }, null]);
  assert.equal(ops.length, 1);
});

/* ── Extended JSON round-trip ───────────────────────────────────────────── */

test("ObjectId and Date survive a backup round-trip", () => {
  const original = {
    _id: new ObjectId(),
    createdAt: new Date("2026-01-02T03:04:05.000Z"),
    price: 1250,
    tags: ["silk", "saree"],
  };

  const restored = deserializeDocument(serializeDocument(original));

  assert.ok(restored._id instanceof ObjectId, "_id must stay an ObjectId");
  assert.equal(restored._id.toString(), original._id.toString());
  assert.ok(restored.createdAt instanceof Date, "dates must stay dates");
  assert.equal(restored.createdAt.toISOString(), original.createdAt.toISOString());
  assert.deepEqual(restored.tags, original.tags);
});

test("plain JSON.stringify would corrupt an ObjectId — the reason EJSON is used", () => {
  const original = { _id: new ObjectId() };
  const naive = JSON.parse(JSON.stringify(original));
  assert.equal(typeof naive._id, "string", "naive JSON turns _id into a string");
  assert.ok(!(naive._id instanceof ObjectId));
});

/* ── wiring ─────────────────────────────────────────────────────────────── */

test("the backup API is super-admin only and never cached", () => {
  const source = fs.readFileSync("src/app/api/admin/meta/backup/route.ts", "utf8");

  assert.ok(source.includes("requireSuperAdminSession"), "must re-check the session server-side");
  assert.ok(source.includes("no-store"), "backups must never be cached");
  assert.ok(source.includes("Content-Disposition"), "downloads need a filename");
  assert.ok(!source.includes("deleteMany"), "restore must never drop data");
  assert.ok(!source.includes("dropDatabase"));
});

test("the backup page lives under the super-admin-only Meta layout", () => {
  assert.ok(fs.existsSync("src/app/admin/meta/backup/page.tsx"));

  const layout = fs.readFileSync("src/app/admin/meta/layout.tsx", "utf8");
  assert.ok(
    layout.includes('tokenVerification.role !== "superadmin"'),
    "the Meta layout must reject non-superadmins"
  );
});

test("the route is reachable from the Meta navigation", () => {
  const nav = fs.readFileSync("src/app/admin/meta/meta-nav.tsx", "utf8");
  assert.ok(nav.includes('href: "/admin/meta/backup"'));
});
