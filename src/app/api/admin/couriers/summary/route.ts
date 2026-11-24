import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Shipment } from "@/models/Shipment";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/couriers/summary — shipment KPIs and recent consignments.
export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [agg] = await Shipment.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $in: ["$status", ["created", "pending", "pickup_pending"]] }, 1, 0],
            },
          },
          inTransit: {
            $sum: {
              $cond: [
                { $in: ["$status", ["picked_up", "in_transit", "out_for_delivery"]] },
                1,
                0,
              ],
            },
          },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
          failed: {
            $sum: {
              $cond: [{ $in: ["$status", ["failed", "cancelled", "booking_failed"]] }, 1, 0],
            },
          },
          last7d: { $sum: { $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0] } },
          codInFlight: {
            $sum: {
              $cond: [
                { $in: ["$status", ["picked_up", "in_transit", "out_for_delivery"]] },
                { $ifNull: ["$codAmount", 0] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const recent = await Shipment.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .select(
        "orderNumber provider status consignmentId trackingCode mode isMock createdAt lastSyncedAt codAmount"
      )
      .lean();

    return NextResponse.json(
      {
        stats: {
          total: Number(agg?.total || 0),
          pending: Number(agg?.pending || 0),
          inTransit: Number(agg?.inTransit || 0),
          delivered: Number(agg?.delivered || 0),
          failed: Number(agg?.failed || 0),
          last7d: Number(agg?.last7d || 0),
          codInFlight: Math.round(Number(agg?.codInFlight || 0)),
        },
        shipments: recent.map((s) => ({
          id: String(s._id),
          orderNumber: s.orderNumber,
          provider: s.provider,
          status: s.status,
          consignmentId: s.consignmentId || "",
          trackingCode: s.trackingCode || "",
          mode: s.mode || "mock",
          isMock: s.isMock !== false,
          codAmount: Number(s.codAmount || 0),
          createdAt: s.createdAt,
          lastSyncedAt: s.lastSyncedAt || null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Courier summary error:", err);
    return NextResponse.json({ error: "Could not load courier summary." }, { status: 503 });
  }
}
