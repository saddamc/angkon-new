import { NextRequest, NextResponse } from "next/server";
import { getPixelSettings } from "@/server/pixel-settings";
import { testMetaCapiConnection } from "@/server/meta-capi";
import { requireAdminSession } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const settings = await getPixelSettings(auth.tenantId);

    const pixelId = (body.pixelId || settings.pixelId || "").trim();
    let token = (body.capiToken || "").trim();

    // If caller didn't provide a new token or sent masked token, use existing saved token
    if (!token || token.includes("••••") || token.includes("***")) {
      token = settings.capiAccessToken || "";
    }

    const testEventCode = (body.testEventCode || settings.testEventCode || "").trim();

    if (!pixelId) {
      return NextResponse.json(
        { ok: false, error: "Meta Pixel / Dataset ID is missing." },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Conversions API access token is missing. Please paste a valid token generated in Meta Events Manager.",
        },
        { status: 400 }
      );
    }

    const result = await testMetaCapiConnection(pixelId, token, testEventCode, auth.tenantId, {
      eventName: body.eventName,
      eventId: body.eventId,
      customData: body.customData,
    });

    if (result.success) {
      return NextResponse.json({
        ok: true,
        success: true,
        eventsReceived: result.eventsReceived ?? 1,
        message: `Connection successful! Meta received ${result.eventsReceived ?? 1} test event.`,
        fbtraceId: result.fbtraceId,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: result.error || "Meta Graph API rejected the token or dataset ID.",
        code: result.code,
        fbtraceId: result.fbtraceId,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/admin/meta/capi/test error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal error testing Meta CAPI connection." },
      { status: 500 }
    );
  }
}
