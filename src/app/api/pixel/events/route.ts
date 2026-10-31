import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MetaEventLog } from "@/models/MetaEventLog";
import { getPixelSettings, DEFAULT_TENANT_ID } from "@/server/pixel-settings";
import { sendMetaCapiEvent } from "@/server/meta-capi";

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
      if (Array.isArray(p.contents)) {
        sanitizedParams.contents = p.contents.slice(0, 20).map((c: unknown) => {
          if (c && typeof c === "object") {
            const item = c as Record<string, unknown>;
            return {
              id: String(item.id || "").trim().slice(0, 50),
              quantity: typeof item.quantity === "number" ? item.quantity : 1,
              ...(typeof item.item_price === "number" ? { item_price: item.item_price } : {}),
            };
          }
          return { id: String(c || "").trim().slice(0, 50), quantity: 1 };
        });
      }
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
    } else if (
      eventName !== "Purchase" &&
      settings.enabled &&
      settings.capiAccessToken
    ) {
      // For non-Purchase standard storefront events (AddToCart, ViewContent, InitiateCheckout, PageView),
      // asynchronously forward to Meta Conversions API (CAPI) on the server side so Meta receives both
      // Browser and Server copies with identical event_name and event_id for full deduplication.
      // (Purchase is handled authoritatively by /api/orders upon verified order creation).
      const origin =
        request.nextUrl.origin && !request.nextUrl.origin.includes("localhost")
          ? request.nextUrl.origin
          : "https://www.angkon.net";
      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined;
      const clientUserAgent = request.headers.get("user-agent") || undefined;
      const fbp = request.cookies.get("_fbp")?.value;
      const fbc = request.cookies.get("_fbc")?.value;

      sendMetaCapiEvent(
        {
          eventName,
          eventId,
          eventSourceUrl: `${origin}${url}`,
          actionSource: "website",
          customData: sanitizedParams,
          userData: {
            clientIp,
            clientUserAgent,
            fbp,
            fbc,
          },
          testEventCode,
          tenantId: DEFAULT_TENANT_ID,
        },
        settings.capiAccessToken,
        settings.pixelId
      ).catch((err) => {
        console.warn(`[Meta Ingest] CAPI forward failed for ${eventName}:`, err);
      });
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
