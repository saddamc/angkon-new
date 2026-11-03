import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ── ANGKON Catalog Feed Route Refinement Tests ─────────────────────────

test("Catalog Feed Page: Zero editable credential input fields (Strict Read-Only)", () => {
  const catalogPage = fs.readFileSync(path.resolve("src/app/admin/meta/catalog/page.tsx"), "utf-8");

  // Must not have editable input fields for Catalog ID or tokens
  assert.ok(!catalogPage.includes('placeholder="e.g. 1112170671558899"'), "Must not have raw editable input for catalogId");
  assert.ok(!catalogPage.includes('placeholder="EAAG..."'), "Must not have raw editable input for catalog token");
  assert.ok(!catalogPage.includes("Save Catalog Setup"), "Must not have local setup save buttons");
  assert.ok(!catalogPage.includes("saveCatalogSetup"), "Must not have local setup form submission handler");
  assert.ok(!catalogPage.includes("Clear Setup"), "Must not have destructive clear buttons on monitoring route");

  // Search input for inventory table is permitted
  assert.ok(catalogPage.includes('placeholder="Search ID, title, brand..."'), "Inventory search filter is preserved");
});

test("Catalog Feed Page: Phase 1 — Catalog Health Overview (4 KPI cards with Truthful Separation)", () => {
  const catalogPage = fs.readFileSync(path.resolve("src/app/admin/meta/catalog/page.tsx"), "utf-8");

  assert.ok(catalogPage.includes("Database Products"), "Card 1: Displays Database Products count");
  assert.ok(catalogPage.includes("in XML feed"), "Card 1: Displays count of products included in feed");
  assert.ok(catalogPage.includes("Feed Validation"), "Card 2: Displays Local Feed Validation state");
  assert.ok(catalogPage.includes("Specific Taxonomy"), "Card 3: Displays Specific Category Taxonomy count");
  assert.ok(catalogPage.includes("Meta Ingestion Telemetry"), "Card 4: Displays Meta Ingestion Telemetry");
  assert.ok(catalogPage.includes("Local validation != Meta acceptance"), "Truthfully notes separation of local validation vs Meta acceptance");
  assert.ok(catalogPage.includes("Fallbacks (not counted)"), "Explicitly does not count fallback categories as specific mappings");
});

test("Catalog Feed Page: Phase 2 — 6-Stage Feed Connection Lifecycle Monitoring", () => {
  const catalogPage = fs.readFileSync(path.resolve("src/app/admin/meta/catalog/page.tsx"), "utf-8");

  assert.ok(catalogPage.includes("Feed Connection Lifecycle"), "Section heading exists");
  assert.ok(catalogPage.includes("Stage 1"), "Lifecycle Stage 1 exists");
  assert.ok(catalogPage.includes("Feed Generated"), "Stage 1: Feed Generated");
  assert.ok(catalogPage.includes("Stage 2"), "Lifecycle Stage 2 exists");
  assert.ok(catalogPage.includes("URL Accessible"), "Stage 2: Production URL Accessible");
  assert.ok(catalogPage.includes("Stage 3"), "Lifecycle Stage 3 exists");
  assert.ok(catalogPage.includes("Feed Registered"), "Stage 3: Feed Registered with Meta");
  assert.ok(catalogPage.includes("Stage 4"), "Lifecycle Stage 4 exists");
  assert.ok(catalogPage.includes("Meta Fetched Feed"), "Stage 4: Meta Fetched Feed");
  assert.ok(catalogPage.includes("Stage 5"), "Lifecycle Stage 5 exists");
  assert.ok(catalogPage.includes("Meta Processed"), "Stage 5: Meta Processed Feed");
  assert.ok(catalogPage.includes("Stage 6"), "Lifecycle Stage 6 exists");
  assert.ok(catalogPage.includes("Products Ingested"), "Stage 6: Products Ingested / Accepted");
});

test("Catalog Feed Page: Phase 3 — Production Feed Live Diagnostics Probe", () => {
  const catalogPage = fs.readFileSync(path.resolve("src/app/admin/meta/catalog/page.tsx"), "utf-8");

  assert.ok(catalogPage.includes("Production Feed Diagnostics"), "Diagnostics card title present");
  assert.ok(catalogPage.includes("Run Live Probe"), "Provides 'Run Live Probe' button");
  assert.ok(catalogPage.includes("runProductionProbe"), "Wires production probe execution handler");
  assert.ok(catalogPage.includes("HTTPS Verified"), "Checks HTTPS protocol");
  assert.ok(catalogPage.includes("application/xml"), "Checks XML MIME type");
  assert.ok(catalogPage.includes("RSS 2.0 Valid"), "Checks RSS 2.0 XML schema");
  assert.ok(catalogPage.includes("0 Duplicates (Clean)"), "Checks for duplicate item IDs");
  assert.ok(catalogPage.includes("100% Public HTTPS"), "Checks public image links");
  assert.ok(catalogPage.includes("BDT Formatted"), "Checks currency ISO 4217 code");
});

test("Catalog Feed Page: Phase 4 & 7 — Meta Import & Scheduled Feed Monitoring", () => {
  const catalogPage = fs.readFileSync(path.resolve("src/app/admin/meta/catalog/page.tsx"), "utf-8");

  assert.ok(catalogPage.includes("Meta Import Monitoring"), "Import monitoring section present");
  assert.ok(catalogPage.includes("Fetch Meta Telemetry"), "Provides 'Fetch Meta Telemetry' button");
  assert.ok(catalogPage.includes("checkImportStatusFromMeta"), "Wires checkImportStatusFromMeta API handler");
  assert.ok(catalogPage.includes("Scheduled Feed Registration"), "Scheduled feed section present");
  assert.ok(catalogPage.includes("Daily at 04:00 AM BD Time"), "Displays daily 04:00 AM BD Time crawl schedule");
  assert.ok(catalogPage.includes("Next Expected Meta Fetch"), "Computes next expected fetch time");
});

test("Catalog Feed Page: Phase 5 — Category Taxonomy & Saree Mapping Coverage", () => {
  const catalogPage = fs.readFileSync(path.resolve("src/app/admin/meta/catalog/page.tsx"), "utf-8");

  assert.ok(catalogPage.includes("Category Mapping Taxonomy Coverage"), "Taxonomy section heading present");
  assert.ok(catalogPage.includes("Taxonomy ID: 212"), "Explicitly references Saree Taxonomy ID 212");
  assert.ok(catalogPage.includes("Traditional &amp; Cultural Wear &gt; Sarees"), "Displays full Meta taxonomy path");
  assert.ok(catalogPage.includes("Explicit / Rule Mapping"), "Identifies explicit taxonomy rules");
});

test("Catalog Feed Page: Phase 6 — Product Preview Table with Filters & Detail Drawer", () => {
  const catalogPage = fs.readFileSync(path.resolve("src/app/admin/meta/catalog/page.tsx"), "utf-8");

  assert.ok(catalogPage.includes("Catalog Feed Product Inventory"), "Inventory table heading present");
  assert.ok(catalogPage.includes("CatalogProductDetailDrawer"), "Integrates CatalogProductDetailDrawer component");
  assert.ok(catalogPage.includes("filterTab"), "Maintains filterTab state");
  assert.ok(catalogPage.includes("All Products"), "Filter pill: All Products");
  assert.ok(catalogPage.includes("Valid Items"), "Filter pill: Valid Items");
  assert.ok(catalogPage.includes("Fallback Category"), "Filter pill: Fallback Category");
  assert.ok(catalogPage.includes("setSelectedProduct"), "Sets selected product when row clicked");
  assert.ok(catalogPage.includes("setIsDrawerOpen(true)"), "Opens drawer on row click");
});

test("Catalog Product Detail Drawer: Renders all 5 inspection tabs & 3-way deduplication alignment", () => {
  const drawerSource = fs.readFileSync(
    path.resolve("src/components/admin/meta/catalog-product-detail-drawer.tsx"),
    "utf-8"
  );

  assert.ok(drawerSource.includes("Product Overview"), "Tab 1: Product Overview");
  assert.ok(drawerSource.includes("Emitted XML Tag"), "Tab 2: Emitted XML Tag");
  assert.ok(drawerSource.includes("Pixel & CAPI Alignment"), "Tab 3: Pixel & CAPI Alignment");
  assert.ok(drawerSource.includes("Validation Checklist"), "Tab 4: Validation Checklist");
  assert.ok(drawerSource.includes("Category Taxonomy"), "Tab 5: Category Taxonomy");

  // 3-way alignment
  assert.ok(drawerSource.includes("1. Catalog Feed (g:id)"), "Verifies feed g:id");
  assert.ok(drawerSource.includes("2. Meta Browser Pixel (content_ids)"), "Verifies Pixel content_ids");
  assert.ok(drawerSource.includes("3. Conversions API (CAPI custom_data)"), "Verifies CAPI custom_data");
  assert.ok(drawerSource.includes("Deterministic 3-Way Signal Deduplication"), "Documents 3-way deduplication alignment");
});

test("Meta Suite Settings: Section 5 wires popup dialogs and renders Catalog modals", () => {
  const settingsSource = fs.readFileSync(
    path.resolve("src/app/admin/meta/settings/page.tsx"),
    "utf-8"
  );

  assert.ok(settingsSource.includes("EditCatalogIdModal"), "Imports & renders EditCatalogIdModal");
  assert.ok(settingsSource.includes("ConfigureCatalogTokenModal"), "Imports & renders ConfigureCatalogTokenModal");
  assert.ok(settingsSource.includes("ConfigureFeedScheduleModal"), "Imports & renders ConfigureFeedScheduleModal");
  assert.ok(settingsSource.includes("setIsCatalogIdModalOpen(true)"), "Triggers EditCatalogIdModal on Edit ID button");
  assert.ok(settingsSource.includes("setIsCatalogTokenModalOpen(true)"), "Triggers ConfigureCatalogTokenModal on Replace button");
  assert.ok(settingsSource.includes("setIsFeedScheduleModalOpen(true)"), "Triggers ConfigureFeedScheduleModal on Configure Schedule button");
});

test("Meta Credential Modals: Exports EditCatalogIdModal, ConfigureCatalogTokenModal, and ConfigureFeedScheduleModal", () => {
  const modalsSource = fs.readFileSync(
    path.resolve("src/components/admin/meta/meta-credential-modals.tsx"),
    "utf-8"
  );

  assert.ok(modalsSource.includes("export function EditCatalogIdModal"), "Exports EditCatalogIdModal");
  assert.ok(modalsSource.includes("export function ConfigureCatalogTokenModal"), "Exports ConfigureCatalogTokenModal");
  assert.ok(modalsSource.includes("export function ConfigureFeedScheduleModal"), "Exports ConfigureFeedScheduleModal");
  assert.ok(modalsSource.includes("Vault Encryption Guarantee"), "Documents AES-256 vault encryption guarantee");
});

test("Events Manager Settings Tab: Full-width layout with centralized settings banner", () => {
  const eventsPage = fs.readFileSync(path.resolve("src/app/admin/meta/events/page.tsx"), "utf-8");

  assert.ok(eventsPage.includes("space-y-6 w-full my-4"), "Settings tab uses full-width container (no awkward margins)");
  assert.ok(eventsPage.includes("Centralized in Meta Suite Settings"), "Banner documents centralized settings");
  assert.ok(eventsPage.includes("/admin/meta/settings?section=dataset"), "Links directly to Suite Settings dataset section");
});
