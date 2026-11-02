import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  extractClientIp,
  sanitizeClientIp,
  isValidIp,
  isPublicIp,
  isLoopbackIp,
  isPrivateIp,
} from "../src/server/client-ip.ts";

test("IP Validation: Recognizes valid, loopback, and private IPs", () => {
  assert.equal(isValidIp("103.145.132.55"), true);
  assert.equal(isValidIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334"), true);
  assert.equal(isValidIp("unknown"), false);
  assert.equal(isValidIp(""), false);
  assert.equal(isValidIp(null), false);
  assert.equal(isValidIp(undefined), false);

  assert.equal(isLoopbackIp("127.0.0.1"), true);
  assert.equal(isLoopbackIp("::1"), true);
  assert.equal(isLoopbackIp("103.145.132.55"), false);

  assert.equal(isPrivateIp("192.168.1.1"), true);
  assert.equal(isPrivateIp("10.0.0.1"), true);
  assert.equal(isPrivateIp("172.16.5.1"), true);
  assert.equal(isPrivateIp("103.145.132.55"), false);

  assert.equal(isPublicIp("103.145.132.55"), true);
  assert.equal(isPublicIp("127.0.0.1"), false);
  assert.equal(isPublicIp("192.168.1.100"), false);
});

test("IP Sanitization: Rejects invalid, unknown, or loopback IPs", () => {
  assert.equal(sanitizeClientIp("unknown"), undefined);
  assert.equal(sanitizeClientIp("127.0.0.1"), undefined);
  assert.equal(sanitizeClientIp("::1"), undefined);
  assert.equal(sanitizeClientIp("  103.145.132.55  "), "103.145.132.55");
});

test("extractClientIp: Prioritizes Cloudflare cf-connecting-ip and parses X-Forwarded-For", () => {
  // 1. Cloudflare header
  const reqCf = {
    headers: {
      get: (h) => {
        if (h === "cf-connecting-ip") return "103.145.132.1";
        if (h === "x-forwarded-for") return "10.0.0.1, 103.145.132.1";
        return null;
      },
    },
  };
  assert.equal(extractClientIp(reqCf), "103.145.132.1");

  // 2. X-Real-IP
  const reqReal = {
    headers: {
      get: (h) => (h === "x-real-ip" ? "103.145.132.2" : null),
    },
  };
  assert.equal(extractClientIp(reqReal), "103.145.132.2");

  // 3. Multi-hop X-Forwarded-For: Client (public), Proxy1 (private), Proxy2
  const reqForwarded = {
    headers: {
      get: (h) => (h === "x-forwarded-for" ? "103.145.132.99, 10.0.1.5, 172.17.0.2" : null),
    },
  };
  assert.equal(extractClientIp(reqForwarded), "103.145.132.99");
});

test("Meta CAPI Rule: Enforces that User Agent and Client IP are paired together", () => {
  // Logic replica of formatUserDataForMeta
  function buildUserData(userData) {
    const result = {};
    const validIp = sanitizeClientIp(userData.clientIp);
    if (validIp) {
      result.client_ip_address = validIp;
    }
    if (userData.clientUserAgent && result.client_ip_address) {
      result.client_user_agent = userData.clientUserAgent;
    }
    return result;
  }

  // Case A: Both valid IP and User Agent provided -> Both present in payload
  const validData = {
    clientIp: "103.145.132.55",
    clientUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  };
  const builtValid = buildUserData(validData);
  assert.equal(builtValid.client_ip_address, "103.145.132.55");
  assert.equal(builtValid.client_user_agent, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

  // Case B: IP is missing -> User Agent MUST NOT be sent alone!
  const missingIpData = {
    clientUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  };
  const builtMissing = buildUserData(missingIpData);
  assert.equal(builtMissing.client_ip_address, undefined);
  assert.equal(builtMissing.client_user_agent, undefined, "User agent must not be sent without client IP");

  // Case C: IP is 'unknown' -> User Agent MUST NOT be sent alone!
  const unknownIpData = {
    clientIp: "unknown",
    clientUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  };
  const builtUnknown = buildUserData(unknownIpData);
  assert.equal(builtUnknown.client_ip_address, undefined);
  assert.equal(builtUnknown.client_user_agent, undefined, "User agent must not be sent when IP is 'unknown'");

  // Case D: IP is loopback -> User Agent MUST NOT be sent alone!
  const loopbackIpData = {
    clientIp: "127.0.0.1",
    clientUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  };
  const builtLoopback = buildUserData(loopbackIpData);
  assert.equal(builtLoopback.client_ip_address, undefined);
  assert.equal(builtLoopback.client_user_agent, undefined, "User agent must not be sent when IP is loopback");
});

test("Codebase Static Verification: meta-capi.ts pairs client_ip_address and client_user_agent", () => {
  const capiFile = fs.readFileSync("src/server/meta-capi.ts", "utf8");
  assert.match(capiFile, /sanitizeClientIp\(userData\.clientIp\)/, "Must use sanitizeClientIp");
  assert.match(
    capiFile,
    /userData\.clientUserAgent\s*&&\s*result\.client_ip_address/,
    "Must enforce client_user_agent only when result.client_ip_address is present"
  );

  const ordersRoute = fs.readFileSync("src/app/api/orders/route.ts", "utf8");
  assert.match(ordersRoute, /clientIp:\s*extractClientIp\(request\)/, "orders route must use extractClientIp");

  const pixelEventsRoute = fs.readFileSync("src/app/api/pixel/events/route.ts", "utf8");
  assert.match(pixelEventsRoute, /clientIp\s*=\s*extractClientIp\(request\)/, "pixel events route must use extractClientIp");

  const sslCallbackRoute = fs.readFileSync("src/app/api/payment/sslcommerz/callback/route.ts", "utf8");
  assert.match(sslCallbackRoute, /clientIp:\s*extractClientIp\(request\)/, "sslcommerz callback route must use extractClientIp");
});
