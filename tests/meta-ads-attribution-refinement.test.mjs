import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ── ANGKON Ads & Attribution Route Refinement Tests ───────────────────

test("Ads & Attribution Page: Zero editable credential inputs (Strict Read-Only)", () => {
  const adsPage = fs.readFileSync(path.resolve("src/app/admin/meta/ads/page.tsx"), "utf-8");

  // Must not have text input fields for credentials
  assert.ok(!adsPage.includes('placeholder="act_1646756900434912"'), "Must not have raw editable input for adAccountId");
  assert.ok(!adsPage.includes('placeholder="EAAG..."'), "Must not have raw editable input for marketing token");
  assert.ok(!adsPage.includes("Save Configuration"), "Must not have local credential save buttons");
  assert.ok(!adsPage.includes("Save Credentials"), "Must not have local credential save buttons");

  // Only date inputs for filtering are permitted
  assert.ok(adsPage.includes('type="date"'), "Date filter inputs are preserved");
});

test("Ads & Attribution Page: Account Connection Panel displays all required telemetry", () => {
  const adsPage = fs.readFileSync(path.resolve("src/app/admin/meta/ads/page.tsx"), "utf-8");

  assert.ok(adsPage.includes("Meta Ads Account Connection"), "Title must be 'Meta Ads Account Connection'");
  assert.ok(adsPage.includes("Connected Ad Account"), "Displays connected ad account name");
  assert.ok(adsPage.includes("Business Portfolio ID"), "Displays Business Portfolio ID");
  assert.ok(adsPage.includes("Account Currency &amp; Timezone"), "Displays currency and timezone");
  assert.ok(adsPage.includes("Attribution Setting &amp; API Version"), "Displays attribution setting and API version");
  assert.ok(adsPage.includes("Marketing API Token (AES-256 Vault)"), "Displays token vault status");
  assert.ok(adsPage.includes("Verified Permission Scope"), "Displays permission scope");
  assert.ok(adsPage.includes("handleCopy"), "Features clipboard copy actions for account IDs");
});

test("Ads & Attribution Page: Replaces credential controls with Suite Settings link and live verification", () => {
  const adsPage = fs.readFileSync(path.resolve("src/app/admin/meta/ads/page.tsx"), "utf-8");

  assert.ok(adsPage.includes("/admin/meta/settings?section=ads"), "Links directly to Suite Settings ads section");
  assert.ok(adsPage.includes("Manage in Meta Suite Settings"), "Displays 'Manage in Meta Suite Settings' CTA");
  assert.ok(adsPage.includes("Verify Connection"), "Provides live 'Verify Connection' probe button");
  assert.ok(adsPage.includes("Show Technical Details"), "Features collapsible technical details drawer");
});

test("Ads & Attribution Page: Financial Dual-Ledger Audit preserves net realized cash & cross-system diagnostic", () => {
  const adsPage = fs.readFileSync(path.resolve("src/app/admin/meta/ads/page.tsx"), "utf-8");

  assert.ok(adsPage.includes("Meta Ads Manager Attributed"), "Preserves Meta Attributed card");
  assert.ok(adsPage.includes("Store Realized Cash (Net)"), "Preserves Store Realized Cash (Net) card");
  assert.ok(adsPage.includes("Cross-System Diagnostic"), "Preserves Cross-System Diagnostic card");
  assert.ok(adsPage.includes("Unsettled / In-Transit COD"), "Isolates unsettled COD from realized cash");
  assert.ok(adsPage.includes("Delivered status alone is never treated as collected cash"), "Documents cash basis rule");
});

test("Ads & Attribution Page: Reporting isolation levels and date presets prevent double-counting", () => {
  const adsPage = fs.readFileSync(path.resolve("src/app/admin/meta/ads/page.tsx"), "utf-8");

  assert.ok(adsPage.includes("Campaign Level"), "Supports Campaign Level isolation");
  assert.ok(adsPage.includes("Ad Set Level"), "Supports Ad Set Level isolation");
  assert.ok(adsPage.includes("Ad Level"), "Supports Ad Level isolation");
  assert.ok(adsPage.includes("Prevents Double-Counting"), "Documents isolation principle");
  assert.ok(adsPage.includes("setDatePreset"), "Provides date presets (Today, 7D, 30D, Month)");
});

test("Ads & Attribution Page: Historical sync jobs feature expandable slice inspection", () => {
  const adsPage = fs.readFileSync(path.resolve("src/app/admin/meta/ads/page.tsx"), "utf-8");

  assert.ok(adsPage.includes("Historical Synchronization Jobs"), "Displays historical sync jobs");
  assert.ok(adsPage.includes("Inspect Slices"), "Provides Inspect Slices toggle");
  assert.ok(adsPage.includes("Partitioned 30-Day Execution Slices"), "Displays detailed slices breakdown");
});

test("Ads & Attribution Page: Campaign telemetry table and click-to-inspect modal", () => {
  const adsPage = fs.readFileSync(path.resolve("src/app/admin/meta/ads/page.tsx"), "utf-8");

  assert.ok(adsPage.includes("Ad Account Campaigns Telemetry"), "Displays campaigns telemetry");
  assert.ok(adsPage.includes("setSelectedCampaign"), "Opens campaign details modal on row click");
  assert.ok(adsPage.includes("View Campaign in Meta Ads Manager"), "Links directly to Meta Ads Manager");
});

test("Centralized Settings: Provides dedicated popup dialogs for Ads & Portfolio configuration", () => {
  const settingsPage = fs.readFileSync(path.resolve("src/app/admin/meta/settings/page.tsx"), "utf-8");

  assert.ok(settingsPage.includes("ConfigureAdAccountModal"), "Features ConfigureAdAccountModal dialog");
  assert.ok(settingsPage.includes("ReplaceMarketingTokenModal"), "Features ReplaceMarketingTokenModal dialog");
  assert.ok(settingsPage.includes("UpdateBusinessIdModal"), "Features UpdateBusinessIdModal dialog");
  assert.ok(settingsPage.includes("UpdateAttributionConfigModal"), "Features UpdateAttributionConfigModal dialog");
  assert.ok(settingsPage.includes("MetaConfirmWarningModal"), "Features MetaConfirmWarningModal dialog");
  assert.ok(settingsPage.includes("isDisconnectModalOpen"), "Requires confirmation dialog before disconnecting");
});
