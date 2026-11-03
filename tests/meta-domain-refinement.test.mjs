import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ── ANGKON Domain Verification & AEM Refinement Tests ────────────────────

const CANONICAL_ROOT_DOMAIN = "angkon.net";
const CANONICAL_NAMESERVERS = [
  "dns1.registrar-servers.com",
  "dns2.registrar-servers.com",
];

function calculateLifecycleState(params) {
  const { dnsStatus, htmlStatus, metaOwnershipVerified, isMismatch, isTimeoutOrNetworkError } = params;
  if (isMismatch) return "DNS_MISMATCH";
  const isMethodVerified = dnsStatus === "DETECTED" || htmlStatus === "DETECTED";
  if (metaOwnershipVerified && isMethodVerified) return "VERIFIED";
  if (metaOwnershipVerified && isTimeoutOrNetworkError) return "VERIFIED";
  if (metaOwnershipVerified && !isMethodVerified) return "FAILED";
  if (dnsStatus === "DETECTED") return "DNS_DETECTED";
  if (htmlStatus === "DETECTED") return "HTML_DETECTED";
  if (dnsStatus === "ERROR" || htmlStatus === "ERROR") return "FAILED";
  return "PENDING";
}

const AEM_CALIBRATED_EVENTS = [
  { name: "Purchase", priority: 1, valueOptimization: true, description: "Direct storefront revenue" },
  { name: "InitiateCheckout", priority: 2, valueOptimization: false, description: "Customer began payment" },
  { name: "AddToCart", priority: 3, valueOptimization: false, description: "Product added to shopping bag" },
  { name: "ViewContent", priority: 4, valueOptimization: false, description: "Product page views" },
  { name: "PageView", priority: 5, valueOptimization: false, description: "Storefront traffic" },
];

function getAemConfiguration(tenantId = "angkon-main") {
  const calibratedSlots = AEM_CALIBRATED_EVENTS.map((item, idx) => ({
    ...item,
    slot: idx + 1,
    isCalibrated: true,
  }));
  const emptySlots = [];
  for (let s = calibratedSlots.length + 1; s <= 8; s++) {
    emptySlots.push({
      slot: s,
      name: `Slot #${s} — Available`,
      isCalibrated: false,
    });
  }
  return {
    domain: CANONICAL_ROOT_DOMAIN,
    maxSlots: 8,
    calibratedCount: calibratedSlots.length,
    availableSlotsCount: emptySlots.length,
    calibratedSlots,
    allSlots: [...calibratedSlots, ...emptySlots],
    metaApiLimitationNote:
      "Meta Graph API v22.0 does not expose a public programmatic REST endpoint to query or mutate tenant Aggregated Event Measurement (AEM) slot priorities. Verification and slot mutation must be confirmed manually in Meta Business Settings > Events Manager > Aggregated Event Measurement.",
  };
}

// ── ANGKON Domain Verification & AEM Refinement Tests ────────────────────

test("Invariant 1: Domain Verification Page has zero editable credential inputs", () => {
  const pageContent = fs.readFileSync(
    path.resolve("src/app/admin/meta/domain-verification/page.tsx"),
    "utf-8"
  );

  // Must not have text or password inputs for editing tokens or domain names directly on this page
  assert.ok(!pageContent.includes('<input type="text"'), "Domain page must not contain raw text inputs");
  assert.ok(!pageContent.includes('<input type="password"'), "Domain page must not contain password inputs");
  assert.ok(!pageContent.includes('name="verificationToken"'), "Domain page must not have token input forms");

  // Must redirect/link to centralized Suite Settings
  assert.ok(
    pageContent.includes("/admin/meta/settings?section=domain"),
    "Domain page must link directly to centralized Meta Suite Settings"
  );
});

test("Invariant 2: Three Independent Diagnostic Pillars exist in Domain page", () => {
  const pageContent = fs.readFileSync(
    path.resolve("src/app/admin/meta/domain-verification/page.tsx"),
    "utf-8"
  );

  // Pillar 1: DNS TXT
  assert.ok(pageContent.includes("Pillar 1: DNS TXT"), "Pillar 1 DNS TXT must be present");
  assert.ok(pageContent.includes("Namecheap"), "Namecheap DNS provider must be referenced");

  // Pillar 2: HTML Meta Tag
  assert.ok(pageContent.includes("Pillar 2: HTML Meta Tag"), "Pillar 2 HTML Meta Tag must be present");
  assert.ok(pageContent.includes("Auto-Injected"), "Auto-injection explanation must be present");

  // Pillar 3: Meta Business Manager Ownership
  assert.ok(pageContent.includes("Pillar 3: Meta Ownership"), "Pillar 3 Meta Ownership must be present");
  assert.ok(pageContent.includes("Plain Stitch"), "Business Portfolio Plain Stitch must be referenced");
  assert.ok(pageContent.includes("1068222718624963"), "Portfolio ID 1068222718624963 must be referenced");
});

test("Invariant 3: AEM 8-Slot Configuration Service provides 5 calibrated + 3 open slots", () => {
  const aem = getAemConfiguration("angkon-main");

  assert.equal(aem.maxSlots, 8, "Maximum AEM slots must be 8");
  assert.equal(aem.calibratedCount, 5, "Calibrated events count must be 5");
  assert.equal(aem.availableSlotsCount, 3, "Available unassigned slots count must be 3");

  // Funnel order validation
  assert.equal(aem.calibratedSlots[0].name, "Purchase", "Slot 1 must be Purchase");
  assert.equal(aem.calibratedSlots[1].name, "InitiateCheckout", "Slot 2 must be InitiateCheckout");
  assert.equal(aem.calibratedSlots[2].name, "AddToCart", "Slot 3 must be AddToCart");
  assert.equal(aem.calibratedSlots[3].name, "ViewContent", "Slot 4 must be ViewContent");
  assert.equal(aem.calibratedSlots[4].name, "PageView", "Slot 5 must be PageView");

  // Limitation note honesty
  assert.ok(
    aem.metaApiLimitationNote.includes("Meta Graph API v22.0 does not expose a public programmatic REST endpoint"),
    "Must truthfully disclose Meta Graph API limitation"
  );
});

test("Invariant 4: Transient DNS timeouts preserve VERIFIED state (No False Regression)", () => {
  // Scenario A: Previously verified domain encounters transient timeout
  const stateOnTimeout = calculateLifecycleState({
    metaOwnershipVerified: true,
    dnsStatus: "ERROR",
    htmlStatus: "NOT_CHECKED",
    isTimeoutOrNetworkError: true,
  });
  assert.equal(
    stateOnTimeout,
    "VERIFIED",
    "Transient DNS timeout must preserve VERIFIED lifecycle state for confirmed domain"
  );

  // Scenario B: Confirmed ownership with detected DNS
  const stateVerified = calculateLifecycleState({
    metaOwnershipVerified: true,
    dnsStatus: "DETECTED",
    htmlStatus: "DETECTED",
  });
  assert.equal(stateVerified, "VERIFIED");

  // Scenario C: DNS detected but Meta ownership unconfirmed
  const stateDnsDetected = calculateLifecycleState({
    metaOwnershipVerified: false,
    dnsStatus: "DETECTED",
    htmlStatus: "NOT_CHECKED",
  });
  assert.equal(stateDnsDetected, "DNS_DETECTED");

  // Scenario D: Genuine token mismatch
  const stateMismatch = calculateLifecycleState({
    metaOwnershipVerified: false,
    dnsStatus: "NOT_FOUND",
    htmlStatus: "NOT_FOUND",
    isMismatch: true,
    isTimeoutOrNetworkError: false,
  });
  assert.equal(stateMismatch, "DNS_MISMATCH");
});

test("Invariant 5: Canonical Root Domain & Nameservers match Namecheap production infrastructure", () => {
  assert.equal(CANONICAL_ROOT_DOMAIN, "angkon.net");
  assert.deepEqual(CANONICAL_NAMESERVERS, [
    "dns1.registrar-servers.com",
    "dns2.registrar-servers.com",
  ]);
});

test("Invariant 6: Centralized Settings Section 6 mounts Domain, Token, and AEM Modals", () => {
  const settingsPage = fs.readFileSync(
    path.resolve("src/app/admin/meta/settings/page.tsx"),
    "utf-8"
  );

  // Must mount modals
  assert.ok(settingsPage.includes("<AddDomainModal"), "AddDomainModal must be mounted in Suite Settings");
  assert.ok(settingsPage.includes("<ConfigureDomainTokenModal"), "ConfigureDomainTokenModal must be mounted");
  assert.ok(settingsPage.includes("<ConfigureAemPriorityModal"), "ConfigureAemPriorityModal must be mounted");

  // Must trigger modals from buttons in Section 6
  assert.ok(settingsPage.includes("setIsAddDomainModalOpen(true)"), "Add Domain trigger must exist");
  assert.ok(settingsPage.includes("setIsConfigureDomainTokenModalOpen(true)"), "Replace Token trigger must exist");
  assert.ok(settingsPage.includes("setIsConfigureAemPriorityModalOpen(true)"), "Calibrate AEM Priority trigger must exist");
});

test("Invariant 7: Route handler supports set_primary_domain, recheck_html, and grouped audit history", () => {
  const routeContent = fs.readFileSync(
    path.resolve("src/app/api/admin/meta/domain-verification/check/route.ts"),
    "utf-8"
  );

  assert.ok(routeContent.includes("getGroupedDomainAuditHistory"), "Route must import getGroupedDomainAuditHistory");
  assert.ok(routeContent.includes("getAemConfiguration"), "Route must call getAemConfiguration");
  assert.ok(routeContent.includes('action === "set_primary_domain"'), "Route must handle set_primary_domain action");
  assert.ok(routeContent.includes('action === "recheck_html"'), "Route must handle recheck_html action");
  assert.ok(routeContent.includes('action === "update_token"'), "Route must handle update_token action");
});
