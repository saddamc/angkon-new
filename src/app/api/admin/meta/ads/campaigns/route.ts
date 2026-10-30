import { NextRequest, NextResponse } from "next/server";
import { fetchMetaCampaigns } from "@/server/meta-ads";
import { requireAdminSession } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get("adAccountId") || undefined;

    const campaigns = await fetchMetaCampaigns({
      adAccountId,
      tenantId: auth.tenantId,
    });

    return NextResponse.json({
      ok: true,
      tenantId: auth.tenantId,
      total: campaigns.length,
      campaigns,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error loading Meta campaigns";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
