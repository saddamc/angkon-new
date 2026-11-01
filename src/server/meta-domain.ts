import { promises as dns } from "dns";

/**
 * ANGKON Canonical Domain Verification Module
 * Enforces production root domain "angkon.net", Namecheap DNS TXT query, and Meta Business Manager ownership.
 */

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
 * Prevents incorrect subdomains (e.g. www.angkon.net) from being used for apex DNS lookups.
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
 * Strict validator: asserts domain matches authorized ANGKON domains.
 */
export function isAuthorizedAngkonDomain(domain: string): boolean {
  const normalized = normalizeRootDomain(domain);
  return normalized === CANONICAL_ROOT_DOMAIN;
}

export interface DnsVerificationResult {
  status: "DETECTED" | "NOT_FOUND" | "ERROR";
  domain: string;
  expectedToken: string;
  matchedRecord?: string;
  allTxtRecords: string[];
  recordsExamined: number;
  nameservers: string[];
  details: string;
  error?: string;
}

/**
 * Verifies the DNS TXT record for Meta Domain Verification.
 * Strictly queries the apex root domain (angkon.net), never www.angkon.net.
 * Safely handles multiple TXT records (SPF, etc.), concatenated chunks, and DNS timeouts.
 */
export async function verifyDnsTxtRecord(
  domainInput: string,
  expectedToken: string,
  options: { timeoutMs?: number; customResolverServers?: string[] } = {}
): Promise<DnsVerificationResult> {
  const rootDomain = normalizeRootDomain(domainInput);
  const token = expectedToken.trim();
  const timeoutMs = options.timeoutMs ?? 6000;
  const expectedPrefix = "facebook-domain-verification=";
  const fullExpected = `${expectedPrefix}${token}`;

  const result: DnsVerificationResult = {
    status: "NOT_FOUND",
    domain: rootDomain,
    expectedToken: token,
    allTxtRecords: [],
    recordsExamined: 0,
    nameservers: CANONICAL_NAMESERVERS,
    details: "",
  };

  if (!token) {
    result.status = "NOT_FOUND";
    result.details = "No Meta Domain Verification token provided for verification.";
    return result;
  }

  // Reject unauthorized / forged target domains
  if (!isAuthorizedAngkonDomain(rootDomain)) {
    result.status = "ERROR";
    result.error = `Rejected unauthorized target domain: '${rootDomain}'. Only '${CANONICAL_ROOT_DOMAIN}' is authorized for ANGKON domain verification.`;
    result.details = result.error;
    return result;
  }

  // DNS query executor with timeout
  const executeQuery = async (resolveFn: () => Promise<string[][]>): Promise<string[][]> => {
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`DNS lookup timed out after ${timeoutMs}ms for ${rootDomain}`);
        err.name = "TimeoutError";
        reject(err);
      }, timeoutMs);
    });

    try {
      return await Promise.race([resolveFn(), timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  let rawTxtRecords: string[][] = [];
  let queryError: Error | null = null;

  // 1. Try system default resolver
  try {
    rawTxtRecords = await executeQuery(() => dns.resolveTxt(rootDomain));
  } catch (err) {
    queryError = err instanceof Error ? err : new Error(String(err));
  }

  // 2. If system resolver failed or returned 0 records, fallback to public resolvers (8.8.8.8 / 1.1.1.1)
  if ((!rawTxtRecords || rawTxtRecords.length === 0) && options.customResolverServers !== null) {
    try {
      const fallbackResolver = new dns.Resolver();
      fallbackResolver.setServers(options.customResolverServers || PUBLIC_FALLBACK_RESOLVERS);
      rawTxtRecords = await executeQuery(() => fallbackResolver.resolveTxt(rootDomain));
      queryError = null; // Successfully retrieved via public fallback
    } catch (fallbackErr) {
      if (!queryError) {
        queryError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
      }
    }
  }

  if (queryError) {
    result.status = "ERROR";
    result.error = queryError.message;
    result.details = `DNS lookup on ${rootDomain} failed: ${queryError.message}`;
    return result;
  }

  result.recordsExamined = rawTxtRecords.length;

  // Flatten and normalize multiple TXT records (join chunks per record)
  const flattenedRecords: string[] = rawTxtRecords.map((chunks) =>
    Array.isArray(chunks) ? chunks.join("").trim() : String(chunks).trim()
  );
  result.allTxtRecords = flattenedRecords;

  // Find exact match or token match
  const matched = flattenedRecords.find((rec) => {
    if (rec === fullExpected) return true;
    if (rec.startsWith(expectedPrefix)) {
      const foundToken = rec.substring(expectedPrefix.length).trim();
      return foundToken === token;
    }
    return false;
  });

  if (matched) {
    result.status = "DETECTED";
    result.matchedRecord = matched;
    result.details = `DNS TXT record verified on ${rootDomain}: "${matched}" (Examined ${result.recordsExamined} TXT records including SPF).`;
  } else {
    // Check if a facebook-domain-verification TXT record exists with a DIFFERENT token
    const otherTokenMatch = flattenedRecords.find((rec) => rec.startsWith(expectedPrefix));
    if (otherTokenMatch) {
      result.status = "NOT_FOUND";
      result.matchedRecord = otherTokenMatch;
      result.details = `DNS TXT record found on ${rootDomain}, but token does not match stored token. Found: "${otherTokenMatch}", Expected: "${fullExpected}".`;
    } else {
      result.status = "NOT_FOUND";
      result.details = `Examined ${result.recordsExamined} TXT records on ${rootDomain}. No facebook-domain-verification record found.`;
    }
  }

  return result;
}

export interface HtmlVerificationResult {
  status: "DETECTED" | "NOT_FOUND" | "NOT_CHECKED" | "ERROR";
  url: string;
  expectedToken: string;
  detectedToken?: string;
  details: string;
  error?: string;
}

/**
 * Checks the storefront HTML <head> for <meta name="facebook-domain-verification" content="..." />
 * Queries CANONICAL_SITE_URL directly with timeout.
 */
export async function verifyHtmlMetaTag(
  siteUrlInput: string,
  expectedToken: string,
  options: { timeoutMs?: number } = {}
): Promise<HtmlVerificationResult> {
  const token = expectedToken.trim();
  const timeoutMs = options.timeoutMs ?? 6000;
  const targetUrl = CANONICAL_SITE_URL;

  const result: HtmlVerificationResult = {
    status: "NOT_FOUND",
    url: targetUrl,
    expectedToken: token,
    details: "",
  };

  if (!token) {
    result.status = "NOT_CHECKED";
    result.details = "No Meta Domain Verification token configured.";
    return result;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "ANGKON-Domain-Verification-Agent/1.0 (+https://angkon.net)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      result.status = "ERROR";
      result.error = `HTTP ${response.status}`;
      result.details = `Storefront returned HTTP ${response.status} when requesting root document.`;
      return result;
    }

    const html = await response.text();
    const match =
      html.match(/<meta[^>]+name=["']facebook-domain-verification["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']facebook-domain-verification["']/i);

    if (match && match[1]) {
      const detected = match[1].trim();
      result.detectedToken = detected;
      if (detected === token) {
        result.status = "DETECTED";
        result.details = `Meta tag verified: <meta name="facebook-domain-verification" content="${token}" /> is active in <head>.`;
      } else {
        result.status = "NOT_FOUND";
        result.details = `Meta tag found in <head> but token does not match. Found "${detected}", expected "${token}".`;
      }
    } else {
      result.status = "NOT_FOUND";
      result.details = "No facebook-domain-verification meta tag found in root HTML response.";
    }
  } catch (err) {
    result.status = "ERROR";
    const msg = err instanceof Error ? err.message : String(err);
    result.error = msg;
    result.details = `Could not fetch storefront HTML: ${msg}`;
  } finally {
    clearTimeout(timer);
  }

  return result;
}
