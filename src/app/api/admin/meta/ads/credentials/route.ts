import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import {
  updateMetaMarketingSettings,
  getPublicMetaMarketingSettings,
  getMetaMarketingSettings,
  disconnectMetaMarketingSettings,
} from "@/server/meta-marketing-settings";
import { verifyAdAccountCredentials } from "@/server/meta-marketing-api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { adAccountId, accessToken, attributionConfig } = body;

    const current = await getMetaMarketingSettings(auth.tenantId);
    const tokenToUse =
      typeof accessToken === "string" && accessToken.trim() !== ""
        ? accessToken.trim()
        : current.accessToken;
    const accountIdToUse =
      typeof adAccountId === "string" && adAccountId.trim() !== ""
        ? adAccountId.trim()
        : current.adAccountId;

    if (!accountIdToUse) {
      return NextResponse.json(
        { ok: false, error: "Ad Account ID is required (e.g. act_1234567890)." },
        { status: 400 }
      );
    }

    if (!tokenToUse) {
      return NextResponse.json(
        { ok: false, error: "Marketing API Access Token is required." },
        { status: 400 }
      );
    }

    // Save initial update
    await updateMetaMarketingSettings(auth.tenantId, {
      adAccountId: accountIdToUse,
      accessToken: tokenToUse,
      attributionConfig,
    });

    // Test & verify connection against Meta Graph API
    let verifiedAccount = null;
    let verificationError: string | null = null;

    try {
      verifiedAccount = await verifyAdAccountCredentials({
        adAccountId: accountIdToUse,
        token: tokenToUse,
        tenantId: auth.tenantId,
      });
    } catch (err) {
      verificationError = err instanceof Error ? err.message : "Verification failed";
    }

    const publicSettings = await getPublicMetaMarketingSettings(auth.tenantId);

    if (verificationError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Credentials saved, but verification failed: ${verificationError}`,
          settings: publicSettings,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Meta Ad Account credentials verified and updated successfully.",
      tenantId: auth.tenantId,
      settings: publicSettings,
      account: verifiedAccount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error saving ad account credentials";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await disconnectMetaMarketingSettings(auth.tenantId);
    const publicSettings = await getPublicMetaMarketingSettings(auth.tenantId);

    return NextResponse.json({
      ok: true,
      message: "Meta Ad Account disconnected successfully. Marketing API credentials removed.",
      tenantId: auth.tenantId,
      settings: publicSettings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error disconnecting ad account";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
