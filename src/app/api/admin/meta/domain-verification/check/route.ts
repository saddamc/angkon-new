import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import {
  CANONICAL_ROOT_DOMAIN,
  CANONICAL_SITE_URL,
  CANONICAL_NAMESERVERS,
  listTenantDomains,
  checkDomainHealth,
  recordOwnershipConfirmation,
  addTenantDomain,
  deleteTenantDomain,
  getDomainAuditHistory,
  getGroupedDomainAuditHistory,
  setTenantPrimaryDomain,
  getAemConfiguration,
  normalizeRootDomain,
  ensureTenantPrimaryDomain,
  verifyHtmlMetaTag,
} from "@/server/meta-domain";
import { MetaDomain } from "@/models/MetaDomain";
import { MetaDomainAuditLog } from "@/models/MetaDomainAuditLog";
import { getPixelSettings, savePixelSettings } from "@/server/pixel-settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/meta/domain-verification/check
 * Returns full domain verification overview, multi-domain registry, live diagnostics, and audit history.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedDomain = searchParams.get("domain")?.trim();
    const runLiveCheck = searchParams.get("live") === "true";

    const tenantId = auth.tenantId;

    // Ensure primary domain (angkon.net) is initialized
    await ensureTenantPrimaryDomain(tenantId);

    // List all tenant-scoped domains
    const domains = await listTenantDomains(tenantId);

    const targetDomain = requestedDomain
      ? normalizeRootDomain(requestedDomain)
      : (domains.find((d) => d.isPrimary)?.domain || CANONICAL_ROOT_DOMAIN);

    let activeDomainDoc = domains.find((d) => d.domain === targetDomain) || domains[0];

    // Optionally run a live check if requested, or if never checked before
    let liveDnsResult = null;
    let liveHtmlResult = null;

    if (runLiveCheck || !activeDomainDoc.lastCheckedAt) {
      const checkRes = await checkDomainHealth({
        tenantId,
        domainName: targetDomain,
        actor: auth.user || "super_admin",
      });
      activeDomainDoc = checkRes.domainDoc;
      liveDnsResult = checkRes.dnsResult;
      liveHtmlResult = checkRes.htmlResult;
    }

    // Retrieve recent append-only audit trail and grouped representation
    const [auditHistory, groupedAuditHistory] = await Promise.all([
      getDomainAuditHistory(tenantId, targetDomain, 50),
      getGroupedDomainAuditHistory(tenantId, targetDomain, 30),
    ]);

    const aemConfig = getAemConfiguration(tenantId);
    const rawToken = activeDomainDoc.verificationToken || "";
    const maskedToken = rawToken
      ? `${rawToken.slice(0, 10)}${"•".repeat(Math.max(0, rawToken.length - 10))}`
      : "c82us1ogm8••••••••••••••••••••";

    const lastCheckTime = activeDomainDoc.lastCheckedAt
      ? new Date(activeDomainDoc.lastCheckedAt).getTime()
      : Date.now();
    const nextScheduledCheck = new Date(lastCheckTime + 30 * 60 * 1000).toISOString();

    return NextResponse.json({
      ok: true,
      domain: activeDomainDoc.domain,
      verified: Boolean(
        activeDomainDoc.metaOwnershipVerified ||
        activeDomainDoc.lifecycleState === "VERIFIED" ||
        activeDomainDoc.metaOwnershipStatus === "VERIFIED"
      ),
      isPrimary: activeDomainDoc.isPrimary,
      nameservers: CANONICAL_NAMESERVERS,
      dnsProvider: "Namecheap",
      verificationToken: rawToken,
      maskedToken,
      verificationMethod: activeDomainDoc.verificationMethod,
      lifecycleState: activeDomainDoc.lifecycleState,
      dnsStatus: activeDomainDoc.dnsStatus,
      htmlStatus: activeDomainDoc.htmlStatus,
      metaOwnershipStatus: activeDomainDoc.metaOwnershipStatus,
      metaOwnershipVerified: activeDomainDoc.metaOwnershipVerified,
      metaOwnershipVerifiedAt: activeDomainDoc.metaOwnershipVerifiedAt,
      metaOwnershipSource: activeDomainDoc.metaOwnershipSource || "meta_business_manager",
      metaOwnershipConfirmedBy: activeDomainDoc.metaOwnershipConfirmedBy,
      portfolio: {
        name: "Plain Stitch",
        id: "1068222718624963",
        role: "Primary Meta Business Portfolio",
      },
      lastCheckedAt: activeDomainDoc.lastCheckedAt,
      lastSuccessfulCheckAt: activeDomainDoc.lastSuccessfulCheckAt,
      lastFailedCheckAt: activeDomainDoc.lastFailedCheckAt,
      nextScheduledCheck,
      lastExaminedRecords: activeDomainDoc.lastExaminedRecords || [],
      lastMatchedRecord: activeDomainDoc.lastMatchedRecord,
      lastDetails: activeDomainDoc.lastDetails,
      lastError: activeDomainDoc.lastError,
      domains: domains.map((d) => ({
        id: String(d._id),
        domain: d.domain,
        isPrimary: d.isPrimary,
        lifecycleState: d.lifecycleState,
        dnsStatus: d.dnsStatus,
        htmlStatus: d.htmlStatus,
        metaOwnershipStatus: d.metaOwnershipStatus,
        metaOwnershipVerified: d.metaOwnershipVerified,
        verificationMethod: d.verificationMethod,
        lastCheckedAt: d.lastCheckedAt,
      })),
      liveResults: liveDnsResult
        ? {
            dns: liveDnsResult,
            html: liveHtmlResult,
          }
        : null,
      aem: aemConfig,
      auditHistory,
      groupedAuditHistory,
      siteUrl: CANONICAL_SITE_URL,
      message: `Domain '${activeDomainDoc.domain}' status: ${activeDomainDoc.lifecycleState}.`,
    });
  } catch (error) {
    console.error("GET /api/admin/meta/domain-verification/check error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal error checking domain verification" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/meta/domain-verification/check
 * Performs management operations: manual recheck, ownership confirmation, adding/deleting domains.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, domain, verified, source, customToken, verificationMethod, limit } = body;
    const tenantId = auth.tenantId;
    const actor = auth.user || "super_admin";

    const targetDomain = domain ? normalizeRootDomain(domain) : CANONICAL_ROOT_DOMAIN;

    // 1. Action: Manual DNS / HTML Recheck
    if (action === "recheck_dns" || action === "check_domain") {
      const checkRes = await checkDomainHealth({
        tenantId,
        domainName: targetDomain,
        actor,
      });

      const auditHistory = await getDomainAuditHistory(tenantId, targetDomain, 20);

      return NextResponse.json({
        ok: true,
        success: true,
        domain: checkRes.domainDoc.domain,
        lifecycleState: checkRes.domainDoc.lifecycleState,
        dnsStatus: checkRes.domainDoc.dnsStatus,
        htmlStatus: checkRes.domainDoc.htmlStatus,
        metaOwnershipStatus: checkRes.domainDoc.metaOwnershipStatus,
        dnsResult: checkRes.dnsResult,
        htmlResult: checkRes.htmlResult,
        lastCheckedAt: checkRes.domainDoc.lastCheckedAt,
        lastSuccessfulCheckAt: checkRes.domainDoc.lastSuccessfulCheckAt,
        lastFailedCheckAt: checkRes.domainDoc.lastFailedCheckAt,
        auditHistory,
        message: checkRes.dnsResult.details,
      });
    }

    // 2. Action: Record / Revoke Meta Business Manager Ownership
    if (action === "confirm_meta_ownership") {
      const isVerified = verified !== false;
      const updatedDoc = await recordOwnershipConfirmation({
        tenantId,
        domainName: targetDomain,
        verified: isVerified,
        actor,
        source: source || "meta_business_manager",
      });

      const auditHistory = await getDomainAuditHistory(tenantId, targetDomain, 20);

      return NextResponse.json({
        ok: true,
        success: true,
        domain: updatedDoc.domain,
        lifecycleState: updatedDoc.lifecycleState,
        metaOwnershipStatus: updatedDoc.metaOwnershipStatus,
        metaOwnershipVerified: updatedDoc.metaOwnershipVerified,
        metaOwnershipVerifiedAt: updatedDoc.metaOwnershipVerifiedAt,
        metaOwnershipSource: updatedDoc.metaOwnershipSource,
        metaOwnershipConfirmedBy: updatedDoc.metaOwnershipConfirmedBy,
        auditHistory,
        message: isVerified
          ? `Meta Business Manager ownership recorded as VERIFIED for ${updatedDoc.domain}.`
          : `Meta Business Manager ownership revoked for ${updatedDoc.domain}.`,
      });
    }

    // 3. Action: Add New Tenant Domain
    if (action === "add_domain") {
      const newDomain = await addTenantDomain({
        tenantId,
        domainInput: domain,
        customToken,
        verificationMethod,
        actor,
      });

      return NextResponse.json({
        ok: true,
        success: true,
        domain: newDomain,
        message: `Domain '${newDomain.domain}' added successfully. Configured verification method: ${newDomain.verificationMethod}.`,
      });
    }

    // 4. Action: Delete Secondary Domain
    if (action === "delete_domain") {
      const result = await deleteTenantDomain(tenantId, targetDomain, actor);
      return NextResponse.json({
        ok: true,
        success: true,
        message: result.message,
      });
    }

    // 5. Action: Set Primary Domain
    if (action === "set_primary_domain") {
      const updatedPrimary = await setTenantPrimaryDomain(tenantId, targetDomain, actor);
      const auditHistory = await getDomainAuditHistory(tenantId, targetDomain, 20);
      return NextResponse.json({
        ok: true,
        success: true,
        domain: updatedPrimary.domain,
        isPrimary: true,
        auditHistory,
        message: `Domain '${updatedPrimary.domain}' is now the primary domain.`,
      });
    }

    // 6. Action: Recheck HTML Meta Tag
    if (action === "recheck_html") {
      const activeDoc = await MetaDomain.findOne({ tenantId, domain: targetDomain });
      if (!activeDoc) {
        return NextResponse.json({ ok: false, error: `Domain '${targetDomain}' not found.` }, { status: 404 });
      }
      const htmlResult = await verifyHtmlMetaTag(targetDomain, activeDoc.verificationToken);
      activeDoc.htmlStatus = htmlResult.status;
      activeDoc.lastCheckedAt = new Date();
      await activeDoc.save();

      const auditHistory = await getDomainAuditHistory(tenantId, targetDomain, 20);
      return NextResponse.json({
        ok: true,
        success: true,
        domain: activeDoc.domain,
        htmlStatus: activeDoc.htmlStatus,
        htmlResult,
        auditHistory,
        message: htmlResult.details,
      });
    }

    // 7. Action: Update Domain Token
    if (action === "update_token") {
      const activeDoc = await MetaDomain.findOne({ tenantId, domain: targetDomain });
      if (!activeDoc) {
        return NextResponse.json({ ok: false, error: `Domain '${targetDomain}' not found.` }, { status: 404 });
      }
      const newToken = (customToken || "").trim();
      if (!newToken || newToken.length < 10) {
        return NextResponse.json({ ok: false, error: "Invalid token length. Must be at least 10 characters." }, { status: 400 });
      }

      const previousToken = activeDoc.verificationToken;
      activeDoc.verificationToken = newToken;
      if (verificationMethod) activeDoc.verificationMethod = verificationMethod;
      await activeDoc.save();

      if (activeDoc.isPrimary) {
        const pixelSettings = await getPixelSettings(tenantId);
        await savePixelSettings(
          {
            ...pixelSettings,
            domainVerificationToken: newToken,
            domainVerificationMethod: verificationMethod || activeDoc.verificationMethod,
          },
          tenantId
        );
      }

      await MetaDomainAuditLog.create({
        tenantId,
        domainId: activeDoc._id as any,
        domain: activeDoc.domain,
        action: "token_updated",
        previousState: activeDoc.lifecycleState,
        newState: activeDoc.lifecycleState,
        verificationMethod: activeDoc.verificationMethod,
        actor,
        details: `Verification token updated from '${previousToken.slice(0, 6)}...' to '${newToken.slice(0, 6)}...'.`,
      });

      const auditHistory = await getDomainAuditHistory(tenantId, targetDomain, 20);
      return NextResponse.json({
        ok: true,
        success: true,
        domain: activeDoc.domain,
        token: newToken,
        auditHistory,
        message: `Verification token updated for '${activeDoc.domain}'.`,
      });
    }

    // 8. Action: Get Audit History
    if (action === "get_audit_history") {
      const history = await getDomainAuditHistory(tenantId, targetDomain, Number(limit) || 50);
      const groupedHistory = await getGroupedDomainAuditHistory(tenantId, targetDomain, Number(limit) || 30);
      return NextResponse.json({
        ok: true,
        history,
        groupedHistory,
      });
    }

    return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin/meta/domain-verification/check error:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
