import { NextRequest, NextResponse } from "next/server";
import {
  getPixelEvents,
  recordPixelEvent,
  clearPixelEvents,
  getPixelSettings,
} from "@/server/pixel-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getPixelSettings();
    const { events, stats } = getPixelEvents();

    return NextResponse.json(
      {
        pixelId: settings.pixelId,
        enabled: settings.enabled,
        testEventCode: settings.testEventCode || "",
        stats,
        events,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("GET /api/admin/pixel/events error:", error);
    return NextResponse.json({ error: "Failed to load events telemetry" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.name) {
      return NextResponse.json({ error: "Missing event name" }, { status: 400 });
    }

    const recorded = recordPixelEvent({
      name: String(body.name),
      url: String(body.url || "/"),
      parameters: typeof body.parameters === "object" && body.parameters !== null ? body.parameters : {},
      source: body.source === "test_simulator" ? "test_simulator" : "browser",
      testEventCode: body.testEventCode ? String(body.testEventCode).trim() : undefined,
    });

    return NextResponse.json({ success: true, event: recorded });
  } catch (error) {
    console.error("POST /api/admin/pixel/events error:", error);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    clearPixelEvents();
    return NextResponse.json({ success: true, message: "Activity stream cleared" });
  } catch (error) {
    console.error("DELETE /api/admin/pixel/events error:", error);
    return NextResponse.json({ error: "Failed to clear activity" }, { status: 500 });
  }
}
