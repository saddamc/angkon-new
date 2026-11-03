import { NextRequest, NextResponse } from "next/server";
import { getPixelSettings } from "@/server/pixel-settings";
import { testMetaCapiConnection } from "@/server/meta-capi";
import { requireSuperAdminSession } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
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

    const targetEvent = String(body.eventName || "PageView").trim();
    if (
      (targetEvent === "Purchase" ||
        targetEvent === "AddToCart" ||
        targetEvent === "InitiateCheckout") &&
      !testEventCode
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "External test dispatch blocked: A Meta Test Event Code (test_event_code) is strictly required to simulate conversion events without polluting production datasets.",
        },
        { status: 400 }
      );
    }

    const testEventId =
      (typeof body.eventId === "string" && body.eventId.trim()) ||
      `test_capi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Build realistic dummy e-commerce payload for simulation
    const defaultCustomData: Record<string, unknown> =
      targetEvent === "Purchase"
        ? {
            value: 1250,
            currency: "BDT",
            content_type: "product",
            content_ids: ["228010"],
            num_items: 1,
            order_id: `test_${Date.now()}`,
          }
        : targetEvent === "AddToCart"
        ? {
            value: 1250,
            currency: "BDT",
            content_type: "product",
            content_name: "Silk Jamdani Saree",
            content_ids: ["228010"],
          }
        : targetEvent === "InitiateCheckout"
        ? {
            value: 1250,
            currency: "BDT",
            content_type: "product",
            content_ids: ["228010"],
            num_items: 1,
          }
        : targetEvent === "ViewContent"
        ? {
            value: 1250,
            currency: "BDT",
            content_type: "product",
            content_name: "Silk Jamdani Saree",
            content_ids: ["228010"],
          }
        : {};

    const customData =
      body.customData && typeof body.customData === "object"
        ? { ...defaultCustomData, ...body.customData }
        : defaultCustomData;

    const result = await testMetaCapiConnection(pixelId, token, testEventCode, auth.tenantId, {
      eventName: targetEvent,
      eventId: testEventId,
      eventSourceUrl: body.eventSourceUrl,
      customData,
    });

    if (result.success) {
      return NextResponse.json({
        ok: true,
        success: true,
        eventName: targetEvent,
        eventId: testEventId,
        testEventCode,
        eventsReceived: result.eventsReceived ?? 1,
        message: `Connection successful! Meta received ${result.eventsReceived ?? 1} test event.`,
        fbtraceId: result.fbtraceId,
        timestamp: new Date().toISOString(),
        source: "server",
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
