import { NextRequest, NextResponse } from "next/server";
import { getPixelSettings, savePixelSettings, PixelSettings } from "@/server/pixel-settings";

export async function GET() {
  try {
    const settings = await getPixelSettings();
    return NextResponse.json(settings, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("GET /api/admin/settings/pixel error:", error);
    return NextResponse.json({ error: "Failed to load pixel settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PixelSettings>;

    if (body.pixelId !== undefined) {
      const cleanId = String(body.pixelId).trim();
      if (cleanId && !/^\d{10,25}$/.test(cleanId)) {
        return NextResponse.json(
          { error: "Invalid Meta Pixel ID. Pixel IDs typically consist of 14 to 17 numeric digits." },
          { status: 400 }
        );
      }
    }

    const saved = await savePixelSettings(body);
    return NextResponse.json({ success: true, settings: saved });
  } catch (error) {
    console.error("POST /api/admin/settings/pixel error:", error);
    return NextResponse.json({ error: "Failed to save pixel settings" }, { status: 500 });
  }
}
