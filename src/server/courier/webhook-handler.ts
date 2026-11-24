import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Shipment } from "@/models/Shipment";
import { getCourierAdapter } from "@/server/courier";
import { applyCourierStatus } from "@/server/courier/core/sync";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import type { CourierProvider } from "@/server/courier/core/types";

interface WebhookHandlerOptions {
  request: NextRequest;
  provider: CourierProvider;
  secretEnvName: string;
  signatureHeaderNames: string[];
  idKeys: {
    consignment: string[];
    tracking: string[];
    order: string[];
  };
}

function safeEqual(a: string, b: string): boolean {
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function readFirst(payload: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = payload[key];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (typeof val === "number" && Number.isFinite(val)) return String(val);
  }
  return "";
}

/**
 * Shared fail-closed courier webhook handler:
 *  1. Rate limits by client IP
 *  2. Requires configured webhook secret
 *  3. Verifies HMAC-SHA256 header, Bearer token, or ?token= in constant time
 *  4. Re-fetches authoritative status from the courier API before mutating DB
 */
export async function handleCourierWebhook(opts: WebhookHandlerOptions): Promise<NextResponse> {
  const { request, provider, secretEnvName, signatureHeaderNames, idKeys } = opts;
  const limit = await rateLimit(
    `${provider}:webhook:${hashIp(clientIp(request))}`,
    600,
    60
  );
  if (!limit.allowed) {
    return createRateLimitResponse(limit, "Too many webhook requests.");
  }

  const secret = (process.env[secretEnvName] || "").trim();
  if (!secret) {
    return NextResponse.json(
      { error: `${provider} webhook secret is not configured.` },
      { status: 503 }
    );
  }

  const raw = await request.text();
  const expectedHmac = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const headerValues = signatureHeaderNames
    .map((h) => (request.headers.get(h) || "").trim())
    .filter(Boolean);
  const authHeader = (request.headers.get("authorization") || "").trim();
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const queryToken = new URL(request.url).searchParams.get("token") || "";

  const headerValid = headerValues.some(
    (v) => safeEqual(v, expectedHmac) || safeEqual(v, secret)
  );
  const authorized =
    headerValid || safeEqual(bearerToken, secret) || safeEqual(queryToken, secret);

  if (!authorized) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const nested =
    payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : payload;

  const consignmentId = readFirst(nested, idKeys.consignment) || readFirst(payload, idKeys.consignment);
  const trackingCode = readFirst(nested, idKeys.tracking) || readFirst(payload, idKeys.tracking);
  const orderNumber = readFirst(nested, idKeys.order) || readFirst(payload, idKeys.order);

  if (!consignmentId && !trackingCode && !orderNumber) {
    return NextResponse.json({ error: "No consignment identifier in the payload." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const shipment = await Shipment.findOne({
      provider,
      $or: [
        ...(consignmentId ? [{ consignmentId }] : []),
        ...(trackingCode ? [{ trackingCode }] : []),
        ...(orderNumber ? [{ orderNumber }] : []),
      ],
    });

    if (!shipment) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const adapter = getCourierAdapter(provider);
    if (!adapter.isConfigured()) {
      return NextResponse.json(
        { error: `${provider} credentials are not configured on the server.` },
        { status: 503 }
      );
    }

    // Never trust webhook body status; always verify with courier API directly.
    const statusResult = await adapter.getStatus({
      consignmentId: shipment.consignmentId,
      trackingCode: shipment.trackingCode,
    });

    if (!statusResult.ok || !statusResult.status) {
      return NextResponse.json(
        { error: `Could not verify the delivery status with ${provider}.` },
        { status: 502 }
      );
    }

    await applyCourierStatus(
      shipment,
      statusResult.status,
      statusResult.raw,
      statusResult.rawStatus
    );

    return NextResponse.json({ ok: true, status: statusResult.status });
  } catch (error) {
    console.error(`[${provider} Webhook] error:`, error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
