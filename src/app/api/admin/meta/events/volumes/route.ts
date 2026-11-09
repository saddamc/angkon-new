import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { getPixelSettings } from "@/server/pixel-settings";
import { getMetaMarketingSettings } from "@/server/meta-marketing-settings";
import { resolveEmqTokens } from "@/server/meta-emq";
import { fetchMetaEventVolumes } from "@/server/meta-event-volumes";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/meta/events/volumes
 *
 * Returns Meta's own pixel-fire counts per event name. Always answers 200 with
 * an explicit `ok` flag so the client can distinguish "Meta has no data" from
 * "this token cannot read the stats edge" without treating it as a crash.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return (
        auth.response ||
        NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
      );
    }

    const [settings, marketingSettings] = await Promise.all([
      getPixelSettings(auth.tenantId),
      getMetaMarketingSettings(auth.tenantId).catch(() => null),
    ]);

    const tokens = resolveEmqTokens({
      ...settings,
      marketingApiAccessToken:
        settings.marketingApiAccessToken || marketingSettings?.accessToken || "",
    });

    if (!settings.pixelId || !tokens.primary) {
      return NextResponse.json(
        {
          ok: false,
          reason: "not-configured",
          error:
            "Connect a Meta pixel and save an access token to see Meta-reported event volumes.",
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "").toLowerCase();
    const daysParam = Number(searchParams.get("days"));
    const requestedDays =
      period === "today"
        ? 1
        : period === "7d"
          ? 7
          : period === "28d"
            ? 28
            : period === "month"
              ? Math.max(1, new Date().getDate())
              : period === "year"
                ? 365
                : Number.isFinite(daysParam) && daysParam > 0
                  ? Math.min(daysParam, 90)
                  : 28;

    const result = await fetchMetaEventVolumes({
      datasetId: settings.pixelId,
      accessToken: tokens.primary,
      fallbackAccessTokens: tokens.fallbacks,
      days: requestedDays,
      timeoutMs: 12_000,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason, error: result.message },
        {
          status: 200,
          headers: { "Cache-Control": "private, max-age=60" },
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        tokenSource: tokens.source,
        volumes: result.report.volumes,
        startTime: result.report.startTime,
        endTime: result.report.endTime,
        fetchedAt: result.report.fetchedAt,
      },
      { headers: { "Cache-Control": "private, max-age=120" } }
    );
  } catch (error) {
    console.error("[Meta Volumes] GET /api/admin/meta/events/volumes failed:", error);
    return NextResponse.json(
      {
        ok: false,
        reason: "upstream-error",
        error: "Meta event volumes are unavailable right now.",
      },
      { status: 200 }
    );
  }
}
