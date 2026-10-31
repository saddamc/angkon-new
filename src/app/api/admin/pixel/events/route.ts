import { NextRequest, NextResponse } from "next/server";
import {
  getDurablePixelEvents,
  recordPixelEvent,
  clearPixelEvents,
  getPixelSettings,
} from "@/server/pixel-settings";
import { requireSuperAdminSession } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [settings, durable] = await Promise.all([
      getPixelSettings(auth.tenantId),
      getDurablePixelEvents(auth.tenantId, 250),
    ]);

    return NextResponse.json(
      {
        tenantId: auth.tenantId,
        pixelId: settings.pixelId,
        enabled: settings.enabled,
        testEventCode: settings.testEventCode || "",
        stats: durable.stats,
        deliveryStats: durable.deliveryStats,
        deduplicationStats: durable.deduplicationStats,
        events: durable.events,
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
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body?.name) {
      return NextResponse.json({ error: "Missing event name" }, { status: 400 });
    }

    const recorded = recordPixelEvent({
      tenantId: auth.tenantId,
      name: String(body.name),
      url: String(body.url || "/"),
      parameters: typeof body.parameters === "object" && body.parameters !== null ? body.parameters : {},
      source: body.source === "test_simulator" ? "test_simulator" : body.source === "server" ? "server" : "browser",
      testEventCode: body.testEventCode ? String(body.testEventCode).trim() : undefined,
      eventId:
        typeof body.eventId === "string"
          ? body.eventId
          : typeof body.parameters?.eventId === "string"
          ? (body.parameters.eventId as string)
          : undefined,
      status: body.status === "delivered" ? "delivered" : body.status === "failed" ? "failed" : "dispatched",
      error: typeof body.error === "string" ? body.error : undefined,
    });

    return NextResponse.json({ success: true, event: recorded });
  } catch (error) {
    console.error("POST /api/admin/pixel/events error:", error);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    clearPixelEvents(auth.tenantId);
    return NextResponse.json({ success: true, message: "Activity stream cleared" });
  } catch (error) {
    console.error("DELETE /api/admin/pixel/events error:", error);
    return NextResponse.json({ error: "Failed to clear activity" }, { status: 500 });
  }
}
