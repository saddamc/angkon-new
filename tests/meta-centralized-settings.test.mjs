import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Priority 6: Centralized Settings Route exists and exports GET and POST", () => {
  const routePath = path.resolve("src/app/api/admin/meta/settings/route.ts");
  assert.ok(fs.existsSync(routePath), "Centralized settings route.ts must exist");

  const content = fs.readFileSync(routePath, "utf-8");
  assert.ok(content.includes("export async function GET"), "Must export GET handler");
  assert.ok(content.includes("export async function POST"), "Must export POST handler");
  assert.ok(content.includes("requireSuperAdminSession"), "Must require superadmin session");
});

test("Priority 6: Centralized Settings covers all 8 enterprise sections", () => {
  const content = fs.readFileSync(path.resolve("src/app/api/admin/meta/settings/route.ts"), "utf-8");

  // Verify all 8 sections are constructed in response
  assert.ok(content.includes("general: {"), "Section 1: General & Business must exist");
  assert.ok(content.includes("dataset: {"), "Section 2: Dataset & Pixel must exist");
  assert.ok(content.includes("ads: {"), "Section 3: Ads & Marketing API must exist");
  assert.ok(content.includes("capi: {"), "Section 4: Conversions API must exist");
  assert.ok(content.includes("catalog: {"), "Section 5: Catalog & Feed must exist");
  assert.ok(content.includes("domain: {"), "Section 6: Domain Verification must exist");
  assert.ok(content.includes("security: {"), "Section 7: Security & Permissions must exist");
  assert.ok(content.includes("sync: {"), "Section 8: Automatic Synchronization must exist");
});

test("Priority 4 & 5: Auto-sync cadence and corrected 24-hour stale window", () => {
  const content = fs.readFileSync(path.resolve("src/app/api/admin/meta/settings/route.ts"), "utf-8");
  assert.ok(content.includes("datasetQualityHours: 12"), "EMQ sync interval must be 12 hours");
  assert.ok(
    content.includes("datasetQualityHours: 24"),
    "EMQ stale window must be 24 hours (not 24 minutes)"
  );

  const syncContent = fs.readFileSync(path.resolve("src/server/meta-sync.ts"), "utf-8");
  assert.ok(
    syncContent.includes("emq_quality: 24 * 60 * 60 * 1000"),
    "meta-sync.ts must specify 24 hours in milliseconds"
  );
});

test("Priority 6: Secret Masking & Safeguard against masked string overwrite", () => {
  const content = fs.readFileSync(path.resolve("src/app/api/admin/meta/settings/route.ts"), "utf-8");
  assert.ok(content.includes("isMaskedPlaceholder"), "Must implement isMaskedPlaceholder guard");
  assert.ok(
    content.includes("maskSecret"),
    "Must mask secret tokens with maskSecret utility"
  );
  assert.ok(
    content.includes("AES-256-GCM"),
    "Must document and maintain AES-256-GCM encryption at rest"
  );
});

test("Priority 6 & 7: Centralized Settings Frontend Page exists with Unified Statuses", () => {
  const pagePath = path.resolve("src/app/admin/meta/settings/page.tsx");
  assert.ok(fs.existsSync(pagePath), "settings/page.tsx must exist");

  const pageContent = fs.readFileSync(pagePath, "utf-8");
  assert.ok(pageContent.includes("renderStatusBadge"), "Must include unified status badge renderer");
  assert.ok(pageContent.includes("Verified"), "Must support Verified status");
  assert.ok(pageContent.includes("Connected"), "Must support Connected status");
  assert.ok(pageContent.includes("Configured"), "Must support Configured status");
  assert.ok(pageContent.includes("Pending"), "Must support Pending status");
  assert.ok(pageContent.includes("Attention required"), "Must support Attention required status");
  assert.ok(pageContent.includes("Failed"), "Must support Failed status");
  assert.ok(pageContent.includes("Unavailable"), "Must support Unavailable status");
});

test("Priority 5: Vercel Cron configuration includes /api/cron/meta-sync", () => {
  const vercelPath = path.resolve("vercel.json");
  assert.ok(fs.existsSync(vercelPath), "vercel.json must exist");

  const vercelContent = JSON.parse(fs.readFileSync(vercelPath, "utf-8"));
  assert.ok(Array.isArray(vercelContent.crons), "vercel.json must have crons array");
  const metaSyncCron = vercelContent.crons.find((c) => c.path === "/api/cron/meta-sync");
  assert.ok(metaSyncCron, "vercel.json must configure /api/cron/meta-sync");
  assert.equal(metaSyncCron.schedule, "0 0 * * *", "Cron schedule must be daily (0 0 * * *) to comply with Vercel Hobby limits");
});

test("Single Centralized Settings Hub: Catalog & Domain handlers in API and Frontend Deep-Linking", () => {
  const routeContent = fs.readFileSync(path.resolve("src/app/api/admin/meta/settings/route.ts"), "utf-8");
  assert.ok(routeContent.includes('section === "catalog"'), "API must handle section === 'catalog'");
  assert.ok(routeContent.includes('section === "domain"'), "API must handle section === 'domain'");

  const pageContent = fs.readFileSync(path.resolve("src/app/admin/meta/settings/page.tsx"), "utf-8");
  assert.ok(pageContent.includes("useSearchParams"), "Frontend must inspect useSearchParams");
  assert.ok(pageContent.includes("searchParams.get(\"section\")"), "Frontend must read ?section= query param");
  assert.ok(pageContent.includes("<Suspense"), "Page must be wrapped in Suspense for App Router safety");

  const eventsPage = fs.readFileSync(path.resolve("src/app/admin/meta/events/page.tsx"), "utf-8");
  assert.ok(eventsPage.includes("/admin/meta/settings?section=dataset"), "Events page must forward to centralized settings dataset section");

  const adsPage = fs.readFileSync(path.resolve("src/app/admin/meta/ads/page.tsx"), "utf-8");
  assert.ok(adsPage.includes("/admin/meta/settings?section=ads"), "Ads page must link to centralized settings ads section");

  const catalogPage = fs.readFileSync(path.resolve("src/app/admin/meta/catalog/page.tsx"), "utf-8");
  assert.ok(catalogPage.includes("/admin/meta/settings?section=catalog"), "Catalog page must link to centralized settings catalog section");

  const domainPage = fs.readFileSync(path.resolve("src/app/admin/meta/domain-verification/page.tsx"), "utf-8");
  assert.ok(domainPage.includes("/admin/meta/settings?section=domain"), "Domain page must link to centralized settings domain section");
});
