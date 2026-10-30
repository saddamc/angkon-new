import { NextResponse } from "next/server";
import { getPixelSettings, DEFAULT_TENANT_ID } from "@/server/pixel-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getPixelSettings(DEFAULT_TENANT_ID);
    const activePixelId = settings.enabled ? (settings.pixelId || "") : "";

    return NextResponse.json(
      {
        enabled: Boolean(settings.enabled && activePixelId),
        pixelId: activePixelId || null,
        testEventCode: settings.testEventCode || "",
        events: {
          // Standard track* naming
          trackPageView: settings.trackPageView !== false,
          trackViewContent: settings.trackViewContent !== false,
          trackAddToCart: settings.trackAddToCart !== false,
          trackInitiateCheckout: settings.trackInitiateCheckout !== false,
          trackPurchase: settings.trackPurchase !== false,
          // CamelCase alias support
          pageView: settings.trackPageView !== false,
          viewContent: settings.trackViewContent !== false,
          addToCart: settings.trackAddToCart !== false,
          initiateCheckout: settings.trackInitiateCheckout !== false,
          purchase: settings.trackPurchase !== false,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/pixel/config error:", error);
    return NextResponse.json(
      { enabled: false, pixelId: null, events: {} },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }
}
