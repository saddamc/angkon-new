import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return nextResolve("next/server.js", context);
    }
    if (specifier.startsWith("@/")) {
      const subpath = specifier.slice(2);
      const target = path.resolve(process.cwd(), "src", subpath);
      let file = target;
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        file = target;
      } else if (fs.existsSync(`${target}.ts`)) {
        file = `${target}.ts`;
      } else if (fs.existsSync(`${target}.json`)) {
        file = `${target}.json`;
      } else {
        file = `${target}/index.ts`;
      }
      return nextResolve(pathToFileURL(file).href, context);
    }
    if (
      !context.parentURL?.includes("node_modules") &&
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[cm]?[jt]s$/.test(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.includes("node_modules") && url.endsWith(".json")) {
      const content = fs.readFileSync(new URL(url), "utf8");
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${content};`,
      };
    }
    return nextLoad(url, context);
  },
});

const cryptoUtils = await import("../src/lib/security/token-encryption.ts");
const graphClient = await import("../src/lib/integrations/meta/client.ts");
const connectionModule = await import("../src/server/meta-catalog-connection.ts");
const feedsModule = await import("../src/server/meta-product-feeds.ts");
const monitoringModule = await import("../src/server/meta-feed-monitoring.ts");

/* ──────────────────────────────────────────────────────────────────────────
 * 1. Token Encryption at Rest & Redaction
 * ────────────────────────────────────────────────────────────────────────── */

test("Encryption: encrypts access token using AES-256-GCM and decrypts correctly", () => {
  const secretToken = "EAAB1234567890abcdef_secret_test_token";
  const encrypted = cryptoUtils.encryptToken(secretToken);

  assert.ok(encrypted.ciphertext, "Ciphertext must not be empty");
  assert.ok(encrypted.iv, "IV must be generated");
  assert.ok(encrypted.tag, "Auth tag must be generated");
  assert.notEqual(encrypted.ciphertext, secretToken, "Ciphertext must differ from plaintext");

  const decrypted = cryptoUtils.decryptToken(encrypted);
  assert.equal(decrypted, secretToken, "Decrypted token must match original plaintext");
});

test("Encryption: throws or fails safely on tampered ciphertext or auth tag", () => {
  const secretToken = "EAAB1234567890abcdef_secret_test_token";
  const encrypted = cryptoUtils.encryptToken(secretToken);

  const tamperedTag = {
    ...encrypted,
    tag: "00112233445566778899aabbccddeeff",
  };

  assert.throws(() => cryptoUtils.decryptToken(tamperedTag), /Unsupported state or unable to authenticate data|bad decrypt/i);
});

test("Masking: masks access tokens so credentials are never returned in full", () => {
  const token = "EAAB1234567890abcdef_very_long_secret_meta_token_value_xyz";
  const masked = cryptoUtils.maskToken(token);
  assert.ok(masked.startsWith("EAAB••••••••"), "Must start with prefix and mask");
  assert.ok(masked.endsWith("_xyz"), "Must preserve end chars");
  assert.ok(!masked.includes("very_long_secret"), "Must not leak secret parts");
});

test("Redaction: redacts Meta tokens from log and error messages", () => {
  const textWithToken = "Failed request with token EAAB1234567890abcdef1234567890 and Bearer secret123";
  const redacted = cryptoUtils.redactTokens(textWithToken);
  assert.ok(!redacted.includes("EAAB1234567890abcdef1234567890"));
  assert.ok(!redacted.includes("secret123"));
  assert.ok(redacted.includes("[REDACTED_META_TOKEN]"));
});

/* ──────────────────────────────────────────────────────────────────────────
 * 2. Meta Graph API Client Tests
 * ────────────────────────────────────────────────────────────────────────── */

test("Graph Client: successfully calls API with bearer token header and parses JSON", async () => {
  let capturedHeaders = {};
  const mockFetch = async (url, init) => {
    capturedHeaders = init?.headers || {};
    return new Response(
      JSON.stringify({
        id: "123456789",
        name: "ANGKON Catalog",
        product_count: 16,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const response = await graphClient.callMetaGraphApi("123456789", {
    accessToken: "EAAB_test_token_123",
    fetchFn: mockFetch,
    params: { fields: "id,name,product_count" },
  });

  assert.equal(response.status, 200);
  assert.equal(response.data.id, "123456789");
  assert.equal(response.data.name, "ANGKON Catalog");
  assert.equal(response.data.product_count, 16);
  assert.equal(capturedHeaders.Authorization, "Bearer EAAB_test_token_123");
});

test("Graph Client: classifies expired token as fatal INVALID_TOKEN error", async () => {
  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          message: "Error validating access token: Session has expired",
          type: "OAuthException",
          code: 190,
          error_subcode: 463,
          fbtrace_id: "FTrace123",
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  };

  await assert.rejects(
    async () => {
      await graphClient.callMetaGraphApi("me", {
        accessToken: "expired_token",
        fetchFn: mockFetch,
        maxRetries: 0,
      });
    },
    (err) => {
      assert.ok(err instanceof graphClient.MetaGraphApiError);
      assert.equal(err.code, 190);
      assert.equal(err.category, "INVALID_TOKEN");
      assert.equal(err.isFatal, true);
      return true;
    }
  );
});

test("Graph Client: classifies permission error as fatal MISSING_PERMISSIONS error", async () => {
  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          message: "(#200) Requires catalog_management permission to manage the object",
          type: "OAuthException",
          code: 200,
          fbtrace_id: "FTrace200",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  };

  await assert.rejects(
    async () => {
      await graphClient.callMetaGraphApi("987654321098765/product_feeds", {
        method: "POST",
        accessToken: "missing_perm_token",
        fetchFn: mockFetch,
        maxRetries: 0,
      });
    },
    (err) => {
      assert.ok(err instanceof graphClient.MetaGraphApiError);
      assert.equal(err.code, 200);
      assert.equal(err.category, "MISSING_PERMISSIONS");
      assert.equal(err.isFatal, true);
      return true;
    }
  );
});

test("Graph Client: parses rate-limit headers accurately", async () => {
  const mockFetch = async () => {
    const headers = new Headers({
      "Content-Type": "application/json",
      "x-business-use-case-usage": JSON.stringify({
        "12345": [
          {
            call_count: 85,
            total_time: 40,
            total_cputime: 30,
            estimated_time_to_regain_access: 10,
          },
        ],
      }),
    });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  };

  const response = await graphClient.callMetaGraphApi("test", {
    accessToken: "test_token",
    fetchFn: mockFetch,
  });

  assert.equal(response.status, 200);
  assert.equal(response.usage?.callCountPct, 85);
  assert.equal(response.usage?.totalTimePct, 40);
  assert.equal(response.usage?.estimatedTimeToRegainAccess, 10);
});

/* ──────────────────────────────────────────────────────────────────────────
 * 3. Token Permissions & Catalog Connection Checks
 * ────────────────────────────────────────────────────────────────────────── */

test("Permissions: detects granted catalog_management and business_management permissions", async () => {
  const mockFetch = async (url) => {
    if (url.includes("me/permissions")) {
      return new Response(
        JSON.stringify({
          data: [
            { permission: "catalog_management", status: "granted" },
            { permission: "business_management", status: "granted" },
            { permission: "email", status: "granted" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };

  const check = await connectionModule.checkTokenPermissions("valid_token", mockFetch);
  assert.equal(check.valid, true);
  assert.equal(check.hasCatalogManagement, true);
  assert.equal(check.hasBusinessManagement, true);
});

test("Permissions: flags missing catalog_management scope", async () => {
  const mockFetch = async (url) => {
    if (url.includes("me/permissions")) {
      return new Response(
        JSON.stringify({
          data: [
            { permission: "ads_read", status: "granted" },
            { permission: "pages_show_list", status: "granted" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };

  const check = await connectionModule.checkTokenPermissions("token_without_catalog_mgmt", mockFetch);
  assert.equal(check.valid, true);
  assert.equal(check.hasCatalogManagement, false);
});

test("Catalog Lookup: verifies valid catalog details and matching business ID", async () => {
  const mockFetch = async (url) => {
    if (url.includes("me/permissions")) {
      return new Response(
        JSON.stringify({
          data: [
            { permission: "catalog_management", status: "granted" },
            { permission: "business_management", status: "granted" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("987654321098765")) {
      return new Response(
        JSON.stringify({
          id: "987654321098765",
          name: "ANGKON Official Catalog",
          product_count: 16,
          vertical: "commerce",
          business: { id: "123456789012345", name: "ANGKON Business" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };

  // We can pass a mock fetch to test the verification workflow
  const result = await connectionModule.verifyAndConnectCatalog({
    tenantId: "test_tenant",
    catalogId: "987654321098765",
    businessId: "123456789012345",
    accessToken: "EAAB_verified_token",
    fetchFn: mockFetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "CONNECTED");
  assert.equal(result.catalogId, "987654321098765");
  assert.equal(result.catalogName, "ANGKON Official Catalog");
  assert.equal(result.productCount, 16);
});

/* ──────────────────────────────────────────────────────────────────────────
 * 4. Scheduled Feed Registration & Duplicate Prevention
 * ────────────────────────────────────────────────────────────────────────── */

test("Scheduled Feeds: creates a new feed when none exists", async () => {
  let createdPayload = null;

  const mockFetch = async (url, init) => {
    if (url.includes("product_feeds") && init?.method === "GET") {
      // Empty existing feeds list
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("product_feeds") && init?.method === "POST") {
      createdPayload = JSON.parse(init.body);
      return new Response(JSON.stringify({ id: "feed_1122334455" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };

  const result = await feedsModule.registerOrUpdateProductFeed({
    tenantId: "test_tenant",
    feedName: "ANGKON Production Catalog Feed",
    feedUrl: "https://www.angkon.net/api/meta/catalog-feed?feed_key=test-secret",
    fetchFn: mockFetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "ACTIVE");
  assert.equal(result.productFeedId, "feed_1122334455");
  assert.equal(result.action, "created_new");
  assert.ok(createdPayload);
  assert.equal(createdPayload.name, "ANGKON Production Catalog Feed");
  assert.ok(createdPayload.schedule.includes("https://www.angkon.net/api/meta/catalog-feed?feed_key=test-secret"));
});

test("Scheduled Feeds: avoids duplicate registration when feed with URL already exists", async () => {
  let updateCalledOnFeedId = null;

  const mockFetch = async (url, init) => {
    if (url.includes("product_feeds") && init?.method === "GET") {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "feed_existing_998877",
              name: "ANGKON Production Catalog Feed",
              schedule: {
                interval: "DAILY",
                url: "https://www.angkon.net/api/meta/catalog-feed?feed_key=test-secret",
                hour: 4,
                minute: 0,
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("feed_existing_998877") && init?.method === "POST") {
      updateCalledOnFeedId = "feed_existing_998877";
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };

  const result = await feedsModule.registerOrUpdateProductFeed({
    tenantId: "test_tenant",
    feedName: "ANGKON Production Catalog Feed",
    feedUrl: "https://www.angkon.net/api/meta/catalog-feed?feed_key=test-secret",
    fetchFn: mockFetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "ACTIVE");
  assert.equal(result.productFeedId, "feed_existing_998877");
  assert.equal(result.action, "updated_existing");
  assert.equal(updateCalledOnFeedId, "feed_existing_998877");
});

/* ──────────────────────────────────────────────────────────────────────────
 * 5. Import Monitoring & Upload Diagnostics
 * ────────────────────────────────────────────────────────────────────────── */

test("Import Monitoring: accurately parses Meta uploads batch status and metrics", async () => {
  const mockFetch = async (url) => {
    if (url.includes("/uploads")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "batch_upload_8899",
              status: "COMPLETED",
              start_time: "2026-11-01T04:00:00+0000",
              end_time: "2026-11-01T04:00:15+0000",
              num_rows_read: 16,
              num_rows_accepted: 16,
              num_rows_rejected: 0,
              error_count: 0,
              errors: [],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };

  const status = await monitoringModule.checkFeedImportStatus({
    tenantId: "test_tenant",
    fetchFn: mockFetch,
  });

  assert.equal(status.ok, true);
  assert.equal(status.importStatus, "SUCCESS");
  assert.equal(status.stats.productsProcessed, 16);
  assert.equal(status.stats.productsAccepted, 16);
  assert.equal(status.stats.productsRejected, 0);
  assert.equal(status.stats.errorCount, 0);
  assert.ok(status.lastSuccessfulImportAt);
});

test("Import Monitoring: accurately flags partial rejection with error messages", async () => {
  const mockFetch = async (url) => {
    if (url.includes("/uploads")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "batch_upload_part",
              status: "COMPLETED",
              start_time: "2026-11-01T04:00:00+0000",
              end_time: "2026-11-01T04:00:12+0000",
              num_rows_read: 16,
              num_rows_accepted: 14,
              num_rows_rejected: 2,
              error_count: 2,
              errors: [
                {
                  code: 108,
                  message: "Missing image link on product 228099",
                  severity: "ERROR",
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };

  const status = await monitoringModule.checkFeedImportStatus({
    tenantId: "test_tenant",
    fetchFn: mockFetch,
  });

  assert.equal(status.ok, true);
  assert.equal(status.importStatus, "PARTIAL");
  assert.equal(status.stats.productsAccepted, 14);
  assert.equal(status.stats.productsRejected, 2);
  assert.ok(status.error?.includes("Missing image link"));
});

/* ──────────────────────────────────────────────────────────────────────────
 * 6. RBAC & Admin Endpoint Protection
 * ────────────────────────────────────────────────────────────────────────── */

test("Admin Security: rejects unauthenticated requests to catalog endpoints", async () => {
  const { NextRequest } = await import("next/server");
  const configRoute = await import("../src/app/api/admin/meta/catalog/config/route.ts");
  const verifyRoute = await import("../src/app/api/admin/meta/catalog/verify-connection/route.ts");
  const registerRoute = await import("../src/app/api/admin/meta/catalog/register-feed/route.ts");

  const unauthReq = new NextRequest("https://www.angkon.net/api/admin/meta/catalog/config");

  const res1 = await configRoute.GET(unauthReq);
  assert.equal(res1.status, 401);

  const res2 = await verifyRoute.POST(unauthReq);
  assert.equal(res2.status, 401);

  const res3 = await registerRoute.POST(unauthReq);
  assert.equal(res3.status, 401);
});
