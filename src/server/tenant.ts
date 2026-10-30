import type { NextRequest } from "next/server";

export const DEFAULT_TENANT_ID =
  process.env.PRIMARY_TENANT_ID?.trim() ||
  process.env.TENANT_ID?.trim() ||
  "angkon-main";

/**
 * Validates a tenant identifier string.
 * Must be 2-64 characters composed of alphanumeric characters, hyphens, or underscores.
 */
export function isValidTenantId(tenantId: unknown): boolean {
  if (typeof tenantId !== "string") return false;
  const clean = tenantId.trim();
  return /^[a-zA-Z0-9_-]{2,64}$/.test(clean);
}

/**
 * Extracts a tenant ID requested by the client from headers or query parameters.
 * Note: This does NOT grant authorization. The returned tenant MUST be validated
 * against the authenticated user's authorized store membership before use.
 */
export function extractRequestedTenantId(
  request?: NextRequest | Request | null
): string | null {
  if (!request) return null;

  try {
    // 1. Check client request headers (x-tenant-id or x-store-id)
    const headerTenant =
      request.headers.get("x-tenant-id") ||
      request.headers.get("x-store-id");
    if (headerTenant && isValidTenantId(headerTenant)) {
      return headerTenant.trim();
    }

    // 2. Check URL search parameters
    if ("nextUrl" in request && request.nextUrl?.searchParams) {
      const qTenant = request.nextUrl.searchParams.get("tenantId");
      if (qTenant && isValidTenantId(qTenant)) {
        return qTenant.trim();
      }
    } else if (typeof (request as Request).url === "string") {
      const url = new URL((request as Request).url);
      const qTenant = url.searchParams.get("tenantId");
      if (qTenant && isValidTenantId(qTenant)) {
        return qTenant.trim();
      }
    }
  } catch {
    // Ignore URL parsing errors
  }

  return null;
}

export interface TenantAccessValidation {
  authorized: boolean;
  activeTenantId: string;
  error?: string;
}

/**
 * Validates whether the requested tenant ID is permitted for the authenticated user's
 * authorized store memberships.
 *
 * Rules:
 * 1. If the client explicitly requested a tenant:
 *    - The requested tenant MUST be present in authorizedTenants.
 *    - If NOT present -> Access is DENIED (HTTP 403 Forbidden). Never falls back to default.
 * 2. If the client omitted tenant selection:
 *    - Safely defaults to the user's primary authorized store.
 */
export function validateTenantAccess(
  requestedTenantId: string | null,
  authorizedTenants: string[] = [DEFAULT_TENANT_ID]
): TenantAccessValidation {
  const safeAuthorized = Array.isArray(authorizedTenants) && authorizedTenants.length > 0
    ? authorizedTenants
    : [DEFAULT_TENANT_ID];

  // Client explicitly requested a tenant
  if (requestedTenantId) {
    if (!isValidTenantId(requestedTenantId)) {
      return {
        authorized: false,
        activeTenantId: safeAuthorized[0],
        error: `Invalid tenant identifier format: '${requestedTenantId}'.`,
      };
    }

    const isMember = safeAuthorized.includes(requestedTenantId);
    if (!isMember) {
      return {
        authorized: false,
        activeTenantId: safeAuthorized[0],
        error: `Forbidden: Authenticated administrator is not authorized to access store '${requestedTenantId}'.`,
      };
    }

    return {
      authorized: true,
      activeTenantId: requestedTenantId,
    };
  }

  // Client omitted tenant selection: select primary authorized store
  return {
    authorized: true,
    activeTenantId: safeAuthorized[0],
  };
}
