import { promises as dns } from "dns";
import { connectToDatabase } from "@/lib/mongodb";
import { MetaDomain, IMetaDomain, DnsStatusType, HtmlStatusType } from "@/models/MetaDomain";
import { MetaDomainAuditLog } from "@/models/MetaDomainAuditLog";
import { getPixelSettings, savePixelSettings } from "@/server/meta/pixel/pixel-settings";
import {
  CANONICAL_ROOT_DOMAIN,
  CANONICAL_NAMESERVERS,
  PUBLIC_FALLBACK_RESOLVERS,
  normalizeRootDomain,
  isSafePublicDomain,
  calculateLifecycleState,
} from "./constants";
import { ensureTenantPrimaryDomain } from "./audit";

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
  isTimeout?: boolean;
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
    result.isTimeout = queryError.name === "TimeoutError" || queryError.message.includes("timed out");
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
  const isTimeoutOrNetworkError = Boolean(dnsResult.isTimeout || dnsResult.error);

  const newState = calculateLifecycleState({
    dnsStatus: dnsResult.status,
    htmlStatus: htmlResult.status,
    metaOwnershipVerified: domainDoc.metaOwnershipVerified,
    isMismatch,
    isTimeoutOrNetworkError,
  });

  domainDoc.lifecycleState = newState;
  await domainDoc.save();

  // Avoid duplicate audit logs for scheduled checks if result and state have not changed
  const lastLog = await MetaDomainAuditLog.findOne({
    tenantId: safeTenant,
    domain: domainDoc.domain,
  }).sort({ createdAt: -1 });

  const isIdenticalConsecutive =
    lastLog &&
    lastLog.newState === newState &&
    lastLog.dnsResult?.status === dnsResult.status &&
    (isScheduled || (Date.now() - new Date(lastLog.createdAt).getTime() < 120_000 && lastLog.action === "dns_check"));

  if (!isIdenticalConsecutive) {
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
  }

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
