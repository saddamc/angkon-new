import { NextRequest, NextResponse } from "next/server";
import {
  fetchMetaDailyInsights,
  importMetaHistoricalInsights,
} from "@/server/meta-ads";
import { requireAdminSession } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const since = searchParams.get("since") || thirtyDaysAgo;
    const until = searchParams.get("until") || today;
    const adAccountId = searchParams.get("adAccountId") || undefined;

    const insights = await fetchMetaDailyInsights({
      since,
      until,
      adAccountId,
      tenantId: auth.tenantId,
    });

    return NextResponse.json({
      ok: true,
      tenantId: auth.tenantId,
      since,
      until,
      count: insights.length,
      insights,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error loading Meta insights";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const since = body.since || thirtyDaysAgo;
    const until = body.until || today;

    const result = await importMetaHistoricalInsights({
      since,
      until,
      tenantId: auth.tenantId,
    });

    return NextResponse.json({
      ok: true,
      tenantId: auth.tenantId,
      message: `Successfully imported ${result.importedCount} historical records from Meta Marketing API.`,
      importedCount: result.importedCount,
      totalSpend: result.totalSpend,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error importing Meta insights";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
