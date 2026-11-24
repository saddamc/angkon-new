import { isIP } from "node:net";
import type { NextRequest } from "next/server";

// Cloudflare official IPv4 ranges (https://www.cloudflare.com/ips-v4)
const CLOUDFLARE_IPV4_CIDRS = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
].map((cidr) => {
  const [base, prefix] = cidr.split("/");
  const p = parseInt(prefix, 10);
  const parts = base.split(".").map(Number);
  const num = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const mask = p === 0 ? 0 : (~((1 << (32 - p)) - 1)) >>> 0;
  return { base: num, mask };
});

// Cloudflare official IPv6 prefixes (https://www.cloudflare.com/ips-v6)
const CLOUDFLARE_IPV6_PREFIXES = [
  "2400:cb00:",
  "2606:4700:",
  "2803:f800:",
  "2405:b500:",
  "2405:8100:",
  "2a06:98c0:",
  "2c0f:f248:",
];

/**
 * Validates whether a given string is a valid IPv4 or IPv6 address.
 */
export function isValidIp(ip: string | null | undefined): boolean {
  if (!ip || typeof ip !== "string") return false;
  const trimmed = ip.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return false;
  return isIP(trimmed) !== 0;
}

/**
 * Checks if an IP is loopback (127.0.0.1, ::1, 0.0.0.0, localhost).
 */
export function isLoopbackIp(ip: string | null | undefined): boolean {
  if (!ip || typeof ip !== "string") return true;
  const trimmed = ip.trim().toLowerCase();
  return (
    trimmed === "127.0.0.1" ||
    trimmed === "::1" ||
    trimmed === "0.0.0.0" ||
    trimmed === "localhost" ||
    trimmed.startsWith("127.") ||
    trimmed === "::ffff:127.0.0.1"
  );
}

/**
 * Checks if an IP address belongs to private or link-local ranges:
 * - 10.0.0.0/8
 * - 172.16.0.0/12 (includes Docker internal bridges e.g. 172.17.x.x, 172.18.x.x)
 * - 192.168.0.0/16
 * - 169.254.0.0/16 (Link Local)
 * - fc00::/7 (IPv6 Unique Local)
 * - fe80::/10 (IPv6 Link Local)
 */
export function isPrivateIp(ip: string | null | undefined): boolean {
  if (!isValidIp(ip)) return false;
  const trimmed = (ip as string).trim();

  // IPv4 checks
  if (isIP(trimmed) === 4) {
    const parts = trimmed.split(".").map((p) => parseInt(p, 10));
    if (parts.length === 4) {
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
      if (parts[0] === 169 && parts[1] === 254) return true;
    }
    return false;
  }

  // IPv6 checks
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7
  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return true; // fe80::/10
  }

  return false;
}

/**
 * Checks if an IP address is a genuine public internet IP address.
 */
export function isPublicIp(ip: string | null | undefined): boolean {
  return isValidIp(ip) && !isLoopbackIp(ip) && !isPrivateIp(ip);
}

/**
 * Checks if an IP address belongs to Cloudflare's published edge network CIDRs.
 */
export function isCloudflareIp(ip: string | null | undefined): boolean {
  if (!isValidIp(ip)) return false;
  const trimmed = (ip as string).trim();

  if (isIP(trimmed) === 4) {
    const parts = trimmed.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) return false;
    const num = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    return CLOUDFLARE_IPV4_CIDRS.some((c) => (num & c.mask) === (c.base & c.mask));
  }

  const lower = trimmed.toLowerCase();
  return CLOUDFLARE_IPV6_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Safely sanitizes and validates an IP address string.
 * Rejects "unknown", empty, loopback, or invalid IP representations.
 */
export function sanitizeClientIp(ip: string | null | undefined): string | undefined {
  if (!ip || typeof ip !== "string") return undefined;
  const trimmed = ip.trim();
  if (!isValidIp(trimmed) || isLoopbackIp(trimmed)) {
    return undefined;
  }
  return trimmed;
}

/**
 * Extracts a single header value safely from Request, NextRequest, or plain object.
 */
function getHeaderValue(
  request: unknown,
  name: string
): string | null {
  if (!request || typeof request !== "object") return null;

  if ("headers" in request && (request as { headers: unknown }).headers) {
    const h = (request as { headers: unknown }).headers;
    if (typeof (h as Headers).get === "function") {
      return (h as Headers).get(name);
    }
    const raw =
      (h as Record<string, string | string[] | undefined>)[name.toLowerCase()] ??
      (h as Record<string, string | string[] | undefined>)[name];
    if (Array.isArray(raw)) return raw[0] || null;
    if (typeof raw === "string") return raw;
  }
  return null;
}

/**
 * Canonical client-IP resolver for ANGKON / Nexcraftly.
 *
 * Security & Trust Model:
 * 1. Cloudflare:
 *    - Trusts `CF-Connecting-IP` when `TRUST_CLOUDFLARE_IP_HEADER=true`, OR when
 *      verified Cloudflare infrastructure headers are present (`CF-Ray`) and the upstream
 *      reverse-proxy peer IP (e.g. from Traefik) matches Cloudflare's published IP ranges.
 * 2. Coolify Reverse-Proxy Chain (Non-Cloudflare temporary or direct domains):
 *    - Uses the client address established by the verified Coolify reverse-proxy chain.
 *    - Traefik records the true incoming TCP peer address in `X-Real-IP` and appends it
 *      to the end of `X-Forwarded-For`.
 *    - Traverses `X-Forwarded-For` from RIGHT to LEFT to defeat client-forged headers,
 *      filtering out internal proxy hops (Docker bridge networks 172.16.0.0/12, loopback).
 * 3. Never blindly trusts arbitrary client-supplied `X-Forwarded-For` headers.
 * 4. Fails safe: Returns `"unknown"` if no valid, non-malformed IP can be verified.
 */
export function clientIp(
  request:
    | Request
    | NextRequest
    | { headers?: Headers | Record<string, string | string[] | undefined>; ip?: string }
    | null
    | undefined
): string {
  if (!request) return "unknown";

  const trustProxy =
    process.env.TRUST_PROXY_HEADERS?.trim().toLowerCase() !== "false";

  if (!trustProxy) {
    // If reverse proxy headers are explicitly untrusted, only use NextRequest.ip socket address if valid
    if ("ip" in request && typeof request.ip === "string" && isValidIp(request.ip)) {
      return request.ip.trim();
    }
    return "unknown";
  }

  const explicitTrustCloudflare =
    process.env.TRUST_CLOUDFLARE_IP_HEADER?.trim().toLowerCase() === "true";

  const cfIp = getHeaderValue(request, "cf-connecting-ip");
  const cfRay = getHeaderValue(request, "cf-ray");
  const realIp = getHeaderValue(request, "x-real-ip");
  const forwardedFor = getHeaderValue(request, "x-forwarded-for");

  // Parse X-Forwarded-For from right to left
  const forwardedHops = forwardedFor
    ? forwardedFor
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && isValidIp(s))
    : [];

  // Determine the upstream peer that connected to Coolify/Traefik
  // In Traefik, x-real-ip is the immediate connecting client/proxy IP.
  // In the forwarded chain, the rightmost hop is the peer that connected to the nearest proxy.
  const nearestPeer =
    (realIp && isValidIp(realIp) ? realIp.trim() : null) ||
    (forwardedHops.length > 0 ? forwardedHops[forwardedHops.length - 1] : null);

  // Check if request passed through authentic Cloudflare infrastructure:
  // Either explicit TRUST_CLOUDFLARE_IP_HEADER=true, or CF-Ray present + nearest peer is Cloudflare IP,
  // or CF-Connecting-IP present + valid CF-Ray pattern + peer verified.
  const hasValidCfRay = Boolean(cfRay && /^[a-f0-9]{16}-[a-z]{3,4}$/i.test(cfRay.trim()));
  const peerIsCloudflare = nearestPeer ? isCloudflareIp(nearestPeer) : false;

  const isTrustedCloudflareRequest =
    Boolean(cfIp && isValidIp(cfIp)) &&
    (explicitTrustCloudflare || (hasValidCfRay && (peerIsCloudflare || isPublicIp(cfIp))));

  if (isTrustedCloudflareRequest && cfIp && isValidIp(cfIp)) {
    return cfIp.trim();
  }

  // Coolify reverse-proxy chain for non-Cloudflare domains:
  // Look for the client IP established by Traefik.
  // Traefik sets X-Real-IP to the connecting client.
  if (realIp && isValidIp(realIp) && !isLoopbackIp(realIp)) {
    // If realIp is a public IP, or a valid non-internal client, trust Traefik's verified assignment
    if (isPublicIp(realIp) || !isPrivateIp(realIp)) {
      return realIp.trim();
    }
  }

  // Inspect X-Forwarded-For right-to-left (the nearest proxy appended the rightmost hop)
  for (let i = forwardedHops.length - 1; i >= 0; i--) {
    const hop = forwardedHops[i];
    // Ignore internal Docker network hops (e.g. Traefik to container on 172.18.x.x)
    if (!isLoopbackIp(hop) && !isPrivateIp(hop)) {
      return hop;
    }
  }

  // Fallback: If no public IP was found (e.g. local staging or test runner with private IPs)
  if (realIp && isValidIp(realIp) && !isLoopbackIp(realIp)) {
    return realIp.trim();
  }
  for (let i = forwardedHops.length - 1; i >= 0; i--) {
    const hop = forwardedHops[i];
    if (!isLoopbackIp(hop)) {
      return hop;
    }
  }

  // NextRequest built-in socket IP fallback
  if ("ip" in request && typeof request.ip === "string" && isValidIp(request.ip)) {
    return request.ip.trim();
  }

  return "unknown";
}

/**
 * Alias of clientIp with undefined return type for Meta CAPI and optional callers.
 */
export function extractClientIp(
  request:
    | Request
    | NextRequest
    | { headers?: Headers | Record<string, string | string[] | undefined>; ip?: string }
    | null
    | undefined
): string | undefined {
  const ip = clientIp(request);
  return ip !== "unknown" ? ip : undefined;
}
