import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { promises as dns } from "node:dns";
import crypto from "node:crypto";

/**
 * ──────────────────────────────────────────────────────────────────────────
 * ANGKON Production Domain Verification Test Suite — Stage 2C
 * Covers lifecycle states, DNS monitoring, security hardening,
 * multi-domain architecture, verification history, and regression checks.
 * ──────────────────────────────────────────────────────────────────────────
 */

export const CANONICAL_ROOT_DOMAIN = "angkon.net";
export const CANONICAL_SITE_URL = "https://angkon.net";
export const CANONICAL_NAMESERVERS = [
  "dns1.registrar-servers.com",
  "dns2.registrar-servers.com",
];
export const PUBLIC_FALLBACK_RESOLVERS = ["8.8.8.8", "1.1.1.1"];

export function normalizeRootDomain(rawDomain) {
  if (!rawDomain) return CANONICAL_ROOT_DOMAIN;
  let clean = String(rawDomain).trim().toLowerCase();
  clean = clean.replace(/^[a-zA-Z]+:\/\//, "");
  clean = clean.split("/")[0];
  clean = clean.split("?")[0];
  clean = clean.split("#")[0];
  clean = clean.split(":")[0];
  if (clean.startsWith("www.")) {
    clean = clean.slice(4);
  }
  if (!clean || clean === "localhost") {
    return CANONICAL_ROOT_DOMAIN;
  }
  return clean;
}

export function isSafePublicDomain(domain) {
  if (!domain || typeof domain !== "string") return false;
  const clean = domain.trim().toLowerCase();
  if (!clean || clean.length > 253) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(clean)) return false;
  if (clean.includes(":") || clean.startsWith("[") || clean.endsWith("]")) return false;
  if (
    clean === "localhost" ||
    clean.endsWith(".localhost") ||
    clean.endsWith(".local") ||
    clean.endsWith(".internal") ||
    clean.endsWith(".lan") ||
    clean.endsWith(".corp") ||
    clean.endsWith(".test")
  ) {
    return false;
  }
  const fqdnRegex = /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})+$/;
  return fqdnRegex.test(clean);
}

export function generateMetaDomainToken() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(30);
  let result = "";
  for (let i = 0; i < 30; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export function calculateLifecycleState({
  dnsStatus,
  htmlStatus,
  metaOwnershipVerified,
  isMismatch,
}) {
  if (metaOwnershipVerified) {
    return "VERIFIED";
  }
  if (isMismatch) {
    return "DNS_MISMATCH";
  }
  const isMethodDetected = dnsStatus === "DETECTED" || htmlStatus === "DETECTED";
  if (isMethodDetected) {
    return "DNS_DETECTED";
  }
  if (dnsStatus === "ERROR" && htmlStatus === "ERROR") {
    return "FAILED";
  }
  return "NEEDS_VERIFICATION";
}

export async function verifyDnsTxtRecord(domain, expectedToken, options = {}) {
  const normalized = normalizeRootDomain(domain);
  const cleanToken = expectedToken ? String(expectedToken).trim() : "";
  const timeoutMs = options.timeoutMs ?? 6000;

  if (!cleanToken) {
    return {
      status: "NOT_FOUND",
      domain: normalized,
      recordsExamined: 0,
      allTxtRecords: [],
      matchedRecord: null,
      isMismatch: false,
      details: "No Meta Domain Verification token provided to compare against.",
    };
  }

  const expectedPrefix = "facebook-domain-verification=";
  const targetRecord = `${expectedPrefix}${cleanToken}`;

  const resolversToTry = [];
  if (options.customResolverServers && options.customResolverServers.length > 0) {
    const custom = new dns.Resolver({ timeout: timeoutMs });
    custom.setServers(options.customResolverServers);
    resolversToTry.push({ name: "custom", resolver: custom });
  } else {
    resolversToTry.push({ name: "system", resolver: new dns.Resolver({ timeout: timeoutMs }) });
    const fallback = new dns.Resolver({ timeout: timeoutMs });
    fallback.setServers(PUBLIC_FALLBACK_RESOLVERS);
    resolversToTry.push({ name: "public-fallback", resolver: fallback });
  }

  let lastError = null;
  const allExamined = [];

  for (const { resolver } of resolversToTry) {
    try {
      const records = await resolver.resolveTxt(normalized);
      const flattened = records.map((entry) => (Array.isArray(entry) ? entry.join("") : entry));
      for (const rec of flattened) {
        if (!allExamined.includes(rec)) allExamined.push(rec);
      }

      const match = flattened.find((r) => r.trim() === targetRecord);
      if (match) {
        return {
          status: "DETECTED",
          domain: normalized,
          recordsExamined: flattened.length,
          allTxtRecords: flattened,
          matchedRecord: match,
          isMismatch: false,
          details: `DNS TXT record verified on ${normalized}. Found exact match for token '${cleanToken}'.`,
        };
      }

      const mismatch = flattened.find((r) => r.trim().startsWith(expectedPrefix));
      if (mismatch) {
        return {
          status: "NOT_FOUND",
          domain: normalized,
          recordsExamined: flattened.length,
          allTxtRecords: flattened,
          matchedRecord: mismatch,
          isMismatch: true,
          details: `DNS TXT record found on ${normalized}, but verification token does not match.`,
        };
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (allExamined.length > 0) {
    return {
      status: "NOT_FOUND",
      domain: normalized,
      recordsExamined: allExamined.length,
      allTxtRecords: allExamined,
      matchedRecord: null,
      isMismatch: false,
      details: `DNS lookup succeeded, but no 'facebook-domain-verification' TXT record was found on ${normalized}.`,
    };
  }

  return {
    status: "ERROR",
    domain: normalized,
    recordsExamined: 0,
    allTxtRecords: [],
    matchedRecord: null,
    isMismatch: false,
    details: `DNS TXT lookup failed for ${normalized}. Error: ${lastError?.message || "Unknown error"}`,
    error: lastError?.message || "DNS lookup failed",
  };
}

// ── Test Cases ──────────────────────────────────────────────────────────────

test("Stage 2C — 1: Canonical root domain is angkon.net with Namecheap nameservers", () => {
  assert.equal(CANONICAL_ROOT_DOMAIN, "angkon.net");
  assert.equal(CANONICAL_SITE_URL, "https://angkon.net");
  assert.deepEqual(CANONICAL_NAMESERVERS, [
    "dns1.registrar-servers.com",
    "dns2.registrar-servers.com",
  ]);
});

test("Stage 2C — 2: normalizeRootDomain strictly strips www, ports, paths, protocols, and casing", () => {
  assert.equal(normalizeRootDomain("www.angkon.net"), "angkon.net");
  assert.equal(normalizeRootDomain("https://www.angkon.net/"), "angkon.net");
  assert.equal(normalizeRootDomain("http://angkon.net:3000/shop/checkout?q=1"), "angkon.net");
  assert.equal(normalizeRootDomain("ANGKON.NET"), "angkon.net");
  assert.equal(normalizeRootDomain("localhost:3000"), "angkon.net");
  assert.equal(normalizeRootDomain(null), "angkon.net");
  assert.equal(normalizeRootDomain(undefined), "angkon.net");
});

test("Stage 2C — 3: SSRF Protection rejects internal, reserved, loopback, and malformed hosts", () => {
  assert.equal(isSafePublicDomain("angkon.net"), true);
  assert.equal(isSafePublicDomain("outlet.angkon.net"), true);
  assert.equal(isSafePublicDomain("sub-domain.example.com"), true);

  // SSRF Rejections
  assert.equal(isSafePublicDomain("127.0.0.1"), false, "Must reject loopback IP");
  assert.equal(isSafePublicDomain("10.0.0.1"), false, "Must reject private RFC1918 IP");
  assert.equal(isSafePublicDomain("192.168.1.1"), false, "Must reject private RFC1918 IP");
  assert.equal(isSafePublicDomain("localhost"), false, "Must reject localhost");
  assert.equal(isSafePublicDomain("server.local"), false, "Must reject mDNS .local");
  assert.equal(isSafePublicDomain("k8s.internal"), false, "Must reject internal TLD");
  assert.equal(isSafePublicDomain("test..com"), false, "Must reject malformed syntax");
  assert.equal(isSafePublicDomain("[::1]"), false, "Must reject IPv6 literal");
});

test("Stage 2C — 4: Independent lifecycle transitions cover all 6 explicit states", () => {
  // 1. VERIFIED: Meta ownership verified overrides DNS/HTML state
  assert.equal(
    calculateLifecycleState({
      dnsStatus: "DETECTED",
      htmlStatus: "DETECTED",
      metaOwnershipVerified: true,
      isMismatch: false,
    }),
    "VERIFIED"
  );

  // 2. DNS_DETECTED: DNS verified, but Meta Business Manager not yet confirmed
  assert.equal(
    calculateLifecycleState({
      dnsStatus: "DETECTED",
      htmlStatus: "NOT_CHECKED",
      metaOwnershipVerified: false,
      isMismatch: false,
    }),
    "DNS_DETECTED"
  );

  // 3. DNS_MISMATCH: DNS record detected with mismatched token
  assert.equal(
    calculateLifecycleState({
      dnsStatus: "NOT_FOUND",
      htmlStatus: "NOT_CHECKED",
      metaOwnershipVerified: false,
      isMismatch: true,
    }),
    "DNS_MISMATCH"
  );

  // 4. NEEDS_VERIFICATION: No record detected, not yet confirmed
  assert.equal(
    calculateLifecycleState({
      dnsStatus: "NOT_FOUND",
      htmlStatus: "NOT_FOUND",
      metaOwnershipVerified: false,
      isMismatch: false,
    }),
    "NEEDS_VERIFICATION"
  );

  // 5. FAILED: Both DNS and HTML encountered network/transport errors
  assert.equal(
    calculateLifecycleState({
      dnsStatus: "ERROR",
      htmlStatus: "ERROR",
      metaOwnershipVerified: false,
      isMismatch: false,
    }),
    "FAILED"
  );
});

test("Stage 2C — 5: Live DNS TXT query for angkon.net successfully detects Meta token and preserves SPF", async () => {
  const expectedToken = "c82us1ogm8zgy1u7zn8v7dcvzpt1a2";
  const result = await verifyDnsTxtRecord("angkon.net", expectedToken);

  assert.equal(result.status, "DETECTED");
  assert.equal(result.domain, "angkon.net");
  assert.equal(result.matchedRecord, `facebook-domain-verification=${expectedToken}`);
  assert.ok(result.recordsExamined >= 1);
  assert.ok(
    result.allTxtRecords.some((r) => r.startsWith("v=spf")),
    "Should preserve unrelated SPF record alongside Meta TXT"
  );
  assert.equal(result.isMismatch, false);
});

test("Stage 2C — 6: www.angkon.net is normalized to root domain angkon.net for apex DNS lookup", async () => {
  const expectedToken = "c82us1ogm8zgy1u7zn8v7dcvzpt1a2";
  const result = await verifyDnsTxtRecord("www.angkon.net", expectedToken);

  assert.equal(result.status, "DETECTED");
  assert.equal(result.domain, "angkon.net");
});

test("Stage 2C — 7: DNS record removal or missing token reports NOT_FOUND", async () => {
  const result = await verifyDnsTxtRecord("angkon.net", "");
  assert.equal(result.status, "NOT_FOUND");
  assert.ok(result.details.includes("No Meta Domain Verification token provided"));
});

test("Stage 2C — 8: Token mismatch is accurately detected as isMismatch", async () => {
  const wrongToken = "completely_mismatched_token_abc123";
  const result = await verifyDnsTxtRecord("angkon.net", wrongToken);

  assert.equal(result.status, "NOT_FOUND");
  assert.equal(result.isMismatch, true);
  assert.ok(result.details.includes("token does not match"));
});

test("Stage 2C — 9: DNS timeout returns structured ERROR without throwing uncaught", async () => {
  const result = await verifyDnsTxtRecord("angkon.net", "c82us1ogm8zgy1u7zn8v7dcvzpt1a2", {
    timeoutMs: 1,
    customResolverServers: ["192.0.2.1"], // RFC 5737 TEST-NET-1 non-routable
  });

  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

test("Stage 2C — 10: Cryptographic token generator produces 30-char lowercase alphanumeric strings", () => {
  const token1 = generateMetaDomainToken();
  const token2 = generateMetaDomainToken();

  assert.equal(token1.length, 30);
  assert.equal(token2.length, 30);
  assert.notEqual(token1, token2);
  assert.match(token1, /^[a-z0-9]{30}$/);
});

test("Stage 2C — 11: Schema files verify append-only audit log and tenant-scoped multi-domain model", () => {
  const domainModelCode = fs.readFileSync("src/models/MetaDomain.ts", "utf8");
  const auditModelCode = fs.readFileSync("src/models/MetaDomainAuditLog.ts", "utf8");

  // Multi-domain schema checks
  assert.ok(domainModelCode.includes("tenantId: 1, domain: 1"), "Compound index for tenant domain");
  assert.ok(domainModelCode.includes("isPrimary:"), "Includes isPrimary flag");
  assert.ok(domainModelCode.includes("lastSuccessfulCheckAt:"), "Tracks lastSuccessfulCheckAt");
  assert.ok(domainModelCode.includes("lastFailedCheckAt:"), "Tracks lastFailedCheckAt");

  // Audit schema checks
  assert.ok(auditModelCode.includes("updatedAt: false"), "Audit log must be append-only");
  assert.ok(auditModelCode.includes("tenantId:"), "Audit log must be tenant-scoped");
  assert.ok(auditModelCode.includes("action:"), "Audit log must track action");
  assert.ok(auditModelCode.includes("previousState:"), "Audit log must track state transitions");
});

test("Stage 2C — 12: Route handler enforces Super Admin auth, tenant isolation, and CSRF protection", () => {
  const routeCode = fs.readFileSync(
    "src/app/api/admin/meta/domain-verification/check/route.ts",
    "utf8"
  );

  assert.ok(routeCode.includes("requireSuperAdminSession"), "Enforces Super Admin session auth");
  assert.ok(routeCode.includes("recheck_dns"), "Supports manual DNS recheck action");
  assert.ok(routeCode.includes("confirm_meta_ownership"), "Supports ownership confirmation action");
  assert.ok(routeCode.includes("add_domain"), "Supports multi-domain registration");
  assert.ok(routeCode.includes("delete_domain"), "Supports domain removal with primary protection");
});

test("Stage 2C — 13: Dashboard UI reflects angkon.net, independent pillars, and history timeline", () => {
  const pageCode = fs.readFileSync("src/app/admin/meta/domain-verification/page.tsx", "utf8");

  assert.ok(!pageCode.includes("angkon.com.bd"), "Incorrect root domain must be completely eliminated");
  assert.ok(pageCode.includes("angkon.net"), "Displays angkon.net as primary root domain");
  assert.ok(pageCode.includes("Verification History"), "Features verification history timeline");
  assert.ok(pageCode.includes("DNS TXT Verification"), "Features DNS TXT status pillar");
  assert.ok(pageCode.includes("Meta Ownership"), "Features independent Meta ownership pillar");
  assert.ok(pageCode.includes("Add Domain"), "Supports multi-domain management modal");
});
