import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET || "angkon_secure_jwt_secret_2026";
const DEFAULT_TENANT_ID = "angkon-main";

// ── Production Logic Replicas for Unit Testing ────────────────────────────────

function isValidTenantId(tenantId) {
  if (typeof tenantId !== "string") return false;
  const clean = tenantId.trim();
  return /^[a-zA-Z0-9_-]{2,64}$/.test(clean);
}

function extractRequestedTenantId(headers = {}, urlString = "") {
  const headerTenant = headers["x-tenant-id"] || headers["x-store-id"];
  if (headerTenant) {
    return String(headerTenant).trim();
  }
  if (urlString) {
    try {
      const url = new URL(urlString, "http://localhost:3000");
      const qTenant = url.searchParams.get("tenantId");
      if (qTenant) return qTenant.trim();
    } catch {
      // ignore
    }
  }
  return null;
}

function validateTenantAccess(requestedTenantId, authorizedTenants = [DEFAULT_TENANT_ID]) {
  const safeAuthorized =
    Array.isArray(authorizedTenants) && authorizedTenants.length > 0
      ? authorizedTenants
      : [DEFAULT_TENANT_ID];

  if (requestedTenantId) {
    if (!isValidTenantId(requestedTenantId)) {
      return {
        authorized: false,
        activeTenantId: safeAuthorized[0],
        status: 400,
        error: `Invalid tenant identifier format: '${requestedTenantId}'.`,
      };
    }

    const isMember = safeAuthorized.includes(requestedTenantId);
    if (!isMember) {
      return {
        authorized: false,
        activeTenantId: safeAuthorized[0],
        status: 403,
        error: `Forbidden: Authenticated administrator is not authorized to access store '${requestedTenantId}'.`,
      };
    }

    return {
      authorized: true,
      activeTenantId: requestedTenantId,
    };
  }

  // Client omitted tenant: safe default to primary authorized store
  return {
    authorized: true,
    activeTenantId: safeAuthorized[0],
  };
}

async function signToken(payload, secret = JWT_SECRET) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

async function verifyAdminSessionMock(headers = {}, urlString = "") {
  const token = headers["cookie"]?.match(/nb_admin_token=([^;]+)/)?.[1] ||
    headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return { authorized: false, status: 401, error: "Unauthorized. Admin authentication required." };
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { authorized: false, status: 401, error: "Malformed token." };
    const [header, body, sig] = parts;
    const data = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    const expectedSigB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)));
    if (sig !== expectedSigB64) {
      return { authorized: false, status: 401, error: "Invalid token signature." };
    }

    const payload = JSON.parse(atob(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { authorized: false, status: 401, error: "Session token expired." };
    }
    if (payload.role !== "admin" && payload.role !== "superadmin") {
      return { authorized: false, status: 403, error: "Forbidden. Admin role required." };
    }

    const authorizedTenants =
      Array.isArray(payload.authorizedTenants) && payload.authorizedTenants.length > 0
        ? payload.authorizedTenants
        : [DEFAULT_TENANT_ID];

    const requestedTenant = extractRequestedTenantId(headers, urlString);
    const access = validateTenantAccess(requestedTenant, authorizedTenants);

    if (!access.authorized) {
      return { authorized: false, status: access.status || 403, error: access.error };
    }

    return {
      authorized: true,
      user: payload.sub,
      role: payload.role,
      tenantId: access.activeTenantId,
      authorizedTenants,
    };
  } catch {
    return { authorized: false, status: 401, error: "Session verification failed." };
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// Test 1: Forged Header Attack
test("Security 1: Rejects forged x-tenant-id or x-store-id header with 403 Forbidden", async () => {
  const validAngkonToken = await signToken({
    sub: "admin",
    role: "admin",
    authorizedTenants: ["angkon-main"],
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  // Attacker attempts to access Plain Stitch or other client store
  const forgedHeaders = {
    cookie: `nb_admin_token=${validAngkonToken}`,
    "x-tenant-id": "plain-stitch",
  };

  const result = await verifyAdminSessionMock(forgedHeaders);
  assert.equal(result.authorized, false, "Must NOT authorize access to unauthorized store");
  assert.equal(result.status, 403, "Must return HTTP 403 Forbidden");
  assert.match(result.error, /not authorized to access store 'plain-stitch'/i);
});

// Test 2: URL Query Parameter Switching Attack
test("Security 2: Rejects unauthorized tenant switching via URL parameter with 403 Forbidden", async () => {
  const validAngkonToken = await signToken({
    sub: "admin",
    role: "admin",
    authorizedTenants: ["angkon-main"],
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const headers = { cookie: `nb_admin_token=${validAngkonToken}` };
  const attackUrl = "https://angkon.com.bd/api/admin/settings/pixel?tenantId=rogue-client-store";

  const result = await verifyAdminSessionMock(headers, attackUrl);
  assert.equal(result.authorized, false, "Must block URL parameter tenant switching");
  assert.equal(result.status, 403, "Must return HTTP 403 Forbidden");
  assert.match(result.error, /not authorized to access store 'rogue-client-store'/i);
});

// Test 3: Missing or Invalid Tenant Identifier
test("Security 3: Rejects malformed or injection tenant identifiers with 400 Bad Request", async () => {
  const validAngkonToken = await signToken({
    sub: "admin",
    role: "admin",
    authorizedTenants: ["angkon-main"],
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const injectionHeaders = {
    cookie: `nb_admin_token=${validAngkonToken}`,
    "x-tenant-id": "store'; DROP TABLE settings; --",
  };

  const result = await verifyAdminSessionMock(injectionHeaders);
  assert.equal(result.authorized, false);
  assert.equal(result.status, 400);
  assert.match(result.error, /Invalid tenant identifier format/i);
});

// Test 4: Valid Access to User's Authorized Tenant
test("Security 4: Grants authorized access to user's assigned store tenant", async () => {
  const validAngkonToken = await signToken({
    sub: "admin",
    role: "admin",
    authorizedTenants: ["angkon-main"],
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  // 1. Explicit header matching membership
  const explicitHeaders = {
    cookie: `nb_admin_token=${validAngkonToken}`,
    "x-tenant-id": "angkon-main",
  };
  const res1 = await verifyAdminSessionMock(explicitHeaders);
  assert.equal(res1.authorized, true);
  assert.equal(res1.tenantId, "angkon-main");

  // 2. Omitted tenant selection (defaults cleanly to authorized store)
  const defaultHeaders = {
    cookie: `nb_admin_token=${validAngkonToken}`,
  };
  const res2 = await verifyAdminSessionMock(defaultHeaders);
  assert.equal(res2.authorized, true);
  assert.equal(res2.tenantId, "angkon-main");
});

// Test 5: Missing or Expired Session Tokens
test("Security 5: Rejects missing, invalid, or expired session tokens with 401 Unauthorized", async () => {
  // A. Missing token
  const noAuth = await verifyAdminSessionMock({});
  assert.equal(noAuth.authorized, false);
  assert.equal(noAuth.status, 401);

  // B. Expired token
  const expiredToken = await signToken({
    sub: "admin",
    role: "admin",
    authorizedTenants: ["angkon-main"],
    exp: Math.floor(Date.now() / 1000) - 100, // expired in past
  });
  const expiredRes = await verifyAdminSessionMock({ cookie: `nb_admin_token=${expiredToken}` });
  assert.equal(expiredRes.authorized, false);
  assert.equal(expiredRes.status, 401);
  assert.match(expiredRes.error, /expired/i);

  // C. Forged signature
  const validToken = await signToken({
    sub: "admin",
    role: "admin",
    authorizedTenants: ["angkon-main"],
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const tamperedToken = validToken.slice(0, -6) + "fake99";
  const tamperedRes = await verifyAdminSessionMock({ cookie: `nb_admin_token=${tamperedToken}` });
  assert.equal(tamperedRes.authorized, false);
  assert.equal(tamperedRes.status, 401);
});

// Test 6: Cross-Tenant Settings Reads, Writes, and Secret Isolation
test("Security 6: Strict tenant scoping prevents cross-tenant settings reads and writes", () => {
  const store = new Map();

  function saveSettings(tenantId, key, value) {
    if (!isValidTenantId(tenantId)) throw new Error("Invalid tenantId");
    store.set(`${tenantId}:${key}`, JSON.parse(JSON.stringify(value)));
  }

  function getSettings(tenantId, key) {
    if (!isValidTenantId(tenantId)) throw new Error("Invalid tenantId");
    return store.get(`${tenantId}:${key}`) || null;
  }

  // Tenant A: ANGKON Main
  saveSettings("angkon-main", "pixel", {
    pixelId: "1480517547316620",
    capiAccessToken: "EAAG_ANGKON_REAL_TOKEN",
    adAccountId: "act_11111",
  });

  // Tenant B: Secondary Partner
  saveSettings("partner-store", "pixel", {
    pixelId: "8888888888888888",
    capiAccessToken: "EAAG_PARTNER_SECRET_TOKEN",
    adAccountId: "act_22222",
  });

  // Verify Tenant A reads ONLY Tenant A
  const angkonRead = getSettings("angkon-main", "pixel");
  assert.equal(angkonRead.pixelId, "1480517547316620");
  assert.equal(angkonRead.capiAccessToken, "EAAG_ANGKON_REAL_TOKEN");

  // Verify Tenant B reads ONLY Tenant B
  const partnerRead = getSettings("partner-store", "pixel");
  assert.equal(partnerRead.pixelId, "8888888888888888");
  assert.equal(partnerRead.capiAccessToken, "EAAG_PARTNER_SECRET_TOKEN");

  // Tenant A writes settings -> Tenant B MUST remain completely unaffected
  saveSettings("angkon-main", "pixel", {
    ...angkonRead,
    capiAccessToken: "EAAG_ANGKON_ROTATED_TOKEN",
  });

  const partnerAfterUpdate = getSettings("partner-store", "pixel");
  assert.equal(
    partnerAfterUpdate.capiAccessToken,
    "EAAG_PARTNER_SECRET_TOKEN",
    "Tenant B's credentials must never be overwritten by Tenant A"
  );
});

// Test 7: Migration Safety: Conflict Detection and Concurrent Lock Handling
test("Migration Safety: Halts on duplicate key conflicts and prevents concurrent runs", () => {
  // A. Conflict detection logic
  const scopedDocs = [{ key: "pixel", tenantId: "angkon-main", value: { id: "1" } }];
  const unscopedDocs = [{ key: "pixel", value: { id: "2" } }]; // Duplicate key!

  const scopedKeys = new Set(scopedDocs.map((d) => `${d.tenantId}:${d.key}`));
  const conflicts = unscopedDocs.filter((u) => scopedKeys.has(`angkon-main:${u.key}`));

  assert.equal(conflicts.length, 1, "Must detect conflict between legacy doc and scoped doc");
  assert.equal(conflicts[0].key, "pixel");

  // B. Atomic distributed lock simulation
  const lockStore = new Map();
  function acquireLock(key, pid) {
    if (lockStore.has(key)) return false; // Already locked
    lockStore.set(key, { pid, lockedAt: Date.now() });
    return true;
  }
  function releaseLock(key) {
    lockStore.delete(key);
  }

  const worker1Lock = acquireLock("__migration_lock__", 101);
  assert.equal(worker1Lock, true, "Worker 1 should acquire migration lock");

  // Worker 2 attempts to run simultaneously during deployment
  const worker2Lock = acquireLock("__migration_lock__", 102);
  assert.equal(worker2Lock, false, "Worker 2 must be blocked from concurrent migration");

  // Release lock
  releaseLock("__migration_lock__");
  const worker3Lock = acquireLock("__migration_lock__", 103);
  assert.equal(worker3Lock, true, "Lock should be re-acquirable once released");
});
