import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { getProviderConfigSummary } from "@/server/courier";
import { computeOrderFinancials } from "@/server/orders/workflow";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeCsvCell(value: unknown): string {
  let str = String(value ?? "");
  // Prevent CSV spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseDateBoundary(raw: string | null, endOfDay: boolean): Date | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
    : trimmed;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET /api/admin/orders — list orders with filters, KPI summary, and CSV export
export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get("per_page") ?? "20", 10) || 20));
  const status = (searchParams.get("status") ?? "any").trim().toLowerCase();
  const paymentStatus = (searchParams.get("payment_status") ?? "any").trim().toLowerCase();
  const shipmentStatus = (searchParams.get("shipment_status") ?? "any").trim().toLowerCase();
  const courierFilter = (searchParams.get("courier") ?? "").trim().toLowerCase();
  const search = (searchParams.get("search") ?? "").trim();
  const dateFrom = parseDateBoundary(searchParams.get("date_from"), false);
  const dateTo = parseDateBoundary(searchParams.get("date_to"), true);
  const exportFormat = (searchParams.get("export") ?? "").trim().toLowerCase();

  try {
    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andClauses: Record<string, any>[] = [];

    if (status && status !== "any") {
      if (status === "needs_action") {
        andClauses.push({
          $or: [
            { orderStatus: "pending" },
            {
              paymentMethod: "sslcommerz",
              paymentStatus: { $ne: "paid" },
              orderStatus: { $nin: ["cancelled", "refunded", "failed"] },
            },
            { shipmentBookingState: "booking_failed" },
            {
              orderStatus: { $in: ["confirmed", "processing", "ready_to_ship"] },
              shipmentBookingState: { $in: ["not_booked", "booking_failed", "", null] },
            },
            {
              orderStatus: { $in: ["delivered", "completed"] },
              codSettlementStatus: "collected",
            },
          ],
        });
      } else if (status === "delivered") {
        andClauses.push({ orderStatus: { $in: ["delivered", "completed"] } });
      } else if (status === "returned") {
        andClauses.push({ orderStatus: { $in: ["returned", "refunded"] } });
      } else {
        andClauses.push({ orderStatus: status });
      }
    }

    if (paymentStatus && paymentStatus !== "any") {
      if (paymentStatus === "issues") {
        andClauses.push({
          paymentMethod: "sslcommerz",
          paymentStatus: { $ne: "paid" },
          orderStatus: { $nin: ["cancelled", "refunded", "failed"] },
        });
      } else {
        andClauses.push({ paymentStatus });
      }
    }

    if (shipmentStatus && shipmentStatus !== "any") {
      if (shipmentStatus === "none" || shipmentStatus === "not_booked") {
        andClauses.push({
          $or: [
            { shipmentStatus: { $in: ["none", "", null] } },
            { shipmentStatus: { $exists: false } },
          ],
        });
      } else if (shipmentStatus === "in_transit") {
        andClauses.push({
          shipmentStatus: { $in: ["in_transit", "out_for_delivery", "partial_delivered"] },
        });
      } else {
        andClauses.push({ shipmentStatus });
      }
    }

    if (courierFilter === "unassigned") {
      andClauses.push({
        $or: [{ courier: { $exists: false } }, { courier: "" }, { courier: null }],
      });
    } else if (courierFilter && courierFilter !== "any") {
      andClauses.push({ courier: courierFilter });
    }

    if (dateFrom || dateTo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createdAtRange: Record<string, any> = {};
      if (dateFrom) createdAtRange.$gte = dateFrom;
      if (dateTo) createdAtRange.$lte = dateTo;
      andClauses.push({ createdAt: createdAtRange });
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      andClauses.push({
        $or: [
          { orderNumber: rx },
          { "customer.fullName": rx },
          { "customer.phone": rx },
          { "customer.email": rx },
          { trackingCode: rx },
          { consignmentId: rx },
        ],
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> =
      andClauses.length === 1 ? andClauses[0] : andClauses.length > 1 ? { $and: andClauses } : {};

    // Export mode returns up to 2000 matching rows as CSV cleanly
    if (exportFormat === "csv") {
      const exportOrders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean();

      const header = [
        "Order Number",
        "Date",
        "Customer Name",
        "Phone",
        "Email",
        "City/District",
        "Items",
        "Order Total",
        "Paid Amount",
        "Outstanding/COD",
        "Payment Method",
        "Payment Status",
        "Courier",
        "Consignment ID",
        "Tracking Code",
        "Shipment Status",
        "COD Settlement Status",
        "Order Status",
      ];

      const lines = [header.map(escapeCsvCell).join(",")];
      for (const o of exportOrders) {
        const fin = computeOrderFinancials(o);
        const itemSummary = (o.items || [])
          .map((i) => `${i.name} x${i.quantity}`)
          .join(" | ");
        lines.push(
          [
            o.orderNumber,
            o.createdAt ? new Date(o.createdAt).toISOString() : "",
            o.customer?.fullName || "",
            o.customer?.phone || "",
            o.customer?.email || "",
            o.customer?.district || o.customer?.city || "",
            itemSummary,
            fin.orderTotal,
            fin.advancePaidAmount,
            fin.outstandingAmount,
            o.paymentMethod || "",
            o.paymentStatus || "",
            o.courier || "",
            o.consignmentId || "",
            o.trackingCode || "",
            o.shipmentStatus || "none",
            fin.codSettlementStatus,
            o.orderStatus || "",
          ]
            .map(escapeCsvCell)
            .join(",")
        );
      }

      return new NextResponse(lines.join("\r\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="angkon-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const skip = (page - 1) * perPage;

    const [total, orders, groupedCounts, kpiAgg] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
      Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $in: ["$orderStatus", ["cancelled", "returned", "refunded", "failed"]] },
                  0,
                  "$total",
                ],
              },
            },
            paidRevenue: {
              $sum: {
                $cond: [
                  { $in: ["$orderStatus", ["cancelled", "refunded", "failed"]] },
                  0,
                  {
                    $cond: [
                      { $eq: ["$paymentStatus", "paid"] },
                      "$total",
                      { $ifNull: ["$paidAmount", 0] },
                    ],
                  },
                ],
              },
            },
            codCollectedAwaitingSettlement: {
              $sum: {
                $cond: [
                  { $eq: ["$codSettlementStatus", "collected"] },
                  { $ifNull: ["$collectedCodAmount", 0] },
                  0,
                ],
              },
            },
            codCollectedCount: {
              $sum: { $cond: [{ $eq: ["$codSettlementStatus", "collected"] }, 1, 0] },
            },
            discrepancyCount: {
              $sum: { $cond: [{ $eq: ["$codSettlementStatus", "discrepancy"] }, 1, 0] },
            },
            activeShipments: {
              $sum: {
                $cond: [
                  { $in: ["$shipmentStatus", ["created", "pending", "in_transit", "out_for_delivery", "partial_delivered", "hold", "in_review"]] },
                  1,
                  0,
                ],
              },
            },
            paymentIssuesCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$paymentMethod", "sslcommerz"] },
                      { $ne: ["$paymentStatus", "paid"] },
                      { $not: { $in: ["$orderStatus", ["cancelled", "refunded", "failed"]] } },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            needsActionCount: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$orderStatus", "pending"] },
                      {
                        $and: [
                          { $eq: ["$paymentMethod", "sslcommerz"] },
                          { $ne: ["$paymentStatus", "paid"] },
                          { $not: { $in: ["$orderStatus", ["cancelled", "refunded", "failed"]] } },
                        ],
                      },
                      { $eq: ["$shipmentBookingState", "booking_failed"] },
                      {
                        $and: [
                          { $in: ["$orderStatus", ["confirmed", "processing", "ready_to_ship"]] },
                          { $in: ["$shipmentBookingState", ["not_booked", "booking_failed", "", null]] },
                        ],
                      },
                      {
                        $and: [
                          { $in: ["$orderStatus", ["delivered", "completed"]] },
                          { $eq: ["$codSettlementStatus", "collected"] },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const statusCounts: Record<string, number> = { any: 0 };
    for (const row of groupedCounts) {
      if (row._id) {
        statusCounts[String(row._id)] = Number(row.count) || 0;
        statusCounts.any += Number(row.count) || 0;
      }
    }
    const kpiRaw = kpiAgg[0] || {};
    statusCounts.needs_action = Number(kpiRaw.needsActionCount || 0);

    const totalRevenue = Number(kpiRaw.totalRevenue || 0);
    const paidRevenue = Number(kpiRaw.paidRevenue || 0);

    const summary = {
      totalOrders: statusCounts.any,
      pendingCount: statusCounts.pending || 0,
      readyToShipCount:
        (statusCounts.confirmed || 0) +
        (statusCounts.processing || 0) +
        (statusCounts.ready_to_ship || 0),
      shippedCount: statusCounts.shipped || 0,
      deliveredCount: (statusCounts.delivered || 0) + (statusCounts.completed || 0),
      cancelledReturnedCount:
        (statusCounts.cancelled || 0) +
        (statusCounts.returned || 0) +
        (statusCounts.refunded || 0),
      activeShipments: Number(kpiRaw.activeShipments || 0),
      paymentIssuesCount: Number(kpiRaw.paymentIssuesCount || 0),
      needsActionCount: Number(kpiRaw.needsActionCount || 0),
      totalRevenue: Math.round(totalRevenue),
      paidRevenue: Math.round(paidRevenue),
      outstandingBalance: Math.max(0, Math.round(totalRevenue - paidRevenue)),
      codCollectedAwaitingSettlement: Math.round(
        Number(kpiRaw.codCollectedAwaitingSettlement || 0)
      ),
      codCollectedCount: Number(kpiRaw.codCollectedCount || 0),
      discrepancyCount: Number(kpiRaw.discrepancyCount || 0),
    };

    const totalPages = Math.ceil(total / perPage) || 1;

    const userIds = orders
      .map((o) => (o.userId ? String(o.userId) : ""))
      .filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users: any[] = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select("email")
          .lean()
      : [];
    const userEmailMap = new Map<string, string>(
      users.map((u) => [String(u._id), String(u.email || "")])
    );

    const formattedOrders = orders.map((o) => {
      const financials = computeOrderFinancials(o);
      return {
        id: o.orderNumber,
        number: o.orderNumber,
        status: o.orderStatus,
        paymentStatus: o.paymentStatus || (o.orderStatus === "completed" ? "paid" : "pending"),
        payment_status: o.paymentStatus || (o.orderStatus === "completed" ? "paid" : "pending"),
        paymentMethod: o.paymentMethod || "cod",
        channel: o.channel || "website",
        courier: o.courier || "",
        courierOperatingMode: o.courierOperatingMode || "mock",
        courierIsMock: o.courierIsMock ?? true,
        courierConfirmedByAdminId: o.courierConfirmedByAdminId || null,
        courierConfirmedAt: o.courierConfirmedAt || null,
        isTestOrder: Boolean(o.isTestOrder),
        shipmentStatus: o.shipmentStatus || "none",
        shipmentBookingState: o.shipmentBookingState || "not_booked",
        trackingCode: o.trackingCode || "",
        consignmentId: o.consignmentId || "",
        date_created: o.createdAt,
        total: String(o.total),
        subtotal: Number(o.subtotal || 0),
        discount: Number(o.discount || 0),
        shipping_total: String(o.shippingFee),
        paidAmount: financials.advancePaidAmount,
        outstandingAmount: financials.outstandingAmount,
        expectedCodAmount: financials.expectedCodAmount,
        collectedCodAmount: financials.collectedCodAmount,
        settledCodAmount: financials.settledCodAmount,
        courierCharge: financials.courierCharge,
        discrepancyAmount: financials.discrepancyAmount,
        codSettlementStatus: financials.codSettlementStatus,
        payment_method_title:
          o.paymentMethod === "sslcommerz"
            ? "SSLCOMMERZ"
            : o.paymentMethod === "cod"
              ? "Cash on Delivery"
              : String(o.paymentMethod || "COD").toUpperCase(),
        billing: {
          first_name: o.customer?.fullName || "Guest",
          last_name: "",
          email: o.customer?.email || (o.userId ? userEmailMap.get(String(o.userId)) || "" : ""),
          phone: o.customer?.phone || "",
          address_1: o.customer?.address || "",
          city: o.customer?.district || o.customer?.city || "",
        },
        line_items: (o.items || []).map((it) => ({
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          size: it.size || "",
          color: it.color || "",
          image: it.image ? { src: it.image } : undefined,
          meta_data: [
            ...(it.size ? [{ key: "Size", value: it.size }] : []),
            ...(it.color ? [{ key: "Color", value: it.color }] : []),
          ],
        })),
        raw: o,
      };
    });

    const providers = getProviderConfigSummary();
    return NextResponse.json(
      {
        orders: formattedOrders,
        total,
        totalPages,
        page,
        statusCounts,
        summary,
        courierProviders: {
          steadfast: providers.steadfast,
          pathao: providers.pathao,
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    console.error("MongoDB admin orders fetch error:", err);
    return NextResponse.json(
      { error: "Orders are temporarily unavailable. Please retry." },
      { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
