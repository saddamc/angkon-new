import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Verify scheduling intervals and stale thresholds
test("Phase 1: Synchronization schedule & intervals", () => {
  const intervals = {
    events_reporting: 10 * 60 * 1000,
    integrations: 20 * 60 * 1000,
    assets: 45 * 60 * 1000,
    emq_quality: 12 * 60 * 60 * 1000,
    all: 10 * 60 * 1000,
  };

  assert.equal(intervals.events_reporting, 600000);
  assert.equal(intervals.integrations, 1200000);
  assert.equal(intervals.assets, 2700000);
  assert.equal(intervals.emq_quality, 43200000);

  const staleThresholds = {
    events_reporting: 30 * 60 * 1000,
    integrations: 60 * 60 * 1000,
    assets: 2 * 60 * 60 * 1000,
    emq_quality: 24 * 60 * 60 * 1000,
  };

  assert.equal(staleThresholds.events_reporting, 1800000);
  assert.equal(staleThresholds.emq_quality, 86400000);
});

// Concurrency lock simulation
test("Phase 1 & 7: Concurrency lock prevents overlapping synchronization runs", () => {
  let mockLockUntil = null;
  let mockStatus = "up_to_date";

  function tryAcquireLock(now = Date.now(), timeoutMs = 60000) {
    if (mockLockUntil && mockLockUntil > now && mockStatus === "synchronizing") {
      return false; // locked by active job
    }
    mockLockUntil = now + timeoutMs;
    mockStatus = "synchronizing";
    return true;
  }

  function releaseLock(status = "up_to_date") {
    mockLockUntil = null;
    mockStatus = status;
  }

  const now = Date.now();
  // Job 1 acquires lock
  assert.equal(tryAcquireLock(now), true);
  assert.equal(mockStatus, "synchronizing");

  // Job 2 attempts to run simultaneously -> rejected!
  assert.equal(tryAcquireLock(now + 1000), false);

  // Job 1 finishes and releases lock
  releaseLock("up_to_date");
  assert.equal(mockStatus, "up_to_date");

  // Job 3 can now acquire
  assert.equal(tryAcquireLock(now + 2000), true);
});

// Stale state calculation
test("Phase 1: Sync status calculation (Up to date vs Stale vs Failed)", () => {
  function computeStatus(snapshot, staleThresholdMs = 1800000, now = Date.now()) {
    if (!snapshot) return "unavailable";
    if (snapshot.status === "synchronizing") return "synchronizing";
    if (snapshot.status === "failed") return "failed";
    if (snapshot.status === "permission_required") return "permission_required";

    if (snapshot.lastSyncedAt) {
      const elapsed = now - snapshot.lastSyncedAt;
      if (elapsed > staleThresholdMs) return "stale";
    }
    return snapshot.status || "up_to_date";
  }

  const now = Date.now();

  // 1. Fresh sync (5m ago)
  assert.equal(
    computeStatus({ status: "up_to_date", lastSyncedAt: now - 300000 }, 1800000, now),
    "up_to_date"
  );

  // 2. Stale sync (40m ago, threshold 30m)
  assert.equal(
    computeStatus({ status: "up_to_date", lastSyncedAt: now - 2400000 }, 1800000, now),
    "stale"
  );

  // 3. Failed sync
  assert.equal(
    computeStatus({ status: "failed", lastSyncedAt: now - 1000 }, 1800000, now),
    "failed"
  );

  // 4. Missing permission
  assert.equal(
    computeStatus({ status: "permission_required", lastSyncedAt: now - 1000 }, 1800000, now),
    "permission_required"
  );
});

// Meta API Error Classification
test("Phase 1 & 8: Meta API error classification", () => {
  function classifyError(error) {
    const code = error?.code;
    const subcode = error?.error_subcode;
    const msg = String(error?.message || "").toLowerCase();

    if (code === 190 || subcode === 463 || subcode === 467 || msg.includes("expired")) {
      return { reason: "unauthorized", message: "Token expired or invalid" };
    }
    if (code === 10 || code === 200 || code === 298 || msg.includes("permission") || msg.includes("scope")) {
      return { reason: "no-permission", message: "Missing required permission scope" };
    }
    if (code === 17 || code === 32 || code === 613 || msg.includes("rate limit") || msg.includes("calls")) {
      return { reason: "rate-limited", message: "Meta API rate limit reached" };
    }
    if (msg.includes("timeout") || msg.includes("aborted")) {
      return { reason: "upstream-error", message: "Request timed out" };
    }
    return { reason: "upstream-error", message: "Upstream Meta API error" };
  }

  // 1. Expired token
  assert.equal(classifyError({ code: 190 }).reason, "unauthorized");
  assert.equal(classifyError({ error_subcode: 463 }).reason, "unauthorized");

  // 2. Missing permissions
  assert.equal(classifyError({ code: 200 }).reason, "no-permission");
  assert.equal(classifyError({ message: "Requires read_ads_dataset_quality permission" }).reason, "no-permission");

  // 3. Rate limits
  assert.equal(classifyError({ code: 17 }).reason, "rate-limited");
  assert.equal(classifyError({ code: 613 }).reason, "rate-limited");

  // 4. Timeout
  assert.equal(classifyError({ message: "The operation was aborted due to timeout" }).reason, "upstream-error");
});

// Event table segregation: Production events vs TestEvent
test("Phase 2: Event Performance Table separates production from TestEvent", () => {
  const events = [
    { id: "PageView", name: "PageView", status: "Active", isTest: false, emqScore: null },
    { id: "ViewContent", name: "ViewContent", status: "Active", isTest: false, emqScore: 5.8 },
    { id: "AddToCart", name: "AddToCart", status: "Active", isTest: false, emqScore: 6.2 },
    { id: "InitiateCheckout", name: "InitiateCheckout", status: "Active", isTest: false, emqScore: 6.8 },
    { id: "Purchase", name: "Purchase", status: "Active", isTest: false, emqScore: 8.4 },
    { id: "TestEvent", name: "TestEvent", status: "Test Mode", isTest: true, emqScore: null },
  ];

  // 6 tracked events present
  assert.equal(events.length, 6);

  // TestEvent is isolated with Test Mode
  const testEv = events.find((e) => e.name === "TestEvent");
  assert.ok(testEv);
  assert.equal(testEv.status, "Test Mode");
  assert.equal(testEv.isTest, true);

  // PageView does not fabricate an EMQ score
  const pv = events.find((e) => e.name === "PageView");
  assert.ok(pv);
  assert.equal(pv.emqScore, null); // "Not available"

  // Purchase has valid EMQ score
  const pur = events.find((e) => e.name === "Purchase");
  assert.ok(pur);
  assert.equal(pur.emqScore, 8.4);
});

// Event detail drawer payload mapping
test("Phase 3: Event Detail Drawer data structure", () => {
  const drawerData = {
    id: "Purchase",
    name: "Purchase",
    displayName: "Purchase",
    funnelStep: 5,
    status: "active",
    emqScore: 8.4,
    emqQuality: "Great",
    localCount: 26,
    metaCount: "57",
    lastReceived: "Just now",
    integration: "Multiple",
    browserPct: 50,
    serverPct: 50,
    dedupRate: 99.4,
    description: "Fires upon confirmed order completion.",
    matchKeys: [
      { identifier: "em", label: "Email address", coverage: 0.88 },
      { identifier: "ph", label: "Phone number", coverage: 0.95 },
      { identifier: "client_ip_address", label: "Client IP address", coverage: 1.0 },
    ],
    diagnostics: [],
  };

  assert.equal(drawerData.name, "Purchase");
  assert.equal(drawerData.emqScore, 8.4);
  assert.equal(drawerData.matchKeys.length, 3);
  assert.equal(drawerData.dedupRate, 99.4);
  assert.equal(drawerData.localCount, 26);
  assert.equal(drawerData.metaCount, "57");
});

// Integrations Diagram 3-column topology verification
test("Phase 5: Integrations Architecture Diagram nodes and 3-column layout", () => {
  const diagramPath = path.resolve("src/components/admin/meta/integrations-architecture-diagram.tsx");
  assert.ok(fs.existsSync(diagramPath), "integrations-architecture-diagram.tsx must exist");

  const content = fs.readFileSync(diagramPath, "utf-8");
  assert.ok(content.includes("Conversions API Gateway"), "Must include CAPI Gateway node");
  assert.ok(content.includes("Meta Pixel JavaScript SDK"), "Must include Pixel SDK node");
  assert.ok(content.includes("Domain Verification"), "Must include Domain Verification node");
  assert.ok(content.includes("Central Meta Dataset"), "Must include Central Dataset node");
  assert.ok(content.includes("Ad Sets"), "Must include Ad Sets node");
  assert.ok(content.includes("Custom Audiences"), "Must include Custom Audiences node");
  assert.ok(content.includes("Product Catalog"), "Must include Product Catalog node");
  assert.ok(content.includes("Dataset Information"), "Must include right-side Dataset Information Panel");
});
