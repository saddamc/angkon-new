import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * ANGKON — Sliding-Window Rate Limiter Security & Regression Tests (Phase 6)
 *
 * Verifies that the rate limiter prevents boundary burst attacks through weighted
 * sliding-window smoothing while preserving atomic increments and fail-closed security.
 */

const rateLimitSource = fs.readFileSync(
  fs.existsSync("src/server/security/rate-limit.ts")
    ? "src/server/security/rate-limit.ts"
    : "src/server/rate-limit.ts",
  "utf8"
);

test("sliding-window rate limiter: implementation includes weighted counter algorithm", () => {
  assert.ok(rateLimitSource.includes("calculateSlidingWindowCount"));
  assert.ok(rateLimitSource.includes("prevWeight"));
  assert.ok(rateLimitSource.includes("prevBucketKey"));
  assert.ok(rateLimitSource.includes("effectiveCount"));
  assert.ok(rateLimitSource.includes("Promise.all"));
});

test("sliding-window rate limiter: boundary burst attack is defeated by sliding weight", async () => {
  const { calculateSlidingWindowCount } = await import("../src/server/security/rate-limit.ts");

  const windowSizeMs = 60 * 1000; // 60 seconds
  const windowStartMs = 60000;
  const limit = 10;

  // Scenario 1: Attacker sent 10 requests at the very end of previous window (t = 59.9s)
  const prevCount = 10;

  // At t = 60.1s (100ms into current window), attacker sends 1st request
  const t1 = windowStartMs + 100;
  const count1 = calculateSlidingWindowCount(1, prevCount, t1, windowStartMs, windowSizeMs);
  // prevWeight = (60000 - 100) / 60000 = 0.9983; 1 + floor(10 * 0.9983) = 1 + 9 = 10 <= 10 (allowed)
  assert.equal(count1, 10);
  assert.ok(count1 <= limit, "1st request at start of new window is allowed");

  // Attacker sends 2nd request at t = 60.2s
  const t2 = windowStartMs + 200;
  const count2 = calculateSlidingWindowCount(2, prevCount, t2, windowStartMs, windowSizeMs);
  // 2 + floor(10 * 0.9966) = 2 + 9 = 11 > 10 (BLOCKED!)
  assert.equal(count2, 11);
  assert.ok(count2 > limit, "Boundary burst 2nd request is STRICTLY BLOCKED by sliding window");
});

test("sliding-window rate limiter: mid-window and full window decay behave smoothly", async () => {
  const { calculateSlidingWindowCount } = await import("../src/server/security/rate-limit.ts");

  const windowSizeMs = 60 * 1000;
  const windowStartMs = 60000;
  const prevCount = 10;

  // At halfway through current window (t = 90s, elapsed = 30s)
  const tHalf = windowStartMs + 30000;
  // prevWeight = (60000 - 30000) / 60000 = 0.5. floor(10 * 0.5) = 5.
  // 1st request in current window adds 1, total = 6 <= 10 (allowed)
  const countHalf = calculateSlidingWindowCount(1, prevCount, tHalf, windowStartMs, windowSizeMs);
  assert.equal(countHalf, 6);

  // At the end of current window (t = 120s, elapsed = 60s)
  const tEnd = windowStartMs + 60000;
  // prevWeight = 0. floor(10 * 0) = 0.
  // Previous window count has decayed completely to 0
  const countEnd = calculateSlidingWindowCount(1, prevCount, tEnd, windowStartMs, windowSizeMs);
  assert.equal(countEnd, 1);
});

test("sliding-window rate limiter: IP spoofing protection reads rightmost non-empty IP", async () => {
  const { clientIp } = await import("../src/server/security/rate-limit.ts");

  // Mock request with spoofed left IP: "1.2.3.4, 203.0.113.195"
  const map = new Map([
    ["x-forwarded-for", "1.2.3.4, 203.0.113.195"],
  ]);
  const fakeRequest = {
    headers: {
      get: (k) => map.get(k.toLowerCase()) || null,
    },
  };

  // clientIp must extract rightmost trusted IP appended by proxy (203.0.113.195)
  const extracted = clientIp(fakeRequest);
  assert.equal(extracted, "203.0.113.195");
});

test("sliding-window rate limiter: HMAC IP hashing prevents plain PII in database", async () => {
  const { hashIp } = await import("../src/server/security/rate-limit.ts");

  const hash1 = hashIp("203.0.113.195");
  const hash2 = hashIp("203.0.113.195");
  const hashDifferent = hashIp("198.51.100.1");

  assert.equal(hash1, hash2, "Deterministic HMAC hashing for same IP");
  assert.notEqual(hash1, hashDifferent, "Different IPs produce distinct hashes");
  assert.equal(hash1.includes("203"), false, "Plain IP is not exposed in the hash");
  assert.equal(hash1.length, 16, "Truncated 16-character HMAC");
});
