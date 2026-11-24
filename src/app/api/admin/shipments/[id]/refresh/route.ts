import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Shipment } from "@/models/Shipment";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { getCourierAdapter, courierService } from "@/server/courier";
import { applyCourierStatus } from "@/server/courier/core/sync";
import { serializeShipment } from "@/server/courier/core/serialize";
import { getCourierLabel } from "@/server/courier/core/tracking";
import type { CourierErrorCode } from "@/server/courier/core/types";

export const dynamic = "force-dynamic";

const FAILURE_STATUS: Record<CourierErrorCode, number> = {
  "not-configured": 503,
  auth: 502,
  validation: 422,
  duplicate: 409,
  "rate-limited": 429,
  timeout: 504,
  upstream: 502,
};

/** POST — pull the latest status from the courier and update the order. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectToDatabase();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { consignmentId: id }, { trackingCode: id }, { orderNumber: id }] }
      : { $or: [{ consignmentId: id }, { trackingCode: id }, { orderNumber: id }] };

    const shipment = await Shipment.findOne(query);
    if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    const adapter = getCourierAdapter(shipment.provider, {
      mode: shipment.mode,
      forceLive: shipment.mode === "live" || shipment.isMock === false,
    });
    if (!adapter.isConfigured()) {
      return NextResponse.json(
        {
          error: `${getCourierLabel(shipment.provider)} credentials are not configured on the server.`,
          code: "not-configured",
        },
        { status: 503 }
      );
    }

    if (!shipment.consignmentId && !shipment.trackingCode) {
      return NextResponse.json(
        {
          ok: false,
          code: "no-consignment",
          error:
            "This shipment has no consignment or tracking code yet — retry the booking first.",
        },
        { status: 409 }
      );
    }

    const result = await adapter.getStatus({
      consignmentId: shipment.consignmentId,
      trackingCode: shipment.trackingCode,
    });

    if (!result.ok || !result.status) {
      const code = result.error?.code || "upstream";
      shipment.error = result.error?.message || "Could not read the courier status.";
      shipment.lastSyncedAt = new Date();
      await shipment.save();
      await courierService.logEvent({
        provider: shipment.provider,
        action: "status_sync",
        orderId: shipment.orderId,
        orderNumber: shipment.orderNumber,
        consignmentId: shipment.consignmentId || "",
        ok: false,
        httpStatus: FAILURE_STATUS[code] ?? 502,
        errorCode: code,
        message: shipment.error,
        actor: auth.user || "admin",
      });
      return NextResponse.json(
        { ok: false, code, error: shipment.error },
        { status: FAILURE_STATUS[code] ?? 502 }
      );
    }

    const applied = await applyCourierStatus(
      shipment,
      result.status,
      result.raw,
      result.rawStatus
    );

    await courierService.logEvent({
      provider: shipment.provider,
      action: "status_sync",
      orderId: shipment.orderId,
      orderNumber: shipment.orderNumber,
      consignmentId: shipment.consignmentId || "",
      ok: true,
      httpStatus: 200,
      message: `Synced status: ${result.rawStatus || result.status}`,
      actor: auth.user || "admin",
    });

    const refreshed = await Shipment.findById(shipment._id);
    return NextResponse.json({
      ok: true,
      changed: applied.changed,
      shipment: refreshed ? serializeShipment(refreshed) : serializeShipment(shipment),
    });
  } catch (error) {
    console.error("POST /api/admin/shipments/[id]/refresh error:", error);
    return NextResponse.json(
      { error: "Could not refresh the courier status." },
      { status: 500 }
    );
  }
}
