import { NextRequest, NextResponse } from "next/server";
import { getAttributionComparisonReport } from "@/server/meta-ads";
import { requireSuperAdminSession } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const since = searchParams.get("since") || thirtyDaysAgo;
    const until = searchParams.get("until") || today;

    const report = await getAttributionComparisonReport({
      since,
      until,
      tenantId: auth.tenantId,
    });

    return NextResponse.json({
      ok: true,
      tenantId: auth.tenantId,
      report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error generating attribution comparison";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
