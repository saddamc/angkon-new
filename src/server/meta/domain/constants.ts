import crypto from "crypto";
import type {
  MetaDomainLifecycleState,
  DnsStatusType,
  HtmlStatusType,
} from "@/models/MetaDomain";

export const CANONICAL_ROOT_DOMAIN = "angkon.net";
export const CANONICAL_SITE_URL = "https://angkon.net";
export const CANONICAL_NAMESERVERS = [
  "dns1.registrar-servers.com",
  "dns2.registrar-servers.com",
];

export const PUBLIC_FALLBACK_RESOLVERS = ["8.8.8.8", "1.1.1.1"];

/**
 * Normalizes any domain input to the pure root domain.
 * Strips protocol, port, path, and leading 'www.'.
 */
export function normalizeRootDomain(input?: string | null): string {
  if (!input || typeof input !== "string") {
    return CANONICAL_ROOT_DOMAIN;
  }

  let cleaned = input.trim().toLowerCase();

  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, "");

  // Strip path and query
  cleaned = cleaned.split("/")[0].split("?")[0];

  // Strip port
  cleaned = cleaned.split(":")[0];

  // Strip leading www.
  cleaned = cleaned.replace(/^www\./, "");

  // If input was localhost or empty or completely invalid, fallback to canonical root domain
  if (!cleaned || cleaned === "localhost" || cleaned === "127.0.0.1" || !cleaned.includes(".")) {
    return CANONICAL_ROOT_DOMAIN;
  }

  return cleaned;
}

/**
 * SSRF & Abuse Prevention:
 * Validates that domain is a safe, valid public FQDN and NOT an internal IP, loopback, or cloud metadata address.
 */
export function isSafePublicDomain(domainInput: string): { valid: boolean; reason?: string; domain?: string } {
  if (!domainInput || typeof domainInput !== "string") {
    return { valid: false, reason: "Domain cannot be empty" };
  }

  const raw = domainInput.trim().toLowerCase();

  // Check for CRLF injection or URI scheme injection
  if (/[\r\n\0\t\s]/.test(raw) || raw.includes("://") || raw.includes("@")) {
    return { valid: false, reason: "Domain contains illegal characters or protocol specifiers" };
  }

  const normalized = normalizeRootDomain(raw);

  // Reject IP literals (IPv4 and IPv6)
  if (
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(normalized) ||
    /^[0-9a-f:]+$/i.test(normalized) ||
    normalized.includes(":")
  ) {
    return { valid: false, reason: "Direct IP addresses are forbidden. Enter a valid domain name." };
  }

  // Reject local and internal TLDs
  const forbiddenSuffixes = [
    ".local",
    ".localhost",
    ".internal",
    ".lan",
    ".home",
    ".corp",
    ".arpa",
    ".invalid",
    ".test",
    ".onion",
  ];
  if (forbiddenSuffixes.some((sfx) => normalized.endsWith(sfx)) || normalized === "localhost") {
    return { valid: false, reason: "Internal, local, and reserved network domains are forbidden." };
  }

  // Strict hostname format check (RFC 1123)
  const fqdnRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  if (!fqdnRegex.test(normalized)) {
    return { valid: false, reason: "Invalid domain syntax. Must be a valid public FQDN (e.g. yourdomain.com)" };
  }

  return { valid: true, domain: normalized };
}

/**
 * Generates a high-entropy 30-character lowercase alphanumeric verification token
 * conforming to Meta Business Manager domain verification token format.
 */
export function generateMetaDomainToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(30);
  let token = "";
  for (let i = 0; i < 30; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

/**
 * Calculates the explicit lifecycle state according to Stage 2C rules:
 * - NEEDS_VERIFICATION: Token created, no verification detected.
 * - DNS_DETECTED: DNS TXT record found on public DNS, but Meta ownership not yet recorded.
 * - PENDING_META: Method verified, awaiting confirmation in Meta Business Manager.
 * - VERIFIED: Method verified AND Meta Business Manager ownership confirmed.
 * - DNS_MISMATCH: DNS TXT record found on domain, but token does not match expected token.
 * - FAILED: DNS check failed, or Meta ownership was confirmed but DNS record has been removed.
 */
export function calculateLifecycleState(params: {
  dnsStatus: DnsStatusType;
  htmlStatus: HtmlStatusType;
  metaOwnershipVerified: boolean;
  isMismatch: boolean;
  isTimeoutOrNetworkError?: boolean;
}): MetaDomainLifecycleState {
  const { dnsStatus, htmlStatus, metaOwnershipVerified, isMismatch, isTimeoutOrNetworkError } = params;

  if (isMismatch) {
    return "DNS_MISMATCH";
  }

  const isMethodVerified = dnsStatus === "DETECTED" || htmlStatus === "DETECTED";

  if (metaOwnershipVerified && isMethodVerified) {
    return "VERIFIED";
  }

  // Phase 7: Do not mark a previously verified domain unverified because of a temporary DNS timeout
  if (metaOwnershipVerified && isTimeoutOrNetworkError) {
    return "VERIFIED";
  }

  if (metaOwnershipVerified && !isMethodVerified) {
    // Regression detected: ownership was confirmed earlier, but DNS record has now disappeared
    return "FAILED";
  }

  if (dnsStatus === "DETECTED") {
    return "DNS_DETECTED";
  }

  if (htmlStatus === "DETECTED") {
    return "PENDING_META";
  }

  if (dnsStatus === "ERROR" || htmlStatus === "ERROR") {
    return "FAILED";
  }

  return "NEEDS_VERIFICATION";
}
