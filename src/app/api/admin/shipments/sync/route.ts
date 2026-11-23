import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Shipment } from "@/models/Shipment";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { getCourierAdapter, courierService } from "@/server/courier";
import { applyCourierStatus } from "@/server/courier/sync";
import { ACTIVE_SHIPMENT_STATUSES } from "@/server/courier/steadfast-utils";

export const dynamic = "force-dynamic";

/** POST — pull latest courier status for all active shipments. */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const activeShipments = await Shipment.find({
      $or: [
        { status: { $in: [...ACTIVE_SHIPMENT_STATUSES, "unknown"] } },
        { status: "cancelled", createdAt: { $gte: sevenDaysAgo } },
      ],
      $and: [
        {
          $or: [
            { consignmentId: { $exists: true, $nin: ["", null] } },
            { trackingCode: { $exists: true, $nin: ["", null] } },
          ],
        },
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
          action: "bulk_sync",
          orderId: shipment.orderId,
          orderNumber: shipment.orderNumber,
          consignmentId: shipment.consignmentId || "",
          ok: false,
          errorCode: result.error?.code || "upstream",
          message: shipment.error,
          actor: auth.user || "admin",
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
      action: "bulk_sync",
      ok: failed === 0,
      httpStatus: 200,
      message: `Bulk sync complete: ${synced} synced, ${changed} changed, ${failed} failed (scanned ${activeShipments.length}).`,
      actor: auth.user || "admin",
    });

    return NextResponse.json({
      ok: true,
      scanned: activeShipments.length,
      synced,
      changed,
      failed,
    });
  } catch (error) {
    console.error("POST /api/admin/shipments/sync error:", error);
    return NextResponse.json(
      { error: "Could not sync active shipments." },
      { status: 500 }
    );
  }
}
