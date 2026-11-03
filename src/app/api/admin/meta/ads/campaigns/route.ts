import { NextRequest, NextResponse } from "next/server";
import { fetchMetaCampaigns } from "@/server/meta-ads";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { MetaAdReport } from "@/models/MetaAdReport";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get("adAccountId") || undefined;

    const campaigns = await fetchMetaCampaigns({
      adAccountId,
      tenantId: auth.tenantId,
    });

    await connectToDatabase();
    const reports = await MetaAdReport.find({
      tenantId: auth.tenantId,
      level: "campaign",
      breakdownKey: "none",
    }).lean();

    const metricsByCampaign = new Map<
      string,
      {
        spend: number;
        impressions: number;
        clicks: number;
        results: number;
        currency: string;
        lastSynchronized: string | null;
      }
    >();

    for (const rep of reports) {
      const existing = metricsByCampaign.get(rep.entityId) || {
        spend: 0,
        impressions: 0,
        clicks: 0,
        results: 0,
        currency: rep.currency || "BDT",
        lastSynchronized: null,
      };
      existing.spend += rep.spend || 0;
      existing.impressions += rep.impressions || 0;
      existing.clicks += rep.clicks || 0;
      existing.results += rep.metaPurchases || 0;
      if (rep.updatedAt) {
        const iso = new Date(rep.updatedAt).toISOString();
        if (!existing.lastSynchronized || iso > existing.lastSynchronized) {
          existing.lastSynchronized = iso;
        }
      }
      metricsByCampaign.set(rep.entityId, existing);
    }

    const enriched = campaigns.map((c) => {
      const m = metricsByCampaign.get(c.id);
      return {
        ...c,
        spend: m ? Number(m.spend.toFixed(2)) : 0,
        currency: m ? m.currency : "BDT",
        impressions: m ? m.impressions : 0,
        clicks: m ? m.clicks : 0,
        results: m ? m.results : 0,
        lastSynchronized: m?.lastSynchronized || null,
      };
    });

    return NextResponse.json({
      ok: true,
      tenantId: auth.tenantId,
      total: enriched.length,
      campaigns: enriched,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error loading Meta campaigns";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
