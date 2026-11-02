import { isIP } from "node:net";
import type { NextRequest } from "next/server";

/**
 * Validates whether a given string is a valid IPv4 or IPv6 address.
 */
export function isValidIp(ip: string | null | undefined): boolean {
  if (!ip || typeof ip !== "string") return false;
  const trimmed = ip.trim();
  if (!trimmed || trimmed === "unknown") return false;
  return isIP(trimmed) !== 0;
}

/**
 * Checks if an IP is loopback (127.0.0.1, ::1, 0.0.0.0).
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
 * - 172.16.0.0/12
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
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
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
 * Robustly extracts the client IP address from request headers or NextRequest objects.
 * Prioritizes trusted CDN and reverse proxy headers (Cloudflare, Akamai, Nginx),
 * and parses comma-separated X-Forwarded-For chains from left to right (client-first).
 */
export function extractClientIp(
  request:
    | Request
    | NextRequest
    | { headers?: Headers | Record<string, string | string[] | undefined>; ip?: string }
    | null
    | undefined
): string | undefined {
  if (!request) return undefined;

  const getHeader = (name: string): string | null => {
    if (!request) return null;
    if ("headers" in request && request.headers) {
      if (typeof (request.headers as Headers).get === "function") {
        return (request.headers as Headers).get(name);
      }
      const raw = (request.headers as Record<string, string | string[] | undefined>)[name];
      if (Array.isArray(raw)) return raw[0] || null;
      if (typeof raw === "string") return raw;
    }
    return null;
  };

  // 1. Cloudflare True Visitor IP (most trusted when deployed behind Cloudflare)
  const cfIp = getHeader("cf-connecting-ip");
  if (cfIp) {
    const sanitized = sanitizeClientIp(cfIp);
    if (sanitized) return sanitized;
  }

  // 2. Akamai / Cloudflare Enterprise True Client IP
  const trueClientIp = getHeader("true-client-ip");
  if (trueClientIp) {
    const sanitized = sanitizeClientIp(trueClientIp);
    if (sanitized) return sanitized;
  }

  // 3. Nginx / Dedicated Proxy Real IP
  const realIp = getHeader("x-real-ip");
  if (realIp) {
    const sanitized = sanitizeClientIp(realIp);
    if (sanitized) return sanitized;
  }

  // 4. Standard X-Client-IP
  const xClientIp = getHeader("x-client-ip");
  if (xClientIp) {
    const sanitized = sanitizeClientIp(xClientIp);
    if (sanitized) return sanitized;
  }

  // 5. Fastly / Akamai Edge IP
  const fastlyIp = getHeader("fastly-client-ip");
  if (fastlyIp) {
    const sanitized = sanitizeClientIp(fastlyIp);
    if (sanitized) return sanitized;
  }

  // 6. X-Forwarded-For chain: client, proxy1, proxy2...
  // Parse from left to right (leftmost is original client)
  const forwardedFor = getHeader("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((s) => s.trim()).filter(Boolean);

    // First pass: find the leftmost public IP
    for (const rawIp of ips) {
      if (isPublicIp(rawIp)) {
        return rawIp;
      }
    }

    // Second pass: if no public IP (e.g. local staging or test proxy), find first valid non-loopback IP
    for (const rawIp of ips) {
      const sanitized = sanitizeClientIp(rawIp);
      if (sanitized) return sanitized;
    }
  }

  // 7. NextRequest built-in .ip property if available
  if ("ip" in request && typeof request.ip === "string") {
    const sanitized = sanitizeClientIp(request.ip);
    if (sanitized) return sanitized;
  }

  return undefined;
}
