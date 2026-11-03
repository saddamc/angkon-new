import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { MetaAdImportJob } from "@/models/MetaAdImportJob";
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

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const verify = searchParams.get("verify") === "true";

    const [bizDoc, lastJob] = await Promise.all([
      Settings.findOne({ tenantId: auth.tenantId, key: "meta_business_portfolio" }).lean(),
      MetaAdImportJob.findOne({ tenantId: auth.tenantId, status: "completed" })
        .sort({ completedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const bizVal = (bizDoc?.value as Record<string, unknown>) || {};
    const businessId = String(bizVal.businessId || "1646756900434912");
    const lastSyncAt = lastJob?.completedAt ? new Date(lastJob.completedAt).toISOString() : null;

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
          businessId,
          marketingApiVersion: "v22.0",
          permissionScope: "ads_read, ads_management",
          lastSyncAt,
          verifiedAccount: verified,
        });
      } catch (err) {
        const refreshed = await getPublicMetaMarketingSettings(auth.tenantId);
        return NextResponse.json({
          ok: false,
          tenantId: auth.tenantId,
          settings: refreshed,
          businessId,
          marketingApiVersion: "v22.0",
          permissionScope: "ads_read, ads_management",
          lastSyncAt,
          error: err instanceof Error ? err.message : "Verification failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      tenantId: auth.tenantId,
      settings: publicSettings,
      businessId,
      marketingApiVersion: "v22.0",
      permissionScope: "ads_read, ads_management",
      lastSyncAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error retrieving ad account status";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
