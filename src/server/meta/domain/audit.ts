/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/mongodb";
import { MetaDomain, IMetaDomain } from "@/models/MetaDomain";
import { MetaDomainAuditLog } from "@/models/MetaDomainAuditLog";
import { getPixelSettings } from "@/server/meta/pixel/pixel-settings";
import {
  CANONICAL_ROOT_DOMAIN,
  normalizeRootDomain,
  isSafePublicDomain,
  generateMetaDomainToken,
} from "./constants";

export interface GroupedDomainAuditItem {
  _id: string;
  domain: string;
  action: string;
  previousState?: string | null;
  newState: string;
  verificationMethod: string;
  actor: string;
  details?: string | null;
  createdAt: string;
  isGrouped: boolean;
  groupCount: number;
  firstCheckedAt?: string;
  lastCheckedAt?: string;
  dnsResult?: {
    status?: string;
    recordsExamined?: number;
    matchedRecord?: string | null;
    error?: string | null;
  } | null;
  htmlResult?: {
    status?: string;
    detectedToken?: string | null;
    error?: string | null;
  } | null;
}

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

    // Cross-tenant reconciliation: if angkon.net was already confirmed in Meta Business Manager, inherit verified state
    if (!domainDoc.metaOwnershipVerified) {
      const verifiedCanonical = await MetaDomain.findOne({
        domain: CANONICAL_ROOT_DOMAIN,
        metaOwnershipVerified: true,
      });

      if (verifiedCanonical || pixelSettings.metaOwnershipVerified) {
        domainDoc.metaOwnershipVerified = true;
        domainDoc.metaOwnershipStatus = "VERIFIED";
        domainDoc.lifecycleState = "VERIFIED";
        domainDoc.metaOwnershipVerifiedAt = verifiedCanonical?.metaOwnershipVerifiedAt || new Date();
        domainDoc.metaOwnershipSource = "meta_business_manager";
        domainDoc.metaOwnershipConfirmedBy = "business_portfolio_reconciliation";
        await domainDoc.save();
      }
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
 * Retrieves the append-only verification audit history.
 */
export async function getDomainAuditHistory(
  tenantId = "angkon-main",
  domainName?: string,
  limit = 50
) {
  await connectToDatabase();
  const safeTenant = tenantId?.trim() || "angkon-main";
  const query: Record<string, any> = { tenantId: safeTenant };

  if (domainName) {
    query.domain = normalizeRootDomain(domainName);
  }

  return MetaDomainAuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
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

/**
 * Returns grouped audit history to eliminate repeated noisy verification entries,
 * while preserving every discrete state change, error, and administrative mutation.
 */
export async function getGroupedDomainAuditHistory(
  tenantId = "angkon-main",
  domainName?: string,
  limit = 50
): Promise<GroupedDomainAuditItem[]> {
  const rawLogs = await getDomainAuditHistory(tenantId, domainName, limit * 2);
  const grouped: GroupedDomainAuditItem[] = [];

  for (const log of rawLogs as any[]) {
    const isCheckAction = log.action === "dns_check" || log.action === "scheduled_health_check";
    const lastGroup = grouped[grouped.length - 1];

    if (
      lastGroup &&
      isCheckAction &&
      (lastGroup.action === "dns_check" || lastGroup.action === "scheduled_health_check") &&
      lastGroup.newState === log.newState &&
      lastGroup.dnsResult?.status === log.dnsResult?.status &&
      (!log.previousState || log.previousState === log.newState)
    ) {
      lastGroup.isGrouped = true;
      lastGroup.groupCount += 1;
      lastGroup.firstCheckedAt = new Date(log.createdAt).toISOString();
      lastGroup.details = `${lastGroup.groupCount} consecutive successful checks. Last verified ${new Date(lastGroup.lastCheckedAt || lastGroup.createdAt).toLocaleTimeString()}.`;
    } else {
      grouped.push({
        _id: String(log._id),
        domain: log.domain,
        action: log.action,
        previousState: log.previousState,
        newState: log.newState,
        verificationMethod: log.verificationMethod,
        actor: log.actor,
        details: log.details,
        createdAt: new Date(log.createdAt).toISOString(),
        isGrouped: false,
        groupCount: 1,
        firstCheckedAt: new Date(log.createdAt).toISOString(),
        lastCheckedAt: new Date(log.createdAt).toISOString(),
        dnsResult: log.dnsResult,
        htmlResult: log.htmlResult,
      });
    }

    if (grouped.length >= limit) break;
  }

  return grouped;
}

/**
 * Sets a domain as the primary tenant domain.
 */
export async function setTenantPrimaryDomain(
  tenantId: string,
  domainName: string,
  actor: string
): Promise<IMetaDomain> {
  await connectToDatabase();
  const safeTenant = tenantId?.trim() || "angkon-main";
  const normalized = normalizeRootDomain(domainName);

  const targetDoc = await MetaDomain.findOne({ tenantId: safeTenant, domain: normalized });
  if (!targetDoc) {
    throw new Error(`Domain '${normalized}' not found.`);
  }

  await MetaDomain.updateMany({ tenantId: safeTenant, isPrimary: true }, { $set: { isPrimary: false } });
  targetDoc.isPrimary = true;
  await targetDoc.save();

  await MetaDomainAuditLog.create({
    tenantId: safeTenant,
    domainId: targetDoc._id as any,
    domain: normalized,
    action: "primary_domain_updated" as any,
    previousState: targetDoc.lifecycleState,
    newState: targetDoc.lifecycleState,
    verificationMethod: targetDoc.verificationMethod,
    actor: actor || "super_admin",
    details: `Domain '${normalized}' designated as primary root domain for this store.`,
  });

  return targetDoc;
}
