import crypto from "crypto";
import { NextRequest, NextResponse, after } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Shipment } from "@/models/Shipment";
import { CourierLog } from "@/models/CourierLog";
import { getCourierAdapter } from "@/server/courier";
import { applyCourierStatus } from "@/server/courier/sync";
import { mapSteadfastStatus } from "@/server/courier/steadfast-utils";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Steadfast delivery webhook.
 *
 * Production Reliability Guarantees:
 *  1. Authenticates via HMAC-SHA256 `x-steadfast-signature`, `Authorization: Bearer <token>`,
 *     or `?token=` query parameter against STEADFAST_WEBHOOK_TOKEN / STEADFAST_WEBHOOK_SECRET.
 *  2. Constant-time timingSafeEqual verification with length check.
 *  3. Durably persists the event to CourierLog and Shipment timeline.
 *  4. Evaluates status transitions via the finite state engine (preventing regression from
 *     delivered, while supporting legitimate returns).
 *  5. Synchronous re-fetch is REMOVED from the critical path: returns HTTP 200 immediately
 *     after local persistence so Steadfast never times out or drops notifications.
 *  6. Optional background tracking reconciliation executes asynchronously via Next.js `after()`.
 *  7. Unknown consignments return HTTP 200 with `{ ok: true, ignored: true }` to prevent
 *     infinite retry loops from the courier gateway.
 */
export async function POST(request: NextRequest) {
  // Webhooks are authenticated below by HMAC/token, so the IP ceiling is a
  // coarse flood guard, not a customer-facing limit. Hashing avoids storing
  // raw courier IPs.
  const limit = await rateLimit(
    `steadfast:webhook:${hashIp(clientIp(request))}`,
    600,
    60
  );
  if (!limit.allowed) {
    return createRateLimitResponse(limit, "Too many webhook requests.");
  }

  const raw = await request.text();
  const secret = (
    process.env.STEADFAST_WEBHOOK_TOKEN ||
    process.env.STEADFAST_WEBHOOK_SECRET ||
    ""
  ).trim();

  if (!secret) {
    return NextResponse.json(
      { error: "Steadfast webhook secret is not configured." },
      { status: 503 }
    );
  }

  // ── Authentication Check ───────────────────────────────────────────────────
  const signature = (request.headers.get("x-steadfast-signature") || "").trim();
  const authHeader = (request.headers.get("authorization") || "").trim();
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const token = new URL(request.url).searchParams.get("token") || "";
  const expectedHmac = crypto.createHmac("sha256", secret).update(raw).digest("hex");

  const safeEqual = (a: string, b: string) =>
    typeof a === "string" &&
    typeof b === "string" &&
    a.length > 0 &&
    a.length === b.length &&
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

  const signatureValid = safeEqual(signature, expectedHmac);
  const bearerValid = safeEqual(bearerToken, secret);
  const tokenValid = safeEqual(token, secret);

  if (!signatureValid && !bearerValid && !tokenValid) {
    return NextResponse.json({ error: "Invalid webhook credentials." }, { status: 401 });
  }

  // ── Payload Parsing & Normalization ────────────────────────────────────────
  let payload: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const read = (keys: string[]) => {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
  };

  const consignmentId = read(["consignment_id", "consignmentId", "cid"]);
  const trackingCode = read(["tracking_code", "trackingCode"]);
  const orderNumber = read(["invoice", "order_number", "orderNumber"]);
  const rawStatus = read(["status", "delivery_status", "deliveryStatus"]);

  if (!consignmentId && !trackingCode && !orderNumber) {
    return NextResponse.json(
      { error: "No consignment identifier in the payload." },
      { status: 400 }
    );
  }

  const normalizedStatus = mapSteadfastStatus(rawStatus || "pending");

  try {
    await connectToDatabase();

    const shipment = await Shipment.findOne({
      provider: "steadfast",
      $or: [
        ...(consignmentId ? [{ consignmentId }] : []),
        ...(trackingCode ? [{ trackingCode }] : []),
        ...(orderNumber ? [{ orderNumber }] : []),
      ],
    });

    // Durable logging of incoming webhook event
    try {
      await CourierLog.create({
        provider: "steadfast",
        action: "webhook",
        orderId: shipment?.orderId || null,
        orderNumber: shipment?.orderNumber || orderNumber || "",
        consignmentId: shipment?.consignmentId || consignmentId || "",
        ok: true,
        message: `Webhook received for ${orderNumber || consignmentId}: status=${rawStatus} (mapped=${normalizedStatus})`,
        actor: "steadfast_webhook",
      });
    } catch (logErr) {
      console.warn("[Steadfast Webhook] Failed to write CourierLog:", logErr);
    }

    if (!shipment) {
      // Return 200 ignored so Steadfast does not retry unknown consignments forever
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Apply courier status synchronously into durable database storage
    const syncResult = await applyCourierStatus(
      shipment,
      normalizedStatus,
      payload,
      rawStatus
    );

    // Asynchronous background tracking reconciliation:
    // Does NOT block HTTP 200 response to Steadfast
    const activeConsignment = shipment.consignmentId || consignmentId;
    const activeTracking = shipment.trackingCode || trackingCode;
    const runAsyncReconciliation = async () => {
      try {
        const adapter = getCourierAdapter("steadfast");
        if (adapter.isConfigured() && (activeConsignment || activeTracking)) {
          const freshStatus = await adapter.getStatus({
            consignmentId: activeConsignment,
            trackingCode: activeTracking,
          });
          if (freshStatus.ok && freshStatus.status) {
            // Apply verified fresh details
            const reloaded = await Shipment.findById(shipment._id);
            if (reloaded) {
              await applyCourierStatus(
                reloaded,
                freshStatus.status,
                freshStatus.raw,
                freshStatus.rawStatus
              );
            }
          }
        }
      } catch (asyncErr) {
        console.warn("[Steadfast Webhook] Async background reconciliation error:", asyncErr);
      }
    };

    if (typeof after === "function") {
      after(runAsyncReconciliation);
    } else {
      void runAsyncReconciliation();
    }

    return NextResponse.json({
      ok: true,
      status: normalizedStatus,
      changed: syncResult.changed,
      duplicate: syncResult.idempotent ?? false,
      rejected: syncResult.rejected ?? false,
      reason: syncResult.reason,
    });
  } catch (error) {
    console.error("[Steadfast Webhook] processing error:", error);
    try {
      await CourierLog.create({
        provider: "steadfast",
        action: "webhook",
        orderNumber: orderNumber || "",
        consignmentId: consignmentId || "",
        ok: false,
        message: error instanceof Error ? error.message : "Webhook processing exception",
        actor: "steadfast_webhook",
      });
    } catch {
      // Ignore secondary log error
    }
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
