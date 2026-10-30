import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MetaEventLog } from "@/models/MetaEventLog";
import { getPixelSettings, DEFAULT_TENANT_ID } from "@/server/pixel-settings";

export const dynamic = "force-dynamic";

const ALLOWED_STANDARD_EVENTS = new Set([
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Purchase",
  "Search",
  "Contact",
]);

/**
 * Public ingestion endpoint for storefront browser Pixel telemetry.
 * Stores verified browser events into the durable MetaEventLog collection.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check content-length to prevent unbounded payload abuse (< 16KB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 16384) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventName = String(body.name || "").trim();
    if (!eventName || !ALLOWED_STANDARD_EVENTS.has(eventName)) {
      return NextResponse.json({ error: "Invalid or unsupported event name" }, { status: 400 });
    }

    // 2. Check store settings (tenant strictly locked to angkon-main)
    const settings = await getPixelSettings(DEFAULT_TENANT_ID);
    if (!settings.enabled) {
      return NextResponse.json({ success: true, silenced: true, reason: "tracking_disabled" });
    }

    // Respect event-level toggles
    if (eventName === "PageView" && settings.trackPageView === false) {
      return NextResponse.json({ success: true, silenced: true });
    }
    if (eventName === "ViewContent" && settings.trackViewContent === false) {
      return NextResponse.json({ success: true, silenced: true });
    }
    if (eventName === "AddToCart" && settings.trackAddToCart === false) {
      return NextResponse.json({ success: true, silenced: true });
    }
    if (eventName === "InitiateCheckout" && settings.trackInitiateCheckout === false) {
      return NextResponse.json({ success: true, silenced: true });
    }
    if (eventName === "Purchase" && settings.trackPurchase === false) {
      return NextResponse.json({ success: true, silenced: true });
    }

    const rawEventId =
      typeof body.eventId === "string"
        ? body.eventId
        : typeof body.parameters?.eventId === "string"
        ? (body.parameters.eventId as string)
        : typeof body.parameters?.event_id === "string"
        ? (body.parameters.event_id as string)
        : typeof body.parameters?.order_id === "string"
        ? `order_${body.parameters.order_id}`
        : `browser_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const eventId = String(rawEventId).trim().slice(0, 100);
    const url = typeof body.url === "string" ? body.url.slice(0, 500) : "/";
    const testEventCode =
      typeof body.testEventCode === "string" && body.testEventCode.trim()
        ? body.testEventCode.trim().slice(0, 50)
        : settings.testEventCode || undefined;

    // Sanitize parameters: only allow safe e-commerce metrics (no passwords, tokens, PII)
    const sanitizedParams: Record<string, unknown> = {};
    if (body.parameters && typeof body.parameters === "object") {
      const p = body.parameters as Record<string, unknown>;
      if (typeof p.value === "number") sanitizedParams.value = p.value;
      if (typeof p.currency === "string") sanitizedParams.currency = p.currency;
      if (p.order_id) sanitizedParams.order_id = String(p.order_id);
      if (typeof p.num_items === "number") sanitizedParams.num_items = p.num_items;
      if (typeof p.content_name === "string") sanitizedParams.content_name = p.content_name.slice(0, 150);
      if (typeof p.content_type === "string") sanitizedParams.content_type = p.content_type.slice(0, 50);
      if (Array.isArray(p.content_ids)) sanitizedParams.content_ids = p.content_ids.slice(0, 10);
    }

    await connectToDatabase();

    // Check if matching server event already exists for deduplication
    const matchingServerEvent = await MetaEventLog.findOne({
      tenantId: DEFAULT_TENANT_ID,
      eventId,
      source: "server",
    }).lean();

    const isDeduplicated = Boolean(matchingServerEvent);

    const doc = await MetaEventLog.findOneAndUpdate(
      { tenantId: DEFAULT_TENANT_ID, eventId, source: "browser" },
      {
        $set: {
          tenantId: DEFAULT_TENANT_ID,
          eventName,
          eventId,
          source: "browser",
          status: "accepted",
          eventTime: Math.floor(Date.now() / 1000),
          url,
          parameters: sanitizedParams,
          testEventCode,
          isDeduplicated,
          orderId: sanitizedParams.order_id ? String(sanitizedParams.order_id) : undefined,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // If matching server event exists, update it to reflect deduplication pairing
    if (isDeduplicated) {
      await MetaEventLog.updateOne(
        { tenantId: DEFAULT_TENANT_ID, eventId, source: "server" },
        { $set: { isDeduplicated: true } }
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      eventId,
      deduplicated: isDeduplicated,
      id: String(doc._id),
    });
  } catch (error) {
    console.warn("[Meta Ingest] Ingestion warning:", error);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
