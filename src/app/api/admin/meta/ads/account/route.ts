import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import {
  getPublicMetaMarketingSettings,
  getMetaMarketingSettings,
} from "@/server/meta-marketing-settings";
import { verifyAdAccountCredentials } from "@/server/meta-marketing-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const verify = searchParams.get("verify") === "true";

    const publicSettings = await getPublicMetaMarketingSettings(auth.tenantId);

    if (verify && publicSettings.hasAccessToken && publicSettings.adAccountId) {
      const fullSettings = await getMetaMarketingSettings(auth.tenantId);
      try {
        const verified = await verifyAdAccountCredentials({
          adAccountId: fullSettings.adAccountId,
          token: fullSettings.accessToken,
          tenantId: auth.tenantId,
        });

        const refreshed = await getPublicMetaMarketingSettings(auth.tenantId);
        return NextResponse.json({
          ok: true,
          tenantId: auth.tenantId,
          settings: refreshed,
          verifiedAccount: verified,
        });
      } catch (err) {
        const refreshed = await getPublicMetaMarketingSettings(auth.tenantId);
        return NextResponse.json({
          ok: false,
          tenantId: auth.tenantId,
          settings: refreshed,
          error: err instanceof Error ? err.message : "Verification failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      tenantId: auth.tenantId,
      settings: publicSettings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error retrieving ad account status";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
