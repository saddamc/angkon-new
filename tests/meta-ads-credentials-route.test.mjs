import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ── Priority 1: Meta Ads Credentials Route Contract & Verification ──

test("Ads Credentials Route: File exists and exports GET, POST, DELETE", () => {
  const routePath = path.resolve("src/app/api/admin/meta/ads/credentials/route.ts");
  assert.ok(fs.existsSync(routePath), "Ads credentials route.ts must exist");

  const content = fs.readFileSync(routePath, "utf-8");
  assert.ok(content.includes("export async function GET"), "Must export GET handler (resolving HTTP 405)");
  assert.ok(content.includes("export async function POST"), "Must export POST handler");
  assert.ok(content.includes("export async function DELETE"), "Must export DELETE handler");
});

test("Ads Credentials Route: Authentication & RBAC guard", () => {
  const content = fs.readFileSync(path.resolve("src/app/api/admin/meta/ads/credentials/route.ts"), "utf-8");
  assert.ok(content.includes("requireSuperAdminSession"), "Must use requireSuperAdminSession guard");
});

test("Ads Credentials Route: Secret Masking Invariant in GET & POST", () => {
  const content = fs.readFileSync(path.resolve("src/app/api/admin/meta/ads/credentials/route.ts"), "utf-8");
  assert.ok(
    content.includes("getPublicMetaMarketingSettings"),
    "Must use getPublicMetaMarketingSettings so raw tokens are masked"
  );
  assert.ok(
    !content.includes("res.json({ token: fullSettings.accessToken })"),
    "Must never echo raw unmasked tokens"
  );
});

test("Ads Credentials Route: Supported vs Unsupported Method handling", () => {
  const content = fs.readFileSync(path.resolve("src/app/api/admin/meta/ads/credentials/route.ts"), "utf-8");
  // Next.js App Router automatically returns 405 Method Not Allowed for HTTP methods not exported
  const exportedMethods = [];
  if (content.includes("export async function GET")) exportedMethods.push("GET");
  if (content.includes("export async function POST")) exportedMethods.push("POST");
  if (content.includes("export async function DELETE")) exportedMethods.push("DELETE");
  if (content.includes("export async function PUT")) exportedMethods.push("PUT");
  if (content.includes("export async function PATCH")) exportedMethods.push("PATCH");

  assert.deepEqual(exportedMethods, ["GET", "POST", "DELETE"]);
  assert.ok(!exportedMethods.includes("PUT"), "PUT is unsupported and returns HTTP 405");
  assert.ok(!exportedMethods.includes("PATCH"), "PATCH is unsupported and returns HTTP 405");
});

test("Ads Credentials Route: Detailed operational states in failure handling", () => {
  const content = fs.readFileSync(path.resolve("src/app/api/admin/meta/ads/credentials/route.ts"), "utf-8");
  assert.ok(content.includes("permission_denied"), "Distinguishes permission_denied from generic failure");
  assert.ok(content.includes("token_expired"), "Distinguishes token_expired from generic failure");
  assert.ok(content.includes("configured"), "Records configured status prior to validation");
});
