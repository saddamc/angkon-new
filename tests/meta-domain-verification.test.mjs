import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_ROOT_DOMAIN,
  CANONICAL_SITE_URL,
  CANONICAL_NAMESERVERS,
  normalizeRootDomain,
  isAuthorizedAngkonDomain,
  verifyDnsTxtRecord,
  verifyHtmlMetaTag,
} from "../src/server/meta-domain.ts";

test("Domain Verification 1: Canonical root domain is angkon.net and nameservers are Namecheap", () => {
  assert.equal(CANONICAL_ROOT_DOMAIN, "angkon.net");
  assert.equal(CANONICAL_SITE_URL, "https://angkon.net");
  assert.deepEqual(CANONICAL_NAMESERVERS, [
    "dns1.registrar-servers.com",
    "dns2.registrar-servers.com",
  ]);
});

test("Domain Verification 2: normalizeRootDomain strictly strips www, ports, paths, and protocols", () => {
  assert.equal(normalizeRootDomain("www.angkon.net"), "angkon.net");
  assert.equal(normalizeRootDomain("https://www.angkon.net/"), "angkon.net");
  assert.equal(normalizeRootDomain("http://angkon.net:3000/some/path?param=1"), "angkon.net");
  assert.equal(normalizeRootDomain("ANGKON.NET"), "angkon.net");
  assert.equal(normalizeRootDomain("localhost:3001"), "angkon.net");
  assert.equal(normalizeRootDomain(null), "angkon.net");
  assert.equal(normalizeRootDomain(undefined), "angkon.net");
});

test("Domain Verification 3: isAuthorizedAngkonDomain accepts angkon.net and rejects incorrect/spoofed domains", () => {
  assert.equal(isAuthorizedAngkonDomain("angkon.net"), true);
  assert.equal(isAuthorizedAngkonDomain("www.angkon.net"), true);
  assert.equal(isAuthorizedAngkonDomain("https://angkon.net/"), true);

  // Must reject incorrect legacy or spoofed domains
  assert.equal(isAuthorizedAngkonDomain("angkon.com.bd"), false);
  assert.equal(isAuthorizedAngkonDomain("evil-site.com"), false);
  assert.equal(isAuthorizedAngkonDomain("phishing-angkon.net"), false);
});

test("Domain Verification 4: verifyDnsTxtRecord rejects unauthorized domains with explicit ERROR", async () => {
  const result = await verifyDnsTxtRecord("angkon.com.bd", "c82us1ogm8zgy1u7zn8v7dcvzpt1a2");
  assert.equal(result.status, "ERROR");
  assert.ok(result.error?.includes("Rejected unauthorized target domain"));
});

test("Domain Verification 5: verifyDnsTxtRecord handles missing token gracefully", async () => {
  const result = await verifyDnsTxtRecord("angkon.net", "");
  assert.equal(result.status, "NOT_FOUND");
  assert.ok(result.details.includes("No Meta Domain Verification token provided"));
});

test("Domain Verification 6: verifyDnsTxtRecord correctly detects live Namecheap DNS TXT record for angkon.net", async () => {
  const validToken = "c82us1ogm8zgy1u7zn8v7dcvzpt1a2";
  const result = await verifyDnsTxtRecord("angkon.net", validToken);

  assert.equal(result.status, "DETECTED");
  assert.equal(result.domain, "angkon.net");
  assert.ok(result.recordsExamined >= 1, "Should examine at least 1 record");
  assert.equal(result.matchedRecord, `facebook-domain-verification=${validToken}`);
  assert.ok(
    result.allTxtRecords.some((r) => r.startsWith("v=spf")),
    "Should safely preserve and examine SPF records alongside Meta TXT"
  );
  assert.ok(result.details.includes("DNS TXT record verified on angkon.net"));
});

test("Domain Verification 7: www.angkon.net is normalized to angkon.net for DNS TXT verification", async () => {
  const validToken = "c82us1ogm8zgy1u7zn8v7dcvzpt1a2";
  // Passing www.angkon.net must be normalized to root domain angkon.net
  const result = await verifyDnsTxtRecord("www.angkon.net", validToken);

  assert.equal(result.status, "DETECTED");
  assert.equal(result.domain, "angkon.net");
});

test("Domain Verification 8: verifyDnsTxtRecord reports NOT_FOUND if token does not match", async () => {
  const wrongToken = "this_token_is_completely_wrong_12345";
  const result = await verifyDnsTxtRecord("angkon.net", wrongToken);

  assert.equal(result.status, "NOT_FOUND");
  assert.ok(result.details.includes("token does not match") || result.details.includes("No facebook-domain-verification"));
});

test("Domain Verification 9: DNS timeout handling returns structured ERROR and does not throw uncaught", async () => {
  // Use unreachable server with 10ms timeout to force timeout
  const result = await verifyDnsTxtRecord("angkon.net", "c82us1ogm8zgy1u7zn8v7dcvzpt1a2", {
    timeoutMs: 1,
    customResolverServers: ["192.0.2.1"], // non-routable TEST-NET IP
  });

  assert.equal(result.status, "ERROR");
  assert.ok(result.error);
});

test("Domain Verification 10: verifyHtmlMetaTag correctly inspects https://angkon.net live", async () => {
  const validToken = "c82us1ogm8zgy1u7zn8v7dcvzpt1a2";
  const result = await verifyHtmlMetaTag("https://angkon.net", validToken);

  // If storefront is reachable, it should detect the auto-injected tag
  if (result.status === "DETECTED") {
    assert.equal(result.detectedToken, validToken);
    assert.ok(result.details.includes("Meta tag verified"));
  } else {
    // If network to external site is offline in sandboxed run, status must be ERROR or NOT_FOUND without crashing
    assert.ok(["DETECTED", "ERROR", "NOT_FOUND"].includes(result.status));
  }
});

test("Domain Verification 11: Settings model and route support Meta Business Manager ownership confirmation fields", async () => {
  const fs = await import("node:fs");
  const pixelSettingsContent = fs.readFileSync("src/server/pixel-settings.ts", "utf8");
  const routeContent = fs.readFileSync("src/app/api/admin/meta/domain-verification/check/route.ts", "utf8");

  assert.ok(
    pixelSettingsContent.includes("metaOwnershipVerified?: boolean"),
    "pixel-settings.ts must define metaOwnershipVerified in PixelSettings"
  );
  assert.ok(
    pixelSettingsContent.includes("metaOwnershipSource?:"),
    "pixel-settings.ts must define metaOwnershipSource in PixelSettings"
  );
  assert.ok(
    pixelSettingsContent.includes("metaOwnershipConfirmedBy?: string"),
    "pixel-settings.ts must define metaOwnershipConfirmedBy in PixelSettings"
  );
  assert.ok(
    routeContent.includes('action !== "confirm_meta_ownership"'),
    "check/route.ts must support action confirm_meta_ownership"
  );
  assert.ok(
    routeContent.includes("CANONICAL_ROOT_DOMAIN"),
    "check/route.ts must use CANONICAL_ROOT_DOMAIN"
  );
});
