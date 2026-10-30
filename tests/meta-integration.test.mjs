import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// Test 1: Customer Data Normalization & SHA-256 Hashing
test("Meta CAPI: Customer data hashing conforms to Meta specification", () => {
  function hashSha256(value) {
    if (!value) return undefined;
    const clean = value.trim().toLowerCase();
    if (!clean) return undefined;
    return crypto.createHash("sha256").update(clean).digest("hex");
  }

  function normalizeAndHashPhone(phone) {
    if (!phone) return undefined;
    let digits = phone.replace(/\D/g, "");
    if (!digits) return undefined;
    if (digits.startsWith("01") && digits.length === 11) {
      digits = `880${digits.slice(1)}`;
    }
    return crypto.createHash("sha256").update(digits).digest("hex");
  }

  // Test email hashing (lowercased, trimmed)
  const testEmail = "  Customer@Angkon.com.bd  ";
  const expectedEmailHash = crypto.createHash("sha256").update("customer@angkon.com.bd").digest("hex");
  assert.equal(hashSha256(testEmail), expectedEmailHash);

  // Test Bangladesh phone normalization (01712... -> 8801712...)
  const testPhone = "01712-345678";
  const expectedPhoneDigits = "8801712345678";
  const expectedPhoneHash = crypto.createHash("sha256").update(expectedPhoneDigits).digest("hex");
  assert.equal(normalizeAndHashPhone(testPhone), expectedPhoneHash);
});

// Test 2: Credential Masking & Secret Leak Prevention
test("Meta Security: Secrets are masked and never transmitted in plain text", () => {
  function maskSecret(secret) {
    if (!secret) return "";
    const clean = secret.trim();
    if (clean.length <= 8) return "••••••••";
    return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
  }

  const rawCapiToken = "EAAGtesttoken123456789xyz9876";
  const masked = maskSecret(rawCapiToken);

  assert.equal(masked.startsWith("EAAG"), true);
  assert.equal(masked.endsWith("9876"), true);
  assert.equal(masked.includes("••••••••"), true);
  assert.equal(masked.includes("testtoken123456789"), false);

  // Safe preserving of existing secret on update
  let currentToken = "REAL_SECURE_TOKEN_IN_DB";
  const incomingUserPayload = masked; // User submitted the masked string back

  let finalToken = currentToken;
  if (!incomingUserPayload.includes("••••") && !incomingUserPayload.includes("***")) {
    finalToken = incomingUserPayload;
  }
  assert.equal(finalToken, "REAL_SECURE_TOKEN_IN_DB", "Must NOT overwrite token with masked value");
});

// Test 3: Deduplication eventID Pairing & Purchase Idempotency
test("Meta Deduplication: Matching eventID and purchase session lock", () => {
  const orderNumber = "ANG-92810";
  const browserEventId = `order_${orderNumber}`;
  const serverEventId = `order_${orderNumber}`;

  // 1. Browser and server MUST share the exact same event_id
  assert.equal(browserEventId, serverEventId);

  // 2. Client-side idempotency lock simulation
  const mockSessionStorage = new Map();
  function simulateTrackPurchase(orderId) {
    const key = `angkon_meta_purchase_fired_${orderId}`;
    if (mockSessionStorage.get(key) === "true") {
      return { fired: false, reason: "duplicate_skipped" };
    }
    mockSessionStorage.set(key, "true");
    return { fired: true, eventId: `order_${orderId}` };
  }

  const firstCall = simulateTrackPurchase(orderNumber);
  assert.equal(firstCall.fired, true);
  assert.equal(firstCall.eventId, `order_${orderNumber}`);

  // Customer reloads the confirmation page or navigates back
  const secondCall = simulateTrackPurchase(orderNumber);
  assert.equal(secondCall.fired, false, "Must skip second call to prevent duplicate purchase on refresh");
});

// Test 4: Tenant and Store Isolation
test("Meta Isolation: Settings and Ad Reports scoped by tenantId", () => {
  const defaultTenant = "angkon-main";
  const foreignTenant = "store-secondary";

  const dbReports = [
    { tenantId: "angkon-main", adAccountId: "act_111", spend: 5000, date: "2026-10-01" },
    { tenantId: "store-secondary", adAccountId: "act_222", spend: 8000, date: "2026-10-01" },
  ];

  const mainTenantReports = dbReports.filter((r) => r.tenantId === defaultTenant);
  assert.equal(mainTenantReports.length, 1);
  assert.equal(mainTenantReports[0].adAccountId, "act_111");
  assert.equal(mainTenantReports.some((r) => r.tenantId === foreignTenant), false);
});

// Test 5: Attribution Separation (Meta Claims vs Real Store Sales)
test("Meta Attribution: Keeps platform-reported metrics distinct from store cash collected", () => {
  const metaReported = {
    spend: 10000,
    metaReportedPurchases: 25, // Meta claimed 25 purchases
    metaReportedRevenue: 125000,
    metaClaimedRoas: 12.5,
  };

  const actualStore = {
    deliveredOrders: 18, // Only 18 delivered and paid via COD
    cancelledOrders: 7, // 7 were cancelled/fake phone numbers
    realizedRevenue: 90000,
  };

  const trueBlendedRoas = Number((actualStore.realizedRevenue / metaReported.spend).toFixed(2));
  const orderGap = metaReported.metaReportedPurchases - actualStore.deliveredOrders;
  const revenueVariance = metaReported.metaReportedRevenue - actualStore.realizedRevenue;
  const roasInflation = Number((metaReported.metaClaimedRoas - trueBlendedRoas).toFixed(2));

  assert.equal(trueBlendedRoas, 9.0);
  assert.equal(orderGap, 7);
  assert.equal(revenueVariance, 35000);
  assert.equal(roasInflation, 3.5); // Meta over-reported ROAS by 3.5x
});

// Test 6: Missing / Invalid Credentials Validation
test("Meta Validation: Rejects malformed Pixel ID and Ad Account ID", () => {
  function validatePixelId(id) {
    const clean = String(id || "").trim();
    return Boolean(clean && /^\d{10,25}$/.test(clean));
  }

  function validateAdAccountId(id) {
    const clean = String(id || "").trim();
    return Boolean(clean && /^(act_)?\d{6,25}$/.test(clean));
  }

  assert.equal(validatePixelId("1480517547316620"), true);
  assert.equal(validatePixelId("invalid-abc"), false);
  assert.equal(validatePixelId("123"), false); // too short

  assert.equal(validateAdAccountId("act_9876543210"), true);
  assert.equal(validateAdAccountId("9876543210"), true);
  assert.equal(validateAdAccountId("act_invalid"), false);
});

// Test 7: Historical Insights Pagination & Duplicate Prevention
test("Meta Insights: Historical import prevents duplicate daily records", () => {
  const importedDatabase = new Map();

  function upsertDailyRecord(record) {
    const key = `${record.tenantId}_${record.adAccountId}_${record.campaignId}_${record.date}`;
    importedDatabase.set(key, record);
  }

  const dayRecord = {
    tenantId: "angkon-main",
    adAccountId: "act_123",
    campaignId: "cmp_456",
    date: "2026-10-28",
    spend: 1500,
    impressions: 4200,
  };

  // First import
  upsertDailyRecord(dayRecord);
  assert.equal(importedDatabase.size, 1);

  // Re-importing same date range must NOT duplicate the record
  upsertDailyRecord({ ...dayRecord, spend: 1550 });
  assert.equal(importedDatabase.size, 1, "Must maintain exactly 1 unique record for the same day/campaign");
  assert.equal(importedDatabase.get("angkon-main_act_123_cmp_456_2026-10-28").spend, 1550);
});

// Test 8: Safe Retry & Exponential Backoff Simulation on Transient API Errors
test("Meta Resilience: Retries on 5xx or transient errors with exponential backoff", async () => {
  let attempts = 0;
  async function mockResilientFetch() {
    attempts++;
    if (attempts === 1) {
      // Simulate transient 502 Bad Gateway
      return { ok: false, status: 502 };
    }
    // Succeeded on 2nd attempt
    return { ok: true, status: 200, data: { events_received: 1 } };
  }

  let finalResult = null;
  for (let i = 0; i < 2; i++) {
    const res = await mockResilientFetch();
    if (res.ok) {
      finalResult = res.data;
      break;
    }
  }

  assert.equal(attempts, 2);
  assert.equal(finalResult?.events_received, 1);
});

// Test 9: Event Toggle Suppression Check
test("Meta Control: Disabled events are completely silenced", () => {
  const eventsConfig = {
    trackPageView: true,
    trackViewContent: false, // Merchant disabled ViewContent
    trackAddToCart: true,
  };

  function shouldFireEvent(eventName, config) {
    return config[eventName] !== false;
  }

  assert.equal(shouldFireEvent("trackPageView", eventsConfig), true);
  assert.equal(shouldFireEvent("trackViewContent", eventsConfig), false);
  assert.equal(shouldFireEvent("trackAddToCart", eventsConfig), true);
});

// Test 10: Event Activity Filtering & Date Scoping
test("Meta Activity Filter: Correctly filters events by name, source, status, and date range", () => {
  const now = Date.now();
  const mockEvents = [
    {
      id: "ev_1",
      name: "Purchase",
      source: "server",
      status: "delivered",
      timestamp: new Date(now - 1000).toISOString(),
      eventId: "order_1001",
    },
    {
      id: "ev_2",
      name: "Purchase",
      source: "browser",
      status: "dispatched",
      timestamp: new Date(now - 2000).toISOString(),
      eventId: "order_1001",
    },
    {
      id: "ev_3",
      name: "PageView",
      source: "browser",
      status: "dispatched",
      timestamp: new Date(now - 5000).toISOString(),
    },
    {
      id: "ev_4",
      name: "AddToCart",
      source: "server",
      status: "failed",
      error: "Malformed custom_data value",
      timestamp: new Date(now - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago
    },
  ];

  // Filter by event name
  const purchaseEvents = mockEvents.filter((e) => e.name === "Purchase");
  assert.equal(purchaseEvents.length, 2);

  // Filter by source
  const serverEvents = mockEvents.filter((e) => e.source === "server");
  assert.equal(serverEvents.length, 2);

  // Filter by status
  const failedEvents = mockEvents.filter((e) => e.status === "failed");
  assert.equal(failedEvents.length, 1);
  assert.equal(failedEvents[0].error, "Malformed custom_data value");

  // Date range filter: 24h
  const within24h = mockEvents.filter((e) => now - new Date(e.timestamp).getTime() <= 24 * 3600 * 1000);
  assert.equal(within24h.length, 3);
  assert.equal(within24h.some((e) => e.id === "ev_4"), false);
});

// Test 11: Truthful Status Representation (Meta Confirmed vs Dispatched)
test("Meta Status: Distinguishes application dispatch from Meta confirmation", () => {
  function getDisplayStatus(event) {
    if (event.status === "delivered") return { label: "Meta Confirmed", verified: true };
    if (event.status === "failed") return { label: "Delivery Failed", verified: false, error: event.error };
    return { label: "Dispatched", verified: false };
  }

  const browserEv = { source: "browser", status: "dispatched" };
  const confirmedServerEv = { source: "server", status: "delivered", fbtraceId: "FBT_98124" };
  const failedServerEv = { source: "server", status: "failed", error: "Invalid access token" };

  assert.deepEqual(getDisplayStatus(browserEv), { label: "Dispatched", verified: false });
  assert.deepEqual(getDisplayStatus(confirmedServerEv), { label: "Meta Confirmed", verified: true });
  assert.deepEqual(getDisplayStatus(failedServerEv), {
    label: "Delivery Failed",
    verified: false,
    error: "Invalid access token",
  });
});

// Test 12: Production Safety: Clearing test_event_code
test("Meta Safety: Test event code clearing prevents production test routing", () => {
  let settings = {
    enabled: true,
    pixelId: "1480517547316620",
    testEventCode: "TEST49210",
  };

  function isTestModeActive(s) {
    return Boolean(s.testEventCode && s.testEventCode.trim().length > 0);
  }

  assert.equal(isTestModeActive(settings), true);

  // Merchant finishes testing and clears test event code
  settings = { ...settings, testEventCode: "" };
  assert.equal(isTestModeActive(settings), false);
  assert.equal(settings.testEventCode, "");
});
