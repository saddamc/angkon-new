import { NextRequest, NextResponse } from "next/server";
import nodeCrypto from "crypto";
import {
  extractRequestedTenantId,
  validateTenantAccess,
  DEFAULT_TENANT_ID,
} from "./tenant";

const JWT_SECRET = process.env.JWT_SECRET || "angkon_secure_jwt_secret_2026";

/** Constant-time string comparison to prevent timing side-channel attacks */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return nodeCrypto.timingSafeEqual(bufA, bufB);
}

/**
 * Checks whether the Meta Marketing Suite is administratively enabled.
 * Server-only evaluation: enabled by default for authorized store admins,
 * but can be explicitly disabled via private server environment variables.
 */
export function isMetaSuiteEnabled(): boolean {
  if (process.env.DISABLE_META_SUITE === "true") return false;
  if (process.env.ENABLE_META_SUITE === "false") return false;
  if (process.env.NEXT_PUBLIC_DISABLE_META_ROUTES === "true") return false;
  return true;
}

export interface VerifiedAdminToken {
  valid: boolean;
  user?: string;
  role?: string;
  authorizedTenants?: string[];
  defaultTenant?: string;
}

/**
 * Verifies an admin HMAC-SHA256 JWT token.
 * Extracts user identity, admin role, and authorized store tenant memberships.
 */
export async function verifyAdminToken(
  token?: string | null
): Promise<VerifiedAdminToken> {
  if (!token || typeof token !== "string") {
    return { valid: false };
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false };
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

    if (!timingSafeEqualStr(sig, expectedSigB64)) {
      return { valid: false };
    }

    const payload = JSON.parse(atob(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }
    if (payload.role !== "admin" && payload.role !== "superadmin") {
      return { valid: false };
    }

    // Extract authorized store memberships (strictly defaulting to primary store if omitted)
    const authorizedTenants =
      Array.isArray(payload.authorizedTenants) && payload.authorizedTenants.length > 0
        ? payload.authorizedTenants
        : [DEFAULT_TENANT_ID];

    return {
      valid: true,
      user: typeof payload.sub === "string" ? payload.sub : undefined,
      role: typeof payload.role === "string" ? payload.role : "admin",
      authorizedTenants,
      defaultTenant: typeof payload.defaultTenant === "string" ? payload.defaultTenant : authorizedTenants[0],
    };
  } catch {
    return { valid: false };
  }
}

export interface AdminSessionAuthResult {
  authorized: boolean;
  user?: string;
  role?: string;
  tenantId: string;
  authorizedTenants: string[];
  response?: NextResponse;
}

/**
 * Server-side guard requiring a valid administrator session AND verified tenant membership.
 *
 * Security guarantees:
 * 1. Missing or invalid session -> HTTP 401 Unauthorized.
 * 2. Client requesting an unauthorized store (e.g. forged header or query param) -> HTTP 403 Forbidden.
 * 3. Never silently falls back or allows unverified cross-tenant data access.
 */
export async function requireAdminSession(
  request: NextRequest | Request
): Promise<AdminSessionAuthResult> {
  // 1. Feature Flag Check
  if (!isMetaSuiteEnabled()) {
    return {
      authorized: false,
      tenantId: DEFAULT_TENANT_ID,
      authorizedTenants: [DEFAULT_TENANT_ID],
      response: NextResponse.json(
        { error: "Meta Marketing Suite is disabled in this environment." },
        { status: 403 }
      ),
    };
  }

  // 2. Token Extraction from HttpOnly Cookie or Authorization Header
  let token: string | undefined;

  if ("cookies" in request && typeof request.cookies?.get === "function") {
    token = request.cookies.get("nb_admin_token")?.value;
  }

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/nb_admin_token=([^;]+)/);
        if (match) token = match[1];
      }
    }
  }

  const tokenVerification = await verifyAdminToken(token);

  if (!tokenVerification.valid) {
    return {
      authorized: false,
      tenantId: DEFAULT_TENANT_ID,
      authorizedTenants: [DEFAULT_TENANT_ID],
      response: NextResponse.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      ),
    };
  }

  // 3. Mandatory Tenant Authorization Check
  const authorizedTenants = tokenVerification.authorizedTenants || [DEFAULT_TENANT_ID];
  const requestedTenant = extractRequestedTenantId(request);

  const tenantValidation = validateTenantAccess(requestedTenant, authorizedTenants);

  if (!tenantValidation.authorized) {
    return {
      authorized: false,
      tenantId: tenantValidation.activeTenantId,
      authorizedTenants,
      response: NextResponse.json(
        { error: tenantValidation.error || "Forbidden: Store authorization denied." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: tokenVerification.user,
    role: tokenVerification.role,
    tenantId: tenantValidation.activeTenantId,
    authorizedTenants,
  };
}

/**
 * Server-side guard requiring a valid super administrator session AND verified tenant membership.
 * Standard "admin" role will receive a 403 Forbidden.
 */
export async function requireSuperAdminSession(
  request: NextRequest | Request
): Promise<AdminSessionAuthResult> {
  const result = await requireAdminSession(request);
  if (!result.authorized) {
    return result;
  }
  if (result.role !== "superadmin") {
    return {
      authorized: false,
      tenantId: result.tenantId,
      authorizedTenants: result.authorizedTenants,
      response: NextResponse.json(
        { error: "Forbidden: Super Administrator privileges required." },
        { status: 403 }
      ),
    };
  }
  return result;
}
