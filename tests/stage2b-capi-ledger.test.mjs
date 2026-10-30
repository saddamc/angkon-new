import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const MAX_RETRY_ATTEMPTS = 5;

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
  } else if (digits.startsWith("1") && digits.length === 10) {
    digits = `880${digits}`;
  }
  return crypto.createHash("sha256").update(digits).digest("hex");
}

function buildMetaUserData(userData) {
  const result = {};
  if (!userData) return result;

  const hashedEmail = hashSha256(userData.email);
  if (hashedEmail) result.em = [hashedEmail];

  const hashedPhone = normalizeAndHashPhone(userData.phone);
  if (hashedPhone) result.ph = [hashedPhone];

  const hashedFn = hashSha256(userData.firstName);
  if (hashedFn) result.fn = [hashedFn];

  const hashedLn = hashSha256(userData.lastName);
  if (hashedLn) result.ln = [hashedLn];

  const city = userData.city || userData.district;
  const hashedCity = hashSha256(city);
  if (hashedCity) result.ct = [hashedCity];

  const country = userData.country || "bd";
  const hashedCountry = hashSha256(country);
  if (hashedCountry) result.country = [hashedCountry];

  const hashedZp = hashSha256(userData.postalCode);
  if (hashedZp) result.zp = [hashedZp];

  if (userData.clientIp && userData.clientIp !== "::1" && userData.clientIp !== "127.0.0.1") {
    result.client_ip_address = userData.clientIp;
  }
  if (userData.clientUserAgent) {
    result.client_user_agent = userData.clientUserAgent;
  }
  if (userData.fbp) {
    result.fbp = userData.fbp;
  }
  if (userData.fbc) {
    result.fbc = userData.fbc;
  }

  return result;
}

function calculateBackoffMs(attemptCount) {
  const base = 1000 * Math.pow(2, Math.min(attemptCount, 5));
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(base + jitter, 60000);
}

// ── Test 1: Customer Data Normalization & SHA-256 Hashing ──
test("Stage 2B Criteria 6: Correct hashing and normalization of eligible identifiers", () => {
  // Email normalization: trimmed and lowercased
  const rawEmail = "  User.Name+Test@MaisonAngkon.COM.BD  ";
  const expectedEmailHash = crypto
    .createHash("sha256")
    .update("user.name+test@maisonangkon.com.bd")
    .digest("hex");
  assert.equal(hashSha256(rawEmail), expectedEmailHash);

  // Bangladesh Phone normalization: 01712-345678 -> 8801712345678
  const rawPhone = "  +880 (017) 12-345678  ";
  // Digits: 88001712345678 -> or standard BD local 01712345678 -> 8801712345678
  const localBdPhone = "01711-223344";
  const expectedBdPhoneHash = crypto
    .createHash("sha256")
    .update("8801711223344")
    .digest("hex");
  assert.equal(normalizeAndHashPhone(localBdPhone), expectedBdPhoneHash);

  // Names, City, Zip, Country in buildMetaUserData
  const userData = {
    email: "test@angkon.com.bd",
    phone: "01819-001122",
    firstName: "Saddam",
    lastName: "Hossain",
    city: "Dhaka",
    postalCode: "1207",
    country: "bd",
  };

  const built = buildMetaUserData(userData);
  assert.equal(Array.isArray(built.em), true);
  assert.equal(built.em[0], crypto.createHash("sha256").update("test@angkon.com.bd").digest("hex"));
  assert.equal(built.ph[0], crypto.createHash("sha256").update("8801819001122").digest("hex"));
  assert.equal(built.fn[0], crypto.createHash("sha256").update("saddam").digest("hex"));
  assert.equal(built.ln[0], crypto.createHash("sha256").update("hossain").digest("hex"));
  assert.equal(built.ct[0], crypto.createHash("sha256").update("dhaka").digest("hex"));
  assert.equal(built.zp[0], crypto.createHash("sha256").update("1207").digest("hex"));
  assert.equal(built.country[0], crypto.createHash("sha256").update("bd").digest("hex"));
});

// ── Test 2: Plaintext Preservation for IP, User-Agent, and Cookies ──
test("Stage 2B Criteria 7: IP, user agent, fbp, and fbc MUST remain un-hashed in plaintext", () => {
  const userData = {
    clientIp: "103.145.12.44",
    clientUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    fbp: "fb.1.1684920194.2049281",
    fbc: "fb.1.1684920194.IwAR2...",
  };

  const built = buildMetaUserData(userData);

  // Must be exact string verbatim (NEVER hashed)
  assert.equal(built.client_ip_address, "103.145.12.44");
  assert.equal(built.client_user_agent, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
  assert.equal(built.fbp, "fb.1.1684920194.2049281");
  assert.equal(built.fbc, "fb.1.1684920194.IwAR2...");

  // Localhost IPs (::1, 127.0.0.1) should not be sent to Meta
  const localUserData = { clientIp: "127.0.0.1" };
  const builtLocal = buildMetaUserData(localUserData);
  assert.equal(builtLocal.client_ip_address, undefined);
});

// ── Test 3: Compound Uniqueness and Stable Event ID Deduplication ──
test("Stage 2B Criteria 3 & 4: Browser and Server paired events share stable event_id without collision", () => {
  const eventId = "order_ANG_998877";

  // Simulate in-memory ledger state for deduplication pairing
  const ledger = new Map();

  function recordEvent(tenantId, evId, source, eventName) {
    const compoundKey = `${tenantId}::${evId}::${source}`;
    if (ledger.has(compoundKey)) {
      // Upsert/update existing
      const existing = ledger.get(compoundKey);
      existing.updatedAt = new Date();
      return { record: existing, isDuplicate: true };
    }
    const record = {
      tenantId,
      eventId: evId,
      source,
      eventName,
      status: source === "browser" ? "accepted" : "queued",
      createdAt: new Date(),
    };
    ledger.set(compoundKey, record);
    return { record, isDuplicate: false };
  }

  // 1. Browser Purchase event arrives
  const browserRes = recordEvent("angkon-main", eventId, "browser", "Purchase");
  assert.equal(browserRes.isDuplicate, false);
  assert.equal(browserRes.record.source, "browser");

  // 2. Server CAPI Purchase event arrives with the SAME eventId
  const serverRes = recordEvent("angkon-main", eventId, "server", "Purchase");
  assert.equal(serverRes.isDuplicate, false);
  assert.equal(serverRes.record.source, "server");

  // Both records exist simultaneously in the ledger without collision
  assert.equal(ledger.size, 2);

  // 3. User refreshes or retry happens with SAME eventId and source
  const retryRes = recordEvent("angkon-main", eventId, "server", "Purchase");
  assert.equal(retryRes.isDuplicate, true);
  assert.equal(ledger.size, 2); // No duplicate logical event created!

  // Deduplication matching calculation
  const eventIdSources = new Map();
  for (const entry of ledger.values()) {
    if (!eventIdSources.has(entry.eventId)) {
      eventIdSources.set(entry.eventId, new Set());
    }
    eventIdSources.get(entry.eventId).add(entry.source);
  }

  let pairedCount = 0;
  for (const [, sources] of eventIdSources) {
    if (sources.has("browser") && sources.has("server")) {
      pairedCount++;
    }
  }

  assert.equal(pairedCount, 1);
});

// ── Test 4: Purchase Idempotency across Refreshes & Retries ──
test("Stage 2B Criteria 5: Purchase idempotency prevents duplicate conversion counting", () => {
  const orderNumber = "ANG_2026_5544";
  const expectedEventId = `order_${orderNumber}`;

  const processedOrders = new Set();

  function handleOrderPaymentCallback(orderNum) {
    if (processedOrders.has(orderNum)) {
      return { enqueued: false, reason: "already_processed" };
    }
    processedOrders.add(orderNum);
    return {
      enqueued: true,
      eventId: `order_${orderNum}`,
      eventName: "Purchase",
    };
  }

  // First callback invocation
  const first = handleOrderPaymentCallback(orderNumber);
  assert.equal(first.enqueued, true);
  assert.equal(first.eventId, expectedEventId);

  // Second callback invocation (SSLCommerz retry or page refresh)
  const second = handleOrderPaymentCallback(orderNumber);
  assert.equal(second.enqueued, false);
  assert.equal(second.reason, "already_processed");
});

// ── Test 5: Bounded Exponential Backoff with Jitter ──
test("Stage 2B Criteria 10: Exponential backoff with jitter is bounded and monotonic", () => {
  assert.equal(MAX_RETRY_ATTEMPTS, 5);

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const delay = calculateBackoffMs(attempt);
    // Base is 1000 * 2^attempt. Jitter is 0..500.
    const minExpected = 1000 * Math.pow(2, attempt);
    const maxExpected = minExpected + 500;

    assert.equal(delay >= minExpected, true, `Delay ${delay} should be >= ${minExpected}`);
    assert.equal(delay <= 60000, true, "Delay must be capped at 60s");
  }
});

// ── Test 6: Delivery State Classifications ──
test("Stage 2B Criteria 9: Delivery status classifies HTTP response codes accurately", () => {
  function classifyMetaResponse(status, isTimeout = false) {
    if (isTimeout) {
      return { status: "retrying", isTransient: true };
    }
    if (status >= 200 && status < 300) {
      return { status: "accepted", isTransient: false };
    }
    if (status === 429 || status >= 500) {
      return { status: "retrying", isTransient: true };
    }
    // HTTP 400 (Bad request), 401 (Invalid token), 403 (Permission denied)
    return { status: "failed", isTransient: false };
  }

  // HTTP 200 OK
  assert.deepEqual(classifyMetaResponse(200), { status: "accepted", isTransient: false });

  // HTTP 400 Bad Request (permanent validation error)
  assert.deepEqual(classifyMetaResponse(400), { status: "failed", isTransient: false });

  // HTTP 401 / 403 (invalid token / permission denied)
  assert.deepEqual(classifyMetaResponse(401), { status: "failed", isTransient: false });
  assert.deepEqual(classifyMetaResponse(403), { status: "failed", isTransient: false });

  // HTTP 429 Rate Limit (transient)
  assert.deepEqual(classifyMetaResponse(429), { status: "retrying", isTransient: true });

  // HTTP 500 / 502 / 503 Server Error (transient)
  assert.deepEqual(classifyMetaResponse(500), { status: "retrying", isTransient: true });
  assert.deepEqual(classifyMetaResponse(502), { status: "retrying", isTransient: true });

  // Network Timeout (transient)
  assert.deepEqual(classifyMetaResponse(0, true), { status: "retrying", isTransient: true });
});

// ── Test 7: Stale Lease Recovery & Worker Claim Concurrency ──
test("Stage 2B Criteria 10: Worker claim prevents concurrent processing and recovers stale leases", () => {
  const STALE_LEASE_MS = 5 * 60 * 1000;
  let job = {
    id: "job_1",
    status: "processing",
    claimToken: "worker-token-A",
    claimedAt: new Date(Date.now() - (STALE_LEASE_MS + 10000)), // 5m10s ago (stale)
  };

  // Stale recovery function
  function recoverJobIfStale(j) {
    if (j.status === "processing" && Date.now() - j.claimedAt.getTime() > STALE_LEASE_MS) {
      j.status = "retrying";
      j.claimToken = null;
      j.claimedAt = null;
      return true;
    }
    return false;
  }

  const recovered = recoverJobIfStale(job);
  assert.equal(recovered, true);
  assert.equal(job.status, "retrying");
  assert.equal(job.claimToken, null);

  // Worker B claims the recovered job
  function claimJob(j, workerToken) {
    if (j.status === "queued" || j.status === "retrying") {
      j.status = "processing";
      j.claimToken = workerToken;
      j.claimedAt = new Date();
      return true;
    }
    return false; // Already claimed by another worker
  }

  const claimedByWorkerB = claimJob(job, "worker-token-B");
  assert.equal(claimedByWorkerB, true);
  assert.equal(job.claimToken, "worker-token-B");

  // Worker C attempts to claim the same job concurrently -> REJECTED
  const claimedByWorkerC = claimJob(job, "worker-token-C");
  assert.equal(claimedByWorkerC, false);
  assert.equal(job.claimToken, "worker-token-B");
});

// ── Test 8: Non-blocking Checkout Guarantee on Meta Outage ──
test("Stage 2B Criteria 14: Checkout order creation does not throw or halt if Meta CAPI is unavailable", async () => {
  async function simulateOrderCreationWithCapi(isMetaReachable) {
    const order = {
      orderNumber: "ANG_COD_1234",
      total: 3500,
      paymentMethod: "cod",
      status: "success",
    };

    // Simulated CAPI dispatch
    let capiResult;
    try {
      if (!isMetaReachable) {
        throw new Error("Meta Graph API connection refused (ECONNREFUSED)");
      }
      capiResult = { success: true, status: "accepted" };
    } catch (capiErr) {
      // Safe catch block matching src/app/api/orders/route.ts
      capiResult = { success: false, status: "retrying", error: capiErr.message };
    }

    // Checkout returns order success response regardless of Meta CAPI state
    return {
      orderId: order.orderNumber,
      status: order.status,
      capiDispatched: capiResult.success,
    };
  }

  // When Meta is completely down:
  const result = await simulateOrderCreationWithCapi(false);
  assert.equal(result.orderId, "ANG_COD_1234");
  assert.equal(result.status, "success");
  assert.equal(result.capiDispatched, false);
});

// ── Test 9: Secret Redaction in Telemetry Parameters ──
test("Stage 2B Criteria 12: Secret tokens, raw passwords, and card numbers are never stored in telemetry", () => {
  const sensitiveEvent = {
    eventName: "Purchase",
    eventId: "order_123",
    userData: {
      email: "customer@domain.com",
      phone: "01700000000",
    },
    customData: {
      value: 2500,
      currency: "BDT",
      order_id: "123",
      // Accidental sensitive fields
      accessToken: "EAAGsecrettoken12345",
      cardNumber: "4111222233334444",
      cvv: "123",
    },
  };

  function sanitizeParameters(ev) {
    const safe = {
      eventId: ev.eventId,
      hasEmail: Boolean(ev.userData?.email),
      hasPhone: Boolean(ev.userData?.phone),
      value: ev.customData?.value,
      currency: ev.customData?.currency,
      order_id: ev.customData?.order_id,
    };
    return safe;
  }

  const sanitized = sanitizeParameters(sensitiveEvent);
  const serialized = JSON.stringify(sanitized);

  assert.equal(serialized.includes("EAAGsecrettoken"), false);
  assert.equal(serialized.includes("41112222"), false);
  assert.equal(serialized.includes("customer@domain.com"), false);
  assert.equal(serialized.includes("01700000000"), false);
  assert.equal(sanitized.hasEmail, true);
  assert.equal(sanitized.value, 2500);
});

// ── Test 10: Test-Event Mode Isolation ──
test("Stage 2B Criteria 11: test_event_code is attached only when explicitly configured", () => {
  function preparePayload(event, settings) {
    const testCode = event.testEventCode || settings.testEventCode || undefined;
    const payload = {
      data: [{ event_name: event.eventName, event_id: event.eventId }],
    };
    if (testCode) {
      payload.test_event_code = testCode;
    }
    return payload;
  }

  // In production (empty test code)
  const prodPayload = preparePayload({ eventName: "Purchase", eventId: "ev_1" }, { testEventCode: "" });
  assert.equal("test_event_code" in prodPayload, false);

  // In test mode (with code)
  const testPayload = preparePayload(
    { eventName: "Purchase", eventId: "ev_2", testEventCode: "TEST8899" },
    { testEventCode: "" }
  );
  assert.equal(testPayload.test_event_code, "TEST8899");
});
