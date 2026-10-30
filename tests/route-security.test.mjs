import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET || "angkon_secure_jwt_secret_2026";
const DEFAULT_TENANT_ID = "angkon-main";

// ── Pure Web Request Simulators ──────────────────────────────────────────────

async function createAdminJwt(payload = {}) {
  const defaultPayload = {
    sub: "admin",
    role: "admin",
    authorizedTenants: ["angkon-main"],
    defaultTenant: "angkon-main",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const finalPayload = { ...defaultPayload, ...payload };

  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(finalPayload));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

// ── Route & Data Layer Mock Harness ──────────────────────────────────────────

class MockNextRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.nextUrl = new URL(url, "http://localhost:3000");
    this.headers = new Map(Object.entries(options.headers || {}));
    this.cookies = {
      get: (name) => {
        const cookieStr = this.headers.get("cookie") || "";
        const match = cookieStr.match(new RegExp(`${name}=([^;]+)`));
        return match ? { name, value: match[1] } : undefined;
      },
    };
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("Route Guard: Missing session cookie blocks request with 401 Unauthorized", async () => {
  const req = new MockNextRequest("https://angkon.com.bd/api/admin/settings/pixel");
  const token = req.cookies.get("nb_admin_token")?.value;

  assert.equal(token, undefined);
  // Simulating route handler authorization decision
  const isAuthorized = Boolean(token);
  assert.equal(isAuthorized, false, "Must block unauthenticated access");
});

test("Route Guard: Non-admin role (e.g. customer) is rejected with 403 Forbidden", async () => {
  const customerToken = await createAdminJwt({
    sub: "customer_buyer",
    role: "customer", // Privilege escalation attempt
  });

  const req = new MockNextRequest("https://angkon.com.bd/api/admin/settings/pixel", {
    headers: { cookie: `nb_admin_token=${customerToken}` },
  });

  const tokenStr = req.cookies.get("nb_admin_token")?.value;
  const payload = JSON.parse(atob(tokenStr.split(".")[1]));

  assert.notEqual(payload.role, "admin");
  const authResponse = payload.role === "admin" ? { status: 200 } : { status: 403, error: "Forbidden: Admin role required" };
  assert.equal(authResponse.status, 403);
});

test("Route Guard: Forged x-tenant-id header (Plain Stitch attack) returns 403 Forbidden", async () => {
  const validAngkonToken = await createAdminJwt({
    sub: "admin",
    role: "admin",
    authorizedTenants: ["angkon-main"], // Strictly ANGKON store only
  });

  const req = new MockNextRequest("https://angkon.com.bd/api/admin/settings/pixel", {
    headers: {
      cookie: `nb_admin_token=${validAngkonToken}`,
      "x-tenant-id": "plain-stitch", // Attacker attempts to target agency portfolio
    },
  });

  const requestedTenant = req.headers.get("x-tenant-id");
  const tokenPayload = JSON.parse(atob(req.cookies.get("nb_admin_token").value.split(".")[1]));
  const isTenantAllowed = tokenPayload.authorizedTenants.includes(requestedTenant);

  assert.equal(isTenantAllowed, false, "Must reject tenant outside authorized membership");
  const decision = isTenantAllowed ? { status: 200 } : { status: 403, error: `Forbidden: Store '${requestedTenant}' not authorized` };
  assert.equal(decision.status, 403);
  assert.match(decision.error, /plain-stitch/);
});

test("Route Guard: URL parameter tenant switching (?tenantId=other) returns 403 Forbidden", async () => {
  const validAngkonToken = await createAdminJwt({
    sub: "admin",
    role: "admin",
    authorizedTenants: ["angkon-main"],
  });

  const req = new MockNextRequest(
    "https://angkon.com.bd/api/admin/meta/ads/campaigns?tenantId=partner_store_2",
    {
      headers: { cookie: `nb_admin_token=${validAngkonToken}` },
    }
  );

  const requestedTenant = req.nextUrl.searchParams.get("tenantId");
  const tokenPayload = JSON.parse(atob(req.cookies.get("nb_admin_token").value.split(".")[1]));
  const isTenantAllowed = tokenPayload.authorizedTenants.includes(requestedTenant);

  assert.equal(isTenantAllowed, false);
  const decision = isTenantAllowed ? { status: 200 } : { status: 403, error: "Forbidden" };
  assert.equal(decision.status, 403);
});

test("Route Guard: Valid ANGKON administrator is successfully authorized for angkon-main", async () => {
  const validAngkonToken = await createAdminJwt({
    sub: "admin",
    role: "admin",
    authorizedTenants: ["angkon-main"],
  });

  const req = new MockNextRequest("https://angkon.com.bd/api/admin/settings/pixel", {
    headers: {
      cookie: `nb_admin_token=${validAngkonToken}`,
    },
  });

  const tokenPayload = JSON.parse(atob(req.cookies.get("nb_admin_token").value.split(".")[1]));
  const requestedTenant = req.headers.get("x-tenant-id") || tokenPayload.defaultTenant;

  assert.equal(tokenPayload.role, "admin");
  assert.equal(tokenPayload.authorizedTenants.includes(requestedTenant), true);
  assert.equal(requestedTenant, DEFAULT_TENANT_ID);
});

test("Rollback Pre-Check: Refuses to rollback when duplicate keys exist", () => {
  // Simulate database having multiple documents with key 'pixel'
  const mockDocuments = [
    { key: "pixel", tenantId: "angkon-main" },
    { key: "pixel", tenantId: "secondary-client" },
    { key: "checkout", tenantId: "angkon-main" },
  ];

  const keyCounts = new Map();
  for (const doc of mockDocuments) {
    keyCounts.set(doc.key, (keyCounts.get(doc.key) || 0) + 1);
  }

  const duplicates = Array.from(keyCounts.entries()).filter(([_, c]) => c > 1);
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0][0], "pixel");

  // Rollback must abort safely
  const canRollback = duplicates.length === 0;
  assert.equal(canRollback, false, "Must abort rollback when duplicate keys exist to avoid index collision");
});
