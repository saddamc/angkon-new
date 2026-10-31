import { NextRequest, NextResponse } from "next/server";
import {
  getPixelSettings,
  savePixelSettings,
  getPublicAdminPixelSettings,
  getPixelEvents,
  PixelSettings,
} from "@/server/pixel-settings";
import { requireSuperAdminSession } from "@/server/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getPixelSettings(auth.tenantId);
    const { events } = getPixelEvents(auth.tenantId);
    const safeSettings = getPublicAdminPixelSettings(settings, events);

    return NextResponse.json(safeSettings, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("GET /api/admin/settings/pixel error:", error);
    return NextResponse.json({ error: "Failed to load pixel settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<PixelSettings>;

    if (body.pixelId !== undefined) {
      const cleanId = String(body.pixelId).trim();
      if (cleanId && !/^\d{10,25}$/.test(cleanId)) {
        return NextResponse.json(
          { error: "Invalid Meta Pixel / Dataset ID. Pixel IDs consist of 10 to 25 numeric digits." },
          { status: 400 }
        );
      }
    }

    if (body.adAccountId !== undefined) {
      const cleanAdAcc = String(body.adAccountId).trim();
      if (cleanAdAcc && !/^(act_)?\d{6,25}$/.test(cleanAdAcc)) {
        return NextResponse.json(
          { error: "Invalid Meta Ad Account ID. Format should be numeric or act_123456789." },
          { status: 400 }
        );
      }
    }

    if (body.capiAccessToken !== undefined) {
      const cleanToken = String(body.capiAccessToken).trim();
      if (cleanToken && (cleanToken.startsWith("{") || cleanToken.startsWith("[") || cleanToken.includes('"event_name"'))) {
        return NextResponse.json(
          {
            error:
              "Invalid Conversions API Access Token. You pasted sample JSON payload data instead of a Meta Access Token. Meta tokens start with 'EAA' (generated in Meta Events Manager > Settings > Conversions API).",
          },
          { status: 400 }
        );
      }
    }

    // Guard: Prevent turning on tracking when pixelId is missing or cleared
    const current = await getPixelSettings(auth.tenantId);
    const effectivePixelId =
      body.pixelId !== undefined ? String(body.pixelId).trim() : (current.pixelId?.trim() || "");

    if (body.enabled === true && !effectivePixelId) {
      return NextResponse.json(
        { error: "Cannot enable tracking without a valid Meta Pixel / Dataset ID." },
        { status: 400 }
      );
    }

    const saved = await savePixelSettings(body, auth.tenantId);
    const { events } = getPixelEvents(auth.tenantId);
    const safeSettings = getPublicAdminPixelSettings(saved, events);

    return NextResponse.json({ success: true, settings: safeSettings });
  } catch (error) {
    console.error("POST /api/admin/settings/pixel error:", error);
    return NextResponse.json({ error: "Failed to save pixel settings" }, { status: 500 });
  }
}
