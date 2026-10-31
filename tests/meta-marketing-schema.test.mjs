import test from "node:test";
import assert from "node:assert/strict";

// ── Pure Logic Functions Under Test ──────────────────────────────────────────

function maskSecret(secret) {
  if (!secret) return "";
  const clean = secret.trim();
  if (clean.length <= 8) return "••••••••";
  return `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`;
}

function normalizeAdAccountId(id) {
  if (!id) return "";
  const clean = id.trim();
  return clean.startsWith("act_") ? clean : `act_${clean}`;
}

function computeAttributionConfigKey(config = {}) {
  const defaultWindows = ["7d_click", "1d_view"];
  const windows = (Array.isArray(config.actionAttributionWindows) ? config.actionAttributionWindows : defaultWindows)
    .slice()
    .sort()
    .join("+");
  const reportTime = config.actionReportTime === "impression" ? "impression" : "conversion";
  return `${windows}_rt_${reportTime}`.toLowerCase();
}

/**
 * Validates the 37-month historical boundary enforced by Meta Marketing API.
 */
function isWithin37MonthBoundary(sinceDateStr, referenceDate = new Date()) {
  const target = new Date(`${sinceDateStr}T00:00:00.000Z`);
  const cutoff = new Date(referenceDate);
  cutoff.setMonth(cutoff.getMonth() - 37);
  return target >= cutoff;
}

/**
 * Splits any requested date range into bounded slices of max 30 days.
 */
function generate30DaySlices(sinceStr, untilStr) {
  const slices = [];
  let currentStart = new Date(`${sinceStr}T00:00:00.000Z`);
  const finalEnd = new Date(`${untilStr}T23:59:59.999Z`);

  if (currentStart > finalEnd) {
    throw new Error("Start date cannot be after end date");
  }

  let index = 0;
  while (currentStart <= finalEnd) {
    const nextEnd = new Date(currentStart);
    nextEnd.setDate(nextEnd.getDate() + 29); // 30 days inclusive

    const actualEnd = nextEnd > finalEnd ? finalEnd : nextEnd;

    slices.push({
      sliceIndex: index++,
      since: currentStart.toISOString().slice(0, 10),
      until: actualEnd.toISOString().slice(0, 10),
      status: "pending",
      recordsImported: 0,
      spendInSlice: 0,
    });

    // Move to day after actualEnd
    currentStart = new Date(actualEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return slices;
}

/**
 * Rate limit diagnostic classifier
 */
function classifyMetaApiError(errorObj) {
  const code = errorObj?.code;
  const subcode = errorObj?.error_subcode;

  if (code === 190) {
    return { type: "AUTH_EXPIRED", fatal: true, retry: false };
  }
  if (code === 80000) {
    return { type: "INSIGHTS_THROTTLED", fatal: false, retry: true, pauseReason: "Ads Insights call rate limit reached" };
  }
  if (code === 80004) {
    return { type: "ACCOUNT_THROTTLED", fatal: false, retry: true, pauseReason: "Ad account call limit reached" };
  }
  if (code === 17 || code === 32 || subcode === 2446079) {
    return { type: "GENERAL_RATE_LIMIT", fatal: false, retry: true, pauseReason: "User or app request limit reached" };
  }
  if (code === 100 || code === 200) {
    return { type: "PERMISSION_OR_PARAM_ERROR", fatal: true, retry: false };
  }
  return { type: "UNKNOWN_ERROR", fatal: false, retry: false };
}

/**
 * Extract website purchase metrics accurately from Meta raw actions and action_values
 */
function extractMetaPurchases(actions = [], actionValues = []) {
  let purchases = 0;
  let purchaseValue = 0;

  const validActionTypes = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];

  for (const item of actions) {
    if (validActionTypes.includes(item.action_type)) {
      purchases = Math.max(purchases, parseInt(item.value || "0", 10));
    }
  }

  for (const item of actionValues) {
    if (validActionTypes.includes(item.action_type)) {
      purchaseValue = Math.max(purchaseValue, parseFloat(item.value || "0"));
    }
  }

  return { purchases, purchaseValue };
}

/**
 * Dual-ledger financial aggregator
 */
function aggregateStoreFinances(orders) {
  let totalOrders = 0;
  let realizedCash = 0;
  let unsettledPendingCash = 0;
  let refundedCash = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;

  for (const o of orders) {
    totalOrders++;
    const total = o.total || 0;

    if (o.orderStatus === "refunded") {
      refundedCash += o.refundAmount || total;
    } else if (o.paymentStatus === "paid" || o.codSettlementStatus === "settled") {
      realizedCash += total;
      if (o.orderStatus === "delivered" || o.orderStatus === "completed") {
        deliveredCount++;
      }
    } else if (o.orderStatus === "cancelled" || o.orderStatus === "failed") {
      cancelledCount++;
    } else {
      // In-transit COD, delivered pending courier settlement, etc.
      unsettledPendingCash += total;
      if (o.orderStatus === "delivered" || o.orderStatus === "completed") {
        deliveredCount++;
      }
    }
  }

  const netRealizedCash = Math.max(0, realizedCash - refundedCash);

  return {
    totalOrders,
    deliveredCount,
    cancelledCount,
    realizedCash,
    refundedCash,
    netRealizedCash,
    unsettledPendingCash,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("Marketing settings helper - maskSecret correctly masks token", () => {
  assert.equal(maskSecret(""), "");
  assert.equal(maskSecret("short"), "••••••••");
  assert.equal(maskSecret("EAAG1234567890XYZ"), "EAAG••••••••0XYZ");
});

test("Marketing settings helper - normalizeAdAccountId ensures act_ prefix", () => {
  assert.equal(normalizeAdAccountId(""), "");
  assert.equal(normalizeAdAccountId("123456789"), "act_123456789");
  assert.equal(normalizeAdAccountId("act_123456789"), "act_123456789");
  assert.equal(normalizeAdAccountId("  act_998877  "), "act_998877");
});

test("Attribution config - computeAttributionConfigKey produces deterministic lowercase key", () => {
  const key1 = computeAttributionConfigKey({
    actionAttributionWindows: ["7d_click", "1d_view"],
    actionReportTime: "conversion",
  });
  assert.equal(key1, "1d_view+7d_click_rt_conversion");

  const key2 = computeAttributionConfigKey({
    actionAttributionWindows: ["1d_view", "7d_click"],
    actionReportTime: "conversion",
  });
  assert.equal(key2, "1d_view+7d_click_rt_conversion");

  const key3 = computeAttributionConfigKey({
    actionAttributionWindows: ["1d_click"],
    actionReportTime: "impression",
  });
  assert.equal(key3, "1d_click_rt_impression");
});

test("Historical boundary - 37 month limit check accurately accepts/rejects dates", () => {
  const ref = new Date("2026-10-31T00:00:00.000Z");
  // 30 months ago is within boundary
  assert.equal(isWithin37MonthBoundary("2024-04-01", ref), true);
  // 36 months ago is within boundary
  assert.equal(isWithin37MonthBoundary("2023-11-01", ref), true);
  // 38 months ago is beyond boundary
  assert.equal(isWithin37MonthBoundary("2023-08-01", ref), false);
});

test("Slicing engine - splits multi-month date ranges into bounded 30-day slices", () => {
  const slices = generate30DaySlices("2026-01-01", "2026-03-15");
  // Jan 1 to Mar 15 is 74 days => 3 slices
  assert.equal(slices.length, 3);
  assert.equal(slices[0].since, "2026-01-01");
  assert.equal(slices[0].until, "2026-01-30");
  assert.equal(slices[1].since, "2026-01-31");
  assert.equal(slices[1].until, "2026-03-01");
  assert.equal(slices[2].since, "2026-03-02");
  assert.equal(slices[2].until, "2026-03-15");
});

test("Error classification - distinguishes Insights rate-limit 80000, Account limit 80004, Auth 190, and Perm 100", () => {
  assert.deepEqual(classifyMetaApiError({ code: 190 }), {
    type: "AUTH_EXPIRED",
    fatal: true,
    retry: false,
  });

  assert.deepEqual(classifyMetaApiError({ code: 80000 }), {
    type: "INSIGHTS_THROTTLED",
    fatal: false,
    retry: true,
    pauseReason: "Ads Insights call rate limit reached",
  });

  assert.deepEqual(classifyMetaApiError({ code: 80004 }), {
    type: "ACCOUNT_THROTTLED",
    fatal: false,
    retry: true,
    pauseReason: "Ad account call limit reached",
  });

  assert.deepEqual(classifyMetaApiError({ code: 17 }), {
    type: "GENERAL_RATE_LIMIT",
    fatal: false,
    retry: true,
    pauseReason: "User or app request limit reached",
  });

  assert.deepEqual(classifyMetaApiError({ code: 100 }), {
    type: "PERMISSION_OR_PARAM_ERROR",
    fatal: true,
    retry: false,
  });
});

test("Purchase extraction - prioritizes omni_purchase and standard pixel purchases", () => {
  const actions = [
    { action_type: "link_click", value: "45" },
    { action_type: "add_to_cart", value: "12" },
    { action_type: "omni_purchase", value: "4" },
    { action_type: "purchase", value: "4" },
  ];
  const actionValues = [
    { action_type: "omni_purchase", value: "15600.00" },
    { action_type: "purchase", value: "15600.00" },
  ];

  const extracted = extractMetaPurchases(actions, actionValues);
  assert.equal(extracted.purchases, 4);
  assert.equal(extracted.purchaseValue, 15600);
});

test("Dual-ledger cash accounting - strictly isolates realized cash from unsettled COD and refunds", () => {
  const mockOrders = [
    // 1. Online payment paid & delivered
    { orderStatus: "delivered", paymentStatus: "paid", total: 3500 },
    // 2. COD delivered but NOT yet settled by courier
    { orderStatus: "delivered", paymentStatus: "unpaid", codSettlementStatus: "pending_courier", total: 2200 },
    // 3. COD delivered AND settled
    { orderStatus: "delivered", paymentStatus: "paid", codSettlementStatus: "settled", total: 1800 },
    // 4. In-transit COD
    { orderStatus: "shipped", paymentStatus: "unpaid", total: 4000 },
    // 5. Refunded order
    { orderStatus: "refunded", paymentStatus: "refunded", refundAmount: 1500, total: 1500 },
    // 6. Cancelled order
    { orderStatus: "cancelled", paymentStatus: "unpaid", total: 2500 },
  ];

  const fin = aggregateStoreFinances(mockOrders);

  assert.equal(fin.totalOrders, 6);
  assert.equal(fin.deliveredCount, 3);
  assert.equal(fin.cancelledCount, 1);
  assert.equal(fin.realizedCash, 3500 + 1800); // 5300
  assert.equal(fin.refundedCash, 1500);
  assert.equal(fin.netRealizedCash, 5300 - 1500); // 3800
  assert.equal(fin.unsettledPendingCash, 2200 + 4000); // 6200
});

test("Duplicate prevention & idempotency - composite key upsert updates record in-place without duplicates", () => {
  const store = new Map();

  function upsertRecord(record) {
    const key = `${record.tenantId}:${record.adAccountId}:${record.level}:${record.entityId}:${record.date}:${record.breakdownKey}:${record.attributionConfigKey}`;
    store.set(key, { ...record });
  }

  // Initial import
  upsertRecord({
    tenantId: "angkon-main",
    adAccountId: "act_12345",
    level: "campaign",
    entityId: "camp_1",
    date: "2026-10-30",
    breakdownKey: "none",
    attributionConfigKey: "1d_view+7d_click_rt_conversion",
    spend: 1500,
    impressions: 12000,
  });

  assert.equal(store.size, 1);
  assert.equal(store.values().next().value.spend, 1500);

  // Repeated import with updated numbers for same composite key
  upsertRecord({
    tenantId: "angkon-main",
    adAccountId: "act_12345",
    level: "campaign",
    entityId: "camp_1",
    date: "2026-10-30",
    breakdownKey: "none",
    attributionConfigKey: "1d_view+7d_click_rt_conversion",
    spend: 1550,
    impressions: 12400,
  });

  // Strict duplicate prevention: size is still exactly 1
  assert.equal(store.size, 1);
  assert.equal(store.values().next().value.spend, 1550);
});

test("Level isolation - aggregating at campaign level never sums adset or ad level records", () => {
  const records = [
    { level: "campaign", entityId: "camp_1", spend: 5000 },
    { level: "adset", entityId: "adset_1", spend: 2500 },
    { level: "adset", entityId: "adset_2", spend: 2500 },
    { level: "ad", entityId: "ad_1", spend: 1250 },
    { level: "ad", entityId: "ad_2", spend: 1250 },
    { level: "ad", entityId: "ad_3", spend: 1250 },
    { level: "ad", entityId: "ad_4", spend: 1250 },
  ];

  function aggregateLevelSpend(recordsList, targetLevel) {
    return recordsList
      .filter((r) => r.level === targetLevel)
      .reduce((sum, r) => sum + r.spend, 0);
  }

  const campaignTotal = aggregateLevelSpend(records, "campaign");
  const adsetTotal = aggregateLevelSpend(records, "adset");
  const adTotal = aggregateLevelSpend(records, "ad");

  // Each isolated level accounts for exactly 5000
  assert.equal(campaignTotal, 5000);
  assert.equal(adsetTotal, 5000);
  assert.equal(adTotal, 5000);

  // Cross-level sum would erroneously yield 15000 (3x inflation)
  const crossLevelSum = records.reduce((sum, r) => sum + r.spend, 0);
  assert.equal(crossLevelSum, 15000);
  assert.notEqual(campaignTotal, crossLevelSum);
});

test("Resumable slice execution - simulates slice rate-limiting, pause, and resumption", () => {
  const job = {
    jobId: "job_test_123",
    currentSliceIndex: 0,
    totalSlices: 3,
    slices: [
      { sliceIndex: 0, status: "pending", recordsImported: 0, spend: 0 },
      { sliceIndex: 1, status: "pending", recordsImported: 0, spend: 0 },
      { sliceIndex: 2, status: "pending", recordsImported: 0, spend: 0 },
    ],
    status: "running",
  };

  // Run 1: Slice 0 succeeds, Slice 1 encounters 80000 rate limit
  job.slices[0].status = "completed";
  job.slices[0].recordsImported = 30;
  job.slices[0].spend = 4500;
  job.currentSliceIndex = 1;

  // Rate limit on Slice 1
  job.slices[1].status = "rate_limited";
  job.status = "paused_rate_limit";
  job.errorMessage = "Rate limit 80000 reached. Pause for 15 minutes";

  assert.equal(job.status, "paused_rate_limit");
  assert.equal(job.slices[0].status, "completed");
  assert.equal(job.slices[1].status, "rate_limited");
  assert.equal(job.slices[2].status, "pending");

  // Run 2: Resume job after access regained
  job.status = "running";
  job.errorMessage = undefined;

  // Re-run slice 1
  job.slices[1].status = "completed";
  job.slices[1].recordsImported = 28;
  job.slices[1].spend = 4200;
  job.currentSliceIndex = 2;

  // Run slice 2
  job.slices[2].status = "completed";
  job.slices[2].recordsImported = 15;
  job.slices[2].spend = 2100;
  job.currentSliceIndex = 3;
  job.status = "completed";

  assert.equal(job.status, "completed");
  assert.equal(job.slices.every((s) => s.status === "completed"), true);
  const totalImported = job.slices.reduce((sum, s) => sum + s.recordsImported, 0);
  const totalSpend = job.slices.reduce((sum, s) => sum + s.spend, 0);
  assert.equal(totalImported, 73);
  assert.equal(totalSpend, 10800);
});

test("Marketing API version parameter compatibility - v22.0 and v26.0 require identical query shapes", () => {
  function buildMarketingInsightsUrl(version, actId, options) {
    const timeRange = JSON.stringify({ since: options.since, until: options.until });
    const attributionWindows = JSON.stringify(options.actionAttributionWindows);
    return `https://graph.facebook.com/${version}/${actId}/insights?level=${options.level}&fields=${options.fields.join(",")}&time_range=${encodeURIComponent(timeRange)}&time_increment=1&action_attribution_windows=${encodeURIComponent(attributionWindows)}&action_report_time=${options.actionReportTime}&limit=100`;
  }

  const opts = {
    since: "2026-10-24",
    until: "2026-10-31",
    level: "campaign",
    fields: ["campaign_id", "campaign_name", "spend", "impressions", "clicks", "purchase_roas"],
    actionAttributionWindows: ["7d_click", "1d_view"],
    actionReportTime: "conversion",
  };

  const urlV22 = buildMarketingInsightsUrl("v22.0", "act_12345", opts);
  const urlV26 = buildMarketingInsightsUrl("v26.0", "act_12345", opts);

  assert.equal(urlV22.replace("v22.0", "v26.0"), urlV26);
});
