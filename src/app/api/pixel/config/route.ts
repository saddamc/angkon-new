import { NextResponse } from "next/server";
import { getPixelSettings } from "@/server/pixel-settings";

export async function GET() {
  try {
    const settings = await getPixelSettings();
    return NextResponse.json(
      {
        enabled: settings.enabled,
        pixelId: settings.enabled ? settings.pixelId : null,
        events: {
          pageView: settings.trackPageView,
          viewContent: settings.trackViewContent,
          addToCart: settings.trackAddToCart,
          initiateCheckout: settings.trackInitiateCheckout,
          purchase: settings.trackPurchase,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=15, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/pixel/config error:", error);
    return NextResponse.json({ enabled: false, pixelId: null }, { status: 500 });
  }
}
