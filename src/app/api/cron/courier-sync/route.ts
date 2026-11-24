import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Shipment } from "@/models/Shipment";
import { getCourierAdapter, courierService } from "@/server/courier";
import { applyCourierStatus } from "@/server/courier/core/sync";
import { getCronSecret } from "@/lib/env";
import { verifyAdminToken } from "@/server/auth/admin-auth";
import { ACTIVE_SHIPMENT_STATUSES } from "@/server/courier/providers/steadfast/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function runCourierSync(actor: string) {
  await connectToDatabase();

  const activeShipments = await Shipment.find({
    status: { $in: ACTIVE_SHIPMENT_STATUSES },
    $or: [
      { consignmentId: { $exists: true, $nin: ["", null] } },
      { trackingCode: { $exists: true, $nin: ["", null] } },
    ],
  })
    .sort({ lastSyncedAt: 1, createdAt: 1 })
    .limit(30);

  let synced = 0;
  let changed = 0;
  let failed = 0;

  for (const shipment of activeShipments) {
    const adapter = getCourierAdapter(shipment.provider, {
      mode: shipment.mode,
      forceLive: shipment.mode === "live" || shipment.isMock === false,
    });
    if (!adapter.isConfigured()) continue;

    const result = await adapter.getStatus({
      consignmentId: shipment.consignmentId,
      trackingCode: shipment.trackingCode,
    });

    if (!result.ok || !result.status) {
      failed += 1;
      shipment.error = result.error?.message || "Could not read courier status.";
      shipment.lastSyncedAt = new Date();
      await shipment.save();
      await courierService.logEvent({
        provider: shipment.provider,
        action: "cron_sync",
        orderId: shipment.orderId,
        orderNumber: shipment.orderNumber,
        consignmentId: shipment.consignmentId || "",
        ok: false,
        errorCode: result.error?.code || "upstream",
        message: shipment.error,
        actor,
      });
      continue;
    }

    const applied = await applyCourierStatus(
      shipment,
      result.status,
      result.raw,
      result.rawStatus
    );
    synced += 1;
    if (applied.changed) changed += 1;
  }

  await courierService.logEvent({
    provider: "steadfast",
    action: "cron_sync",
    ok: failed === 0,
    httpStatus: 200,
    message: `Cron sync finished: ${synced} synced, ${changed} changed, ${failed} failed (scanned ${activeShipments.length}).`,
    actor,
  });

  return {
    scanned: activeShipments.length,
    synced,
    changed,
    failed,
  };
}

async function handleRequest(request: NextRequest) {
  const cronSecret = getCronSecret();
  const authHeader = request.headers.get("authorization") || "";
  const querySecret = request.nextUrl.searchParams.get("secret") || "";

  let authorized = false;
  let actor = "cron";

  if (
    cronSecret &&
    (safeEqual(authHeader, `Bearer ${cronSecret}`) || safeEqual(querySecret, cronSecret))
  ) {
    authorized = true;
  } else {
    // Check admin session
    const token = request.cookies.get("nb_admin_token")?.value;
    if (token) {
      const verified = await verifyAdminToken(token);
      if (verified.valid) {
        authorized = true;
        actor = verified.user || "admin";
      }
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Valid CRON_SECRET or admin session required." },
      { status: 401 }
    );
  }

  try {
    const summary = await runCourierSync(actor);
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...summary,
    });
  } catch (error: any) {
    console.error("[Courier Cron Sync Error]:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Courier sync failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
