/* eslint-disable @typescript-eslint/no-explicit-any */

import { promises as dns } from "dns";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import {
  MetaDomain,
  IMetaDomain,
  MetaDomainLifecycleState,
  DnsStatusType,
  HtmlStatusType,
} from "@/models/MetaDomain";
import { MetaDomainAuditLog } from "@/models/MetaDomainAuditLog";
import { getPixelSettings, savePixelSettings } from "./pixel-settings";

/**
 * ANGKON Production Hardened Domain Verification Module — Stage 2C
 * Handles multi-domain management, append-only verification history,
 * SSRF protection, scheduled monitoring, and independent lifecycle states.
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
}): MetaDomainLifecycleState {
  const { dnsStatus, htmlStatus, metaOwnershipVerified, isMismatch } = params;

  if (isMismatch) {
    return "DNS_MISMATCH";
  }

  const isMethodVerified = dnsStatus === "DETECTED" || htmlStatus === "DETECTED";

  if (metaOwnershipVerified && isMethodVerified) {
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

export interface DnsVerificationResult {
  status: DnsStatusType;
  domain: string;
  expectedToken: string;
  matchedRecord?: string;
  allTxtRecords: string[];
  recordsExamined: number;
  nameservers: string[];
  details: string;
  error?: string;
  isMismatch: boolean;
}

/**
 * Queries DNS TXT records for the specified root domain.
 * Strictly queries the apex root domain without prepending www.
 * Safely handles multi-chunk arrays, preserves SPF/DKIM, and handles timeouts.
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
    isMismatch: false,
  };

  if (!token) {
    result.status = "NOT_FOUND";
    result.details = "No Meta Domain Verification token provided for verification.";
    return result;
  }

  const safeCheck = isSafePublicDomain(rootDomain);
  if (!safeCheck.valid) {
    result.status = "ERROR";
    result.error = safeCheck.reason || "Invalid domain";
    result.details = result.error;
    return result;
  }

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
      queryError = null;
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

  // Find exact match
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
      result.isMismatch = true;
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
  status: HtmlStatusType;
  url: string;
  expectedToken: string;
  detectedToken?: string;
  details: string;
  error?: string;
  isMismatch: boolean;
}

/**
 * Checks the storefront HTML <head> for <meta name="facebook-domain-verification" content="..." />
 */
export async function verifyHtmlMetaTag(
  domainInput: string,
  expectedToken: string,
  options: { timeoutMs?: number } = {}
): Promise<HtmlVerificationResult> {
  const rootDomain = normalizeRootDomain(domainInput);
  const token = expectedToken.trim();
  const timeoutMs = options.timeoutMs ?? 6000;
  const targetUrl = `https://${rootDomain}`;

  const result: HtmlVerificationResult = {
    status: "NOT_FOUND",
    url: targetUrl,
    expectedToken: token,
    details: "",
    isMismatch: false,
  };

  if (!token) {
    result.status = "NOT_CHECKED";
    result.details = "No Meta Domain Verification token configured.";
    return result;
  }

  const safeCheck = isSafePublicDomain(rootDomain);
  if (!safeCheck.valid) {
    result.status = "ERROR";
    result.error = safeCheck.reason;
    result.details = safeCheck.reason || "Invalid domain";
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
        result.isMismatch = true;
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

/* ──────────────────────────────────────────────────────────────────────────
 * Multi-Domain Management & Audit Trail Service
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Ensures the primary canonical domain record (angkon.net) exists in the database
 * for the given tenant, preserving existing production settings and data.
 */
export async function ensureTenantPrimaryDomain(tenantId = "angkon-main"): Promise<IMetaDomain> {
  await connectToDatabase();
  const safeTenant = tenantId?.trim() || "angkon-main";

  let domainDoc = await MetaDomain.findOne({ tenantId: safeTenant, isPrimary: true });
  if (!domainDoc) {
    domainDoc = await MetaDomain.findOne({ tenantId: safeTenant, domain: CANONICAL_ROOT_DOMAIN });
  }

  const pixelSettings = await getPixelSettings(safeTenant);
  const token = (pixelSettings.domainVerificationToken || "c82us1ogm8zgy1u7zn8v7dcvzpt1a2").trim();
  const method = pixelSettings.domainVerificationMethod || "dns_txt";
  const ownershipVerified = Boolean(pixelSettings.metaOwnershipVerified ?? true);

  if (!domainDoc) {
    const createdDomain = await MetaDomain.create({
      tenantId: safeTenant,
      domain: CANONICAL_ROOT_DOMAIN,
      isPrimary: true,
      verificationToken: token,
      verificationMethod: method,
      lifecycleState: ownershipVerified ? "VERIFIED" : "DNS_DETECTED",
      dnsStatus: "DETECTED",
      htmlStatus: "DETECTED",
      metaOwnershipStatus: ownershipVerified ? "VERIFIED" : "NEEDS_VERIFICATION",
      metaOwnershipVerified: ownershipVerified,
      metaOwnershipVerifiedAt: ownershipVerified ? new Date() : null,
      metaOwnershipSource: "meta_business_manager",
      metaOwnershipConfirmedBy: "system_initializer",
      scheduledCheckEnabled: true,
      scheduledCheckIntervalMinutes: 60,
    });
    domainDoc = createdDomain;

    await MetaDomainAuditLog.create({
      tenantId: safeTenant,
      domainId: createdDomain._id as any,
      domain: CANONICAL_ROOT_DOMAIN,
      action: "domain_created",
      previousState: null,
      newState: domainDoc.lifecycleState,
      verificationMethod: method,
      actor: "system_initializer",
      details: "Initial primary domain record seeded from existing production configuration.",
    });
  } else {
    // Keep verificationToken in sync with pixel settings if updated
    if (token && domainDoc.verificationToken !== token) {
      domainDoc.verificationToken = token;
      await domainDoc.save();
    }
  }

  if (!domainDoc) {
    throw new Error("Failed to initialize or retrieve primary domain");
  }

  return domainDoc;
}

/**
 * Lists all registered domains for the tenant.
 */
export async function listTenantDomains(tenantId = "angkon-main"): Promise<IMetaDomain[]> {
  await connectToDatabase();
  const safeTenant = tenantId?.trim() || "angkon-main";
  await ensureTenantPrimaryDomain(safeTenant);
  return MetaDomain.find({ tenantId: safeTenant }).sort({ isPrimary: -1, domain: 1 }).lean();
}

/**
 * Adds an additional independently verified domain to the tenant.
 */
export async function addTenantDomain(params: {
  tenantId: string;
  domainInput: string;
  customToken?: string;
  verificationMethod?: "dns_txt" | "html_meta_tag";
  actor: string;
}): Promise<IMetaDomain> {
  await connectToDatabase();
  const { tenantId, domainInput, customToken, verificationMethod, actor } = params;
  const safeTenant = tenantId?.trim() || "angkon-main";

  const safeCheck = isSafePublicDomain(domainInput);
  if (!safeCheck.valid || !safeCheck.domain) {
    throw new Error(safeCheck.reason || "Invalid domain name");
  }

  const domain = safeCheck.domain;

  // Check for duplicate domain within this tenant
  const existing = await MetaDomain.findOne({ tenantId: safeTenant, domain });
  if (existing) {
    throw new Error(`Domain '${domain}' is already registered in this store.`);
  }

  const token = customToken?.trim() || generateMetaDomainToken();
  const method = verificationMethod || "dns_txt";

  const newDomain = await MetaDomain.create({
    tenantId: safeTenant,
    domain,
    isPrimary: false,
    verificationToken: token,
    verificationMethod: method,
    lifecycleState: "NEEDS_VERIFICATION",
    dnsStatus: "NOT_FOUND",
    htmlStatus: "NOT_CHECKED",
    metaOwnershipStatus: "NEEDS_VERIFICATION",
    metaOwnershipVerified: false,
    scheduledCheckEnabled: true,
    scheduledCheckIntervalMinutes: 60,
  });

  await MetaDomainAuditLog.create({
    tenantId: safeTenant,
    domainId: newDomain._id as any,
    domain,
    action: "domain_created",
    previousState: null,
    newState: "NEEDS_VERIFICATION",
    verificationMethod: method,
    actor: actor || "super_admin",
    details: `Added new domain with token '${token}'.`,
  });

  return newDomain;
}

/**
 * Performs a live DNS and HTML health check for a specific domain.
 * Updates telemetry, records timestamps, recalculates lifecycle state, and logs audit record.
 */
export async function checkDomainHealth(params: {
  tenantId: string;
  domainName: string;
  actor: string;
  isScheduled?: boolean;
}): Promise<{
  domainDoc: IMetaDomain;
  dnsResult: DnsVerificationResult;
  htmlResult: HtmlVerificationResult;
}> {
  await connectToDatabase();
  const { tenantId, domainName, actor, isScheduled } = params;
  const safeTenant = tenantId?.trim() || "angkon-main";
  const normalized = normalizeRootDomain(domainName);

  let foundDomain = await MetaDomain.findOne({ tenantId: safeTenant, domain: normalized });
  if (!foundDomain) {
    if (normalized === CANONICAL_ROOT_DOMAIN) {
      foundDomain = (await ensureTenantPrimaryDomain(safeTenant)) as any;
    } else {
      throw new Error(`Domain '${normalized}' not found for this tenant.`);
    }
  }

  if (!foundDomain) {
    throw new Error(`Domain '${normalized}' could not be loaded.`);
  }

  const domainDoc = foundDomain;
  const token = domainDoc.verificationToken;
  const previousState = domainDoc.lifecycleState;

  // 1. Run DNS TXT check
  const dnsResult = await verifyDnsTxtRecord(domainDoc.domain, token, { timeoutMs: 6000 });

  // 2. Run HTML check
  const htmlResult = await verifyHtmlMetaTag(domainDoc.domain, token, { timeoutMs: 6000 });

  const now = new Date();
  domainDoc.lastCheckedAt = now;
  domainDoc.dnsStatus = dnsResult.status;
  domainDoc.htmlStatus = htmlResult.status;
  domainDoc.lastExaminedRecords = dnsResult.allTxtRecords;
  domainDoc.lastMatchedRecord = dnsResult.matchedRecord || null;
  domainDoc.lastError = dnsResult.error || htmlResult.error || null;
  domainDoc.lastDetails = dnsResult.details;

  const isSuccessful =
    dnsResult.status === "DETECTED" || htmlResult.status === "DETECTED";

  if (isSuccessful) {
    domainDoc.lastSuccessfulCheckAt = now;
  } else {
    domainDoc.lastFailedCheckAt = now;
  }

  const isMismatch = dnsResult.isMismatch || htmlResult.isMismatch;

  const newState = calculateLifecycleState({
    dnsStatus: dnsResult.status,
    htmlStatus: htmlResult.status,
    metaOwnershipVerified: domainDoc.metaOwnershipVerified,
    isMismatch,
  });

  domainDoc.lifecycleState = newState;
  await domainDoc.save();

  // Record audit log
  await MetaDomainAuditLog.create({
    tenantId: safeTenant,
    domainId: domainDoc._id as any,
    domain: domainDoc.domain,
    action: isScheduled ? "scheduled_health_check" : "dns_check",
    previousState,
    newState,
    verificationMethod: domainDoc.verificationMethod,
    dnsResult: {
      status: dnsResult.status,
      recordsExamined: dnsResult.recordsExamined,
      matchedRecord: dnsResult.matchedRecord,
      error: dnsResult.error,
    },
    htmlResult: {
      status: htmlResult.status,
      detectedToken: htmlResult.detectedToken,
      error: htmlResult.error,
    },
    actor: actor || (isScheduled ? "system_scheduler" : "super_admin"),
    failureReason: !isSuccessful ? dnsResult.error || dnsResult.details : null,
    details: dnsResult.details,
  });

  return { domainDoc, dnsResult, htmlResult };
}

/**
 * Records or revokes Meta Business Manager ownership confirmation.
 * Never trusts client input without Super Admin authorization.
 */
export async function recordOwnershipConfirmation(params: {
  tenantId: string;
  domainName: string;
  verified: boolean;
  actor: string;
  source?: string;
}): Promise<IMetaDomain> {
  await connectToDatabase();
  const { tenantId, domainName, verified, actor, source } = params;
  const safeTenant = tenantId?.trim() || "angkon-main";
  const normalized = normalizeRootDomain(domainName);

  let foundDomain = await MetaDomain.findOne({ tenantId: safeTenant, domain: normalized });
  if (!foundDomain) {
    if (normalized === CANONICAL_ROOT_DOMAIN) {
      foundDomain = (await ensureTenantPrimaryDomain(safeTenant)) as any;
    } else {
      throw new Error(`Domain '${normalized}' not found.`);
    }
  }

  if (!foundDomain) {
    throw new Error(`Domain '${normalized}' could not be loaded.`);
  }

  const domainDoc = foundDomain;
  const previousState = domainDoc.lifecycleState;
  const now = new Date();

  domainDoc.metaOwnershipVerified = verified;
  domainDoc.metaOwnershipStatus = verified ? "VERIFIED" : "NEEDS_VERIFICATION";
  domainDoc.metaOwnershipVerifiedAt = verified ? now : null;
  domainDoc.metaOwnershipSource = verified
    ? source || "meta_business_manager"
    : null;
  domainDoc.metaOwnershipConfirmedBy = verified ? actor : null;

  const newState = calculateLifecycleState({
    dnsStatus: domainDoc.dnsStatus,
    htmlStatus: domainDoc.htmlStatus,
    metaOwnershipVerified: verified,
    isMismatch: domainDoc.lifecycleState === "DNS_MISMATCH",
  });

  domainDoc.lifecycleState = newState;
  await domainDoc.save();

  // If this is the primary domain, sync to Settings as well for consistency
  if (domainDoc.isPrimary) {
    const pixelSettings = await getPixelSettings(safeTenant);
    await savePixelSettings(
      {
        ...pixelSettings,
        metaOwnershipVerified: verified,
        metaOwnershipVerifiedAt: verified ? now.toISOString() : undefined,
        metaOwnershipSource: verified ? (source as any) || "meta_business_manager" : undefined,
        metaOwnershipConfirmedBy: verified ? actor : undefined,
      },
      safeTenant
    );
  }

  // Audit record
  await MetaDomainAuditLog.create({
    tenantId: safeTenant,
    domainId: domainDoc._id as any,
    domain: domainDoc.domain,
    action: verified ? "meta_ownership_confirmed" : "meta_ownership_revoked",
    previousState,
    newState,
    verificationMethod: domainDoc.verificationMethod,
    actor: actor || "super_admin",
    ownershipSource: source || "meta_business_manager",
    details: verified
      ? `Meta Business Manager ownership recorded as confirmed by ${actor}.`
      : `Meta Business Manager ownership confirmation revoked by ${actor}.`,
  });

  return domainDoc;
}

/**
 * Retrieves the append-only verification audit history.
 */
export async function getDomainAuditHistory(
  tenantId = "angkon-main",
  domainName?: string,
  limit = 50
) {
  await connectToDatabase();
  const safeTenant = tenantId?.trim() || "angkon-main";
  const filter: Record<string, unknown> = { tenantId: safeTenant };

  if (domainName) {
    filter.domain = normalizeRootDomain(domainName);
  }

  return MetaDomainAuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 100))
    .lean();
}

/**
 * Deletes a secondary domain. Primary domain (angkon.net) is protected against deletion.
 */
export async function deleteTenantDomain(
  tenantId: string,
  domainName: string,
  actor: string
): Promise<{ success: boolean; message: string }> {
  await connectToDatabase();
  const safeTenant = tenantId?.trim() || "angkon-main";
  const normalized = normalizeRootDomain(domainName);

  if (normalized === CANONICAL_ROOT_DOMAIN) {
    throw new Error(`Cannot delete primary production domain '${CANONICAL_ROOT_DOMAIN}'.`);
  }

  const domainDoc = await MetaDomain.findOne({ tenantId: safeTenant, domain: normalized });
  if (!domainDoc) {
    throw new Error(`Domain '${normalized}' not found.`);
  }

  if (domainDoc.isPrimary) {
    throw new Error("Primary domain cannot be deleted.");
  }

  await MetaDomain.deleteOne({ _id: domainDoc._id });

  await MetaDomainAuditLog.create({
    tenantId: safeTenant,
    domainId: domainDoc._id as any,
    domain: normalized,
    action: "domain_deleted",
    previousState: domainDoc.lifecycleState,
    newState: "DELETED",
    verificationMethod: domainDoc.verificationMethod,
    actor: actor || "super_admin",
    details: `Domain '${normalized}' removed from tenant management by ${actor}.`,
  });

  return { success: true, message: `Domain '${normalized}' deleted successfully.` };
}
