import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { getPixelSettings } from "@/server/pixel-settings";
import {
  fetchEventMatchQuality,
  resolveEmqTokens,
  type EmqFailureReason,
} from "@/server/meta-emq";

export const dynamic = "force-dynamic";

/** Coarse status codes the client can branch on without seeing internals. */
const FAILURE_STATUS: Record<EmqFailureReason, number> = {
  "not-configured": 409,
  unauthorized: 409,
  "no-permission": 409,
  "not-found": 404,
  "rate-limited": 429,
  "upstream-error": 502,
};

/**
 * GET /api/admin/meta/emq
 *
 * Returns the Event Match Quality breakdown for the configured pixel by
 * querying Meta's Dataset Quality API. Super-admin session required; tokens
 * are never echoed back to the client.
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

    const settings = await getPixelSettings(auth.tenantId);
    const tokens = resolveEmqTokens(settings);

    if (!settings.pixelId || !tokens.primary) {
      return NextResponse.json(
        {
          ok: false,
          reason: "not-configured",
          error:
            "Connect a Meta pixel and save an access token before viewing match quality.",
        },
        { status: 409 }
      );
    }

    const result = await fetchEventMatchQuality({
      datasetId: settings.pixelId,
      accessToken: tokens.primary,
      fallbackAccessTokens: tokens.fallbacks,
      timeoutMs: 12_000,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason, error: result.message },
        { status: FAILURE_STATUS[result.reason] ?? 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        tokenSource: tokens.source,
        report: result.report,
      },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (error) {
    // Driver/session detail stays in the logs; the client receives a generic
    // message plus a coarse reason code.
    console.error("[Meta EMQ] GET /api/admin/meta/emq failed:", error);
    return NextResponse.json(
      {
        ok: false,
        reason: "upstream-error",
        error: "Event match quality is unavailable right now.",
      },
      { status: 500 }
    );
  }
}
