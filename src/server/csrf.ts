import type { NextRequest } from "next/server";

/**
 * CSRF / cross-origin guard for browser-originated state-changing requests.
 *
 * Cookies are already `HttpOnly` + `SameSite=Lax`, which blocks a cross-site
 * form POST from carrying the session. This adds defence in depth:
 *
 *   1. `Sec-Fetch-Site: cross-site` is rejected outright.
 *   2. When the browser sends `Origin`/`Referer`, its host must match the
 *      request `Host` (or an entry in `CSRF_TRUSTED_ORIGINS`).
 *   3. Requests without either header are allowed, because that is how
 *      server-to-server callers (SSLCOMMERZ IPN, courier webhooks, cron, CLI)
 *      behave. Those endpoints authenticate by signature/secret instead.
 */

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutatingMethod(method: string): boolean {
  return MUTATION_METHODS.has(String(method || "").toUpperCase());
}

function normalizeHost(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).host.toLowerCase();
  } catch {
    return trimmed;
  }
}

function trustedOrigins(): string[] {
  return (process.env.CSRF_TRUSTED_ORIGINS || "")
    .split(",")
    .map((entry) => normalizeHost(entry))
    .filter(Boolean);
}

/**
 * Returns true when a mutating request may proceed.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite.toLowerCase() === "cross-site") {
    return false;
  }

  const candidate = request.headers.get("origin") || request.headers.get("referer");
  if (!candidate) {
    // Non-browser caller. Signature/secret validation is the gate for these.
    return true;
  }

  const candidateHost = normalizeHost(candidate);
  if (!candidateHost) return false;

  const requestHost = normalizeHost(request.headers.get("host") || request.nextUrl.host);
  if (requestHost && candidateHost === requestHost) return true;

  return trustedOrigins().includes(candidateHost);
}

/**
 * Paths that need the origin guard when the method is mutating. Webhook and
 * IPN paths are deliberately excluded — they are server-to-server.
 */
const CSRF_PROTECTED_PATTERNS: RegExp[] = [
  /^\/api\/admin\//,
  /^\/api\/auth\//,
  /^\/api\/orders$/,
  /^\/api\/promo\/validate$/,
  /^\/api\/payment\/sslcommerz\/initiate$/,
  /^\/api\/payments\/sslcommerz\/initiate$/,
  /^\/api\/payments\/[^/]+\/retry$/,
  /^\/api\/payments\/[^/]+\/refund$/,
  /^\/api\/payments\/[^/]+\/reconcile$/,
  /^\/api\/payments\/[^/]+\/note$/,
  /^\/api\/payments\/reconcile$/,
  /^\/api\/pixel\/events$/,
];

export function needsCsrfProtection(pathname: string, method: string): boolean {
  if (!isMutatingMethod(method)) return false;
  return CSRF_PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));
}
