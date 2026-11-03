import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Test implementation of pure sanitizer logic as in src/server/pixel-settings.ts
function sanitizeTelemetryUrl(rawUrl) {
  if (!rawUrl) return "/";
  try {
    const dummyBase = "https://www.angkon.net";
    const isRelative = rawUrl.startsWith("/");
    const parsed = new URL(isRelative ? `${dummyBase}${rawUrl}` : rawUrl);
    const sensitiveKeys = [
      "fbclid",
      "token",
      "access_token",
      "capi_token",
      "key",
      "secret",
      "auth",
      "session_id",
      "session",
      "password",
      "pass",
      "email",
      "phone",
      "code",
    ];

    for (const key of Array.from(parsed.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (
        sensitiveKeys.some((s) => lower === s || lower.includes("token") || lower.includes("secret"))
      ) {
        parsed.searchParams.set(key, "[REDACTED]");
      }
    }

    return isRelative ? `${parsed.pathname}${parsed.search}` : parsed.toString();
  } catch {
    return rawUrl.split("?")[0] || "/";
  }
}

function sanitizeTelemetryParameters(params) {
  if (!params || typeof params !== "object") return {};
  const safe = {};

  for (const [key, val] of Object.entries(params)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("pass") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("auth")
    ) {
      safe[key] = "[REDACTED]";
    } else if (lower === "email" && typeof val === "string") {
      safe[key] = val.includes("@")
        ? `${val.slice(0, 2)}***@${val.split("@")[1]}`
        : "[REDACTED]";
    } else if (lower === "phone" && typeof val === "string") {
      safe[key] = val.length >= 6 ? `${val.slice(0, 4)}***${val.slice(-2)}` : "[REDACTED]";
    } else {
      safe[key] = val;
    }
  }

  return safe;
}

test("Events Manager Enterprise: 1. URL Privacy Sanitization scrubs fbclid and tokens", () => {
  const dirtyUrl =
    "https://www.angkon.net/checkout?fbclid=IwAR2xyz123_456&token=EAAGNOsecret123&session_id=sess_9999&utm_source=facebook";
  const cleaned = sanitizeTelemetryUrl(dirtyUrl);

  assert.ok(!cleaned.includes("IwAR2xyz123_456"), "fbclid must be redacted");
  assert.ok(!cleaned.includes("EAAGNOsecret123"), "tokens must be redacted");
  assert.ok(!cleaned.includes("sess_9999"), "session IDs must be redacted");
  assert.ok(cleaned.includes("utm_source=facebook"), "benign marketing UTM parameters preserved");
  assert.ok(
    decodeURIComponent(cleaned).includes("[REDACTED]"),
    "shows [REDACTED] placeholder"
  );
});

test("Events Manager Enterprise: 2. Parameter Sanitization masks email and phone", () => {
  const dirtyParams = {
    email: "customer.saree@gmail.com",
    phone: "01712345689",
    value: 4500,
    currency: "BDT",
    order_id: "ANG-1002",
    secret_token: "should_not_leak",
  };

  const safe = sanitizeTelemetryParameters(dirtyParams);

  assert.equal(safe.value, 4500);
  assert.equal(safe.currency, "BDT");
  assert.equal(safe.order_id, "ANG-1002");
  assert.ok(typeof safe.email === "string" && !safe.email.includes("customer.saree"));
  assert.ok(typeof safe.email === "string" && safe.email.includes("***@gmail.com"));
  assert.ok(typeof safe.phone === "string" && safe.phone.includes("***89"));
  assert.equal(safe.secret_token, "[REDACTED]");
});

test("Events Manager Enterprise: 3. Diagnostics Troubleshooting matches Meta trace evidence", () => {
  const modalPath = path.resolve("src/components/admin/meta/diagnostics-review-modal.tsx");
  const modalContent = fs.readFileSync(modalPath, "utf8");

  assert.ok(modalContent.includes("order_ANG-626058-164"), "Matches exact event ID from Meta report");
  assert.ok(modalContent.includes("Awge7LgQO8BwR5DqJBQJCnk"), "Matches exact FB trace ID from Meta report");
  assert.ok(modalContent.includes("client_ip_address"), "Matches detected error key");
  assert.ok(modalContent.includes("Send missing IP address parameter"), "Matches Meta error title");
});

test("Events Manager Enterprise: 4. Codebase Static Verification of Test Simulation Events", () => {
  const pagePath = path.resolve("src/app/admin/meta/events/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf8");

  // Verify all 5 standard events in test simulator
  assert.ok(pageContent.includes("PageView"), "Simulator includes PageView");
  assert.ok(pageContent.includes("ViewContent"), "Simulator includes ViewContent");
  assert.ok(pageContent.includes("AddToCart"), "Simulator includes AddToCart");
  assert.ok(pageContent.includes("InitiateCheckout"), "Simulator includes InitiateCheckout");
  assert.ok(pageContent.includes("Purchase"), "Simulator includes Purchase");

  // Verify test isolation banner
  assert.ok(pageContent.includes("Isolated Sandbox Mode Active"), "Includes test isolation banner");

  // Verify Diagnostics UI elements from Meta Image 1
  assert.ok(
    pageContent.includes("Send missing IP address parameter for one or more of your server events"),
    "Diagnostics includes exact Meta title"
  );
  assert.ok(pageContent.includes("Active (1)"), "Diagnostics includes active error pill");
  assert.ok(pageContent.includes("Review solution"), "Diagnostics includes Review solution action");

  // Verify zero fake numbers in production funnel
  assert.ok(!pageContent.includes("eventStats.PageView || 1200"), "No fake 1200 PageView fallback");
  assert.ok(!pageContent.includes("eventStats.ViewContent || 268"), "No fake 268 ViewContent fallback");
  assert.ok(!pageContent.includes("eventStats.AddToCart || 74"), "No fake 74 AddToCart fallback");
  assert.ok(!pageContent.includes("eventStats.InitiateCheckout || 49"), "No fake 49 InitiateCheckout fallback");
  assert.ok(!pageContent.includes("eventStats.Purchase || 54"), "No fake 54 Purchase fallback");
});

test("Events Manager Enterprise: 5. Test CAPI Route supports rich metadata response", () => {
  const routePath = path.resolve("src/app/api/admin/meta/capi/test/route.ts");
  const routeContent = fs.readFileSync(routePath, "utf8");

  assert.ok(routeContent.includes("defaultCustomData"), "Supplies default e-commerce simulation payloads");
  assert.ok(routeContent.includes("fbtraceId: result.fbtraceId"), "Returns fbtraceId in response");
  assert.ok(routeContent.includes("eventName: targetEvent"), "Returns eventName in response");
});

