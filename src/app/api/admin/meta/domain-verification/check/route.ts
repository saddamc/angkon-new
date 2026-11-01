import { NextRequest, NextResponse } from "next/server";
import { getPixelSettings, savePixelSettings } from "@/server/pixel-settings";
import { requireSuperAdminSession } from "@/server/admin-auth";
import {
  CANONICAL_ROOT_DOMAIN,
  CANONICAL_SITE_URL,
  CANONICAL_NAMESERVERS,
  verifyDnsTxtRecord,
  verifyHtmlMetaTag,
} from "@/server/meta-domain";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/meta/domain-verification/check
 * Runs live DNS TXT lookup on "angkon.net" (Namecheap) and storefront HTML <meta> tag check.
 * Strictly separates DNS TXT status, HTML tag status, and Meta Business Manager ownership status.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getPixelSettings(auth.tenantId);
    const token = (settings.domainVerificationToken || "").trim();
    const verificationMethod = settings.domainVerificationMethod || "dns_txt";

    if (!token) {
      return NextResponse.json({
        ok: true,
        domain: CANONICAL_ROOT_DOMAIN,
        nameservers: CANONICAL_NAMESERVERS,
        tokenConfigured: false,
        token: "",
        verificationMethod,
        dnsTxt: {
          status: "NOT_FOUND",
          domain: CANONICAL_ROOT_DOMAIN,
          recordsExamined: 0,
          nameservers: CANONICAL_NAMESERVERS,
          allTxtRecords: [],
          details: "No Meta Domain Verification Token is configured in store settings.",
        },
        htmlMetaTag: {
          status: "NOT_CHECKED",
          url: CANONICAL_SITE_URL,
          details: "Token not configured.",
        },
        metaOwnership: {
          status: "NEEDS_VERIFICATION",
          verified: false,
          verifiedAt: null,
          source: null,
          confirmedBy: null,
        },
        message: "No Meta Domain Verification Token is configured. Please enter and save the token from Meta Business Manager.",
      });
    }

    // 1. Live DNS TXT Verification on root domain (angkon.net directly, never www.angkon.net)
    const dnsResult = await verifyDnsTxtRecord(CANONICAL_ROOT_DOMAIN, token, { timeoutMs: 6000 });

    // 2. Live Storefront HTML <meta> Tag Verification
    const htmlResult = await verifyHtmlMetaTag(CANONICAL_SITE_URL, token, { timeoutMs: 6000 });

    // 3. Meta Business Manager Ownership Status
    // Spec rule: Do not automatically mark ownership verified just because DNS is detected.
    const isMetaOwnershipVerified = Boolean(settings.metaOwnershipVerified);
    const metaOwnershipStatus: "VERIFIED" | "NEEDS_VERIFICATION" = isMetaOwnershipVerified
      ? "VERIFIED"
      : "NEEDS_VERIFICATION";

    let summaryMessage = "";
    if (dnsResult.status === "DETECTED") {
      summaryMessage = `DNS TXT record verified on ${CANONICAL_ROOT_DOMAIN} (${CANONICAL_NAMESERVERS.join(", ")}).`;
    } else if (dnsResult.status === "ERROR") {
      summaryMessage = `DNS TXT verification error on ${CANONICAL_ROOT_DOMAIN}: ${dnsResult.error}`;
    } else {
      summaryMessage = `DNS TXT record not found on ${CANONICAL_ROOT_DOMAIN}. Examined ${dnsResult.recordsExamined} records.`;
    }

    return NextResponse.json({
      ok: true,
      domain: CANONICAL_ROOT_DOMAIN,
      nameservers: CANONICAL_NAMESERVERS,
      tokenConfigured: true,
      token,
      verificationMethod,
      dnsTxt: {
        status: dnsResult.status,
        domain: dnsResult.domain,
        recordsExamined: dnsResult.recordsExamined,
        matchedRecord: dnsResult.matchedRecord,
        allTxtRecords: dnsResult.allTxtRecords,
        nameservers: dnsResult.nameservers,
        details: dnsResult.details,
        error: dnsResult.error,
      },
      htmlMetaTag: {
        status: htmlResult.status,
        url: htmlResult.url,
        detectedToken: htmlResult.detectedToken,
        details: htmlResult.details,
        error: htmlResult.error,
      },
      metaOwnership: {
        status: metaOwnershipStatus,
        verified: isMetaOwnershipVerified,
        verifiedAt: settings.metaOwnershipVerifiedAt || null,
        source: settings.metaOwnershipSource || null,
        confirmedBy: settings.metaOwnershipConfirmedBy || null,
      },
      message: summaryMessage,
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
 * Allows an authorized super-admin to securely record or toggle confirmed Meta Business Manager ownership.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, verified, source, verificationMethod } = body;

    if (action !== "confirm_meta_ownership") {
      return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    const currentSettings = await getPixelSettings(auth.tenantId);

    const isVerified = verified !== false;
    const updatedSettings = {
      ...currentSettings,
      metaOwnershipVerified: isVerified,
      metaOwnershipVerifiedAt: isVerified ? new Date().toISOString() : undefined,
      metaOwnershipSource: isVerified
        ? (source as "meta_business_manager" | "manual_confirmation") || "meta_business_manager"
        : undefined,
      metaOwnershipConfirmedBy: isVerified ? auth.user || "super_admin" : undefined,
      domainVerificationMethod: verificationMethod || currentSettings.domainVerificationMethod || "dns_txt",
    };

    await savePixelSettings(updatedSettings, auth.tenantId);

    return NextResponse.json({
      ok: true,
      success: true,
      domain: CANONICAL_ROOT_DOMAIN,
      metaOwnership: {
        status: isVerified ? "VERIFIED" : "NEEDS_VERIFICATION",
        verified: isVerified,
        verifiedAt: updatedSettings.metaOwnershipVerifiedAt || null,
        source: updatedSettings.metaOwnershipSource || null,
        confirmedBy: updatedSettings.metaOwnershipConfirmedBy || null,
      },
      verificationMethod: updatedSettings.domainVerificationMethod,
      message: isVerified
        ? `Meta Business Manager ownership recorded as VERIFIED for ${CANONICAL_ROOT_DOMAIN}.`
        : `Meta Business Manager ownership status reset to NEEDS_VERIFICATION.`,
    });
  } catch (error) {
    console.error("POST /api/admin/meta/domain-verification/check error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal error saving Meta ownership verification" },
      { status: 500 }
    );
  }
}
