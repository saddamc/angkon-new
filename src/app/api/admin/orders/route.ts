import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Shipment } from "@/models/Shipment";
import { User } from "@/models/User";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { getProviderConfigSummary } from "@/server/courier";
import { computeOrderFinancials } from "@/server/orders/workflow";
import { nextOrderNumber } from "@/server/order-number";
import {
  reserveStockForOrder,
  commitStockForOrder,
  restoreReservedItems,
} from "@/server/stock";
import { getAllDbProducts } from "@/lib/db/products";
import { calculateShipping } from "@/lib/shipping";
import { getProductDeliveryRates, getShippingSettings } from "@/server/shipping";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/rate-limit";
import { ONLINE_PAYMENT_METHODS } from "@/lib/payment-methods";
import REAL_PRODUCTS from "@/data/real-products.json";

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
  const showTestOrders =
    searchParams.get("show_test_orders") === "true" ||
    searchParams.get("showTestOrders") === "true";

  try {
    await connectToDatabase();

    // A booking that has been "in progress" longer than this is treated as
    // stalled everywhere (listing, counts and row UI).
    const staleBookingCutoff = new Date(Date.now() - 2 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andClauses: Record<string, any>[] = [];

    if (!showTestOrders) {
      andClauses.push({
        isTestOrder: { $ne: true },
        isArchived: { $ne: true },
      });
    }

    if (status && status !== "any") {
      if (status === "needs_action") {
        andClauses.push({
          $or: [
            { orderStatus: "pending" },
            {
              paymentMethod: { $in: [...ONLINE_PAYMENT_METHODS] },
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
      } else if (status === "ready_to_book") {
        andClauses.push({
          $and: [
            { orderStatus: { $in: ["confirmed", "processing", "ready_to_ship"] } },
            {
              $or: [
                { shipmentBookingState: { $in: ["not_booked", "booking_failed", "", null] } },
                {
                  $and: [
                    { shipmentBookingState: "booking_in_progress" },
                    { updatedAt: { $lt: staleBookingCutoff } },
                  ],
                },
              ],
            },
          ],
        });
      } else if (status === "in_transit") {
        andClauses.push({
          shipmentStatus: { $in: ["in_transit", "out_for_delivery", "partial_delivered", "picked_up"] },
        });
      } else if (status === "issues") {
        andClauses.push({
          $or: [
            { orderStatus: { $in: ["returned", "refunded", "failed"] } },
            { shipmentBookingState: "booking_failed" },
            {
              $and: [
                { paymentMethod: "sslcommerz" },
                { paymentStatus: { $ne: "paid" } },
                { orderStatus: { $nin: ["cancelled", "refunded", "failed"] } },
              ],
            },
          ],
        });
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

    // KPI cards and status pills must describe the same order set the table
    // lists. Test / archived orders stay hidden unless the admin opts in.
    const visibilityMatch: Record<string, unknown> = showTestOrders
      ? {}
      : { isTestOrder: { $ne: true }, isArchived: { $ne: true } };

    // Trend windows for the KPI cards ("vs last 7 days").
    const trendNow = new Date();
    const sevenDaysAgo = new Date(trendNow.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(trendNow.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [total, orders, groupedCounts, kpiAgg] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
      Order.aggregate([
        { $match: visibilityMatch },
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: visibilityMatch },
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
                          { $eq: ["$shipmentBookingState", "booking_in_progress"] },
                          { $lt: ["$updatedAt", staleBookingCutoff] },
                        ],
                      },
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
            readyToBookCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ["$orderStatus", ["confirmed", "processing", "ready_to_ship"]] },
                      {
                        $or: [
                          { $in: ["$shipmentBookingState", ["not_booked", "booking_failed", "", null]] },
                          {
                            $and: [
                              { $eq: ["$shipmentBookingState", "booking_in_progress"] },
                              { $lt: ["$updatedAt", staleBookingCutoff] },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            inTransitCount: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$shipmentStatus",
                      ["in_transit", "out_for_delivery", "partial_delivered", "picked_up"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalOrders7d: {
              $sum: { $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0] },
            },
            totalOrdersPrev7d: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", fourteenDaysAgo] },
                      { $lt: ["$createdAt", sevenDaysAgo] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            delivered7d: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ["$orderStatus", ["delivered", "completed"]] },
                      { $gte: ["$updatedAt", sevenDaysAgo] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            deliveredPrev7d: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ["$orderStatus", ["delivered", "completed"]] },
                      { $gte: ["$updatedAt", fourteenDaysAgo] },
                      { $lt: ["$updatedAt", sevenDaysAgo] },
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
    statusCounts.ready_to_book = Number(kpiRaw.readyToBookCount || 0);
    statusCounts.in_transit = Number(kpiRaw.inTransitCount || 0);
    statusCounts.issues =
      (statusCounts.returned || 0) +
      (statusCounts.refunded || 0) +
      (statusCounts.failed || 0) +
      Number(kpiRaw.paymentIssuesCount || 0);

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
      readyToBookCount: Number(kpiRaw.readyToBookCount || 0),
      inTransitCount: Number(kpiRaw.inTransitCount || 0),
      trends: {
        total7d: Number(kpiRaw.totalOrders7d || 0),
        totalPrev7d: Number(kpiRaw.totalOrdersPrev7d || 0),
        delivered7d: Number(kpiRaw.delivered7d || 0),
        deliveredPrev7d: Number(kpiRaw.deliveredPrev7d || 0),
      },
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

    // Read the latest active consignment COD amount so admins can catch a
    // payment recorded AFTER courier booking. The Order can be fully paid
    // while Steadfast still has an old non-zero COD amount on the parcel.
    const orderIds = orders.map((o) => o._id);
    const shipmentRows = orderIds.length
      ? await Shipment.find({ orderId: { $in: orderIds } })
          .select("orderId status codAmount createdAt")
          .sort({ createdAt: -1 })
          .lean()
      : [];
    const latestShipmentByOrder = new Map<string, (typeof shipmentRows)[number]>();
    const activeShipmentByOrder = new Map<string, (typeof shipmentRows)[number]>();
    const terminalShipmentStatuses = new Set([
      "cancelled",
      "failed",
      "returned",
      "delivered",
      "partial_delivered",
    ]);
    for (const shipment of shipmentRows) {
      const orderId = String(shipment.orderId);
      if (!latestShipmentByOrder.has(orderId)) latestShipmentByOrder.set(orderId, shipment);
      if (
        !activeShipmentByOrder.has(orderId) &&
        !terminalShipmentStatuses.has(String(shipment.status || "").toLowerCase())
      ) {
        activeShipmentByOrder.set(orderId, shipment);
      }
    }

    const formattedOrders = orders.map((o) => {
      const financials = computeOrderFinancials(o);
      const shipment =
        activeShipmentByOrder.get(String(o._id)) || latestShipmentByOrder.get(String(o._id));
      const shipmentCodAmount = shipment ? Math.max(0, Number(shipment.codAmount) || 0) : null;
      const hasActiveShipment = Boolean(activeShipmentByOrder.has(String(o._id)));
      const shipmentCodMismatch =
        hasActiveShipment &&
        shipmentCodAmount !== null &&
        shipmentCodAmount > financials.codAmountToCollect + 0.009;
      // Never leave the UI stuck on a dead "booking in progress" lock. The
      // booking API reclaims locks older than 45s; we surface the same reality
      // as a retryable failure without mutating the database on a read.
      const bookingStalled =
        (o.shipmentBookingState === "booking_in_progress" ||
          o.shipmentBookingState === "booking_pending") &&
        (!o.updatedAt || new Date(o.updatedAt).getTime() < staleBookingCutoff.getTime());
      return {
        id: o.orderNumber,
        number: o.orderNumber,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
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
        shipmentCodAmount,
        shipmentCodMismatch,
        shipmentBookingState: bookingStalled
          ? "booking_failed"
          : o.shipmentBookingState || "not_booked",
        courierBookingError: bookingStalled
          ? "The previous booking attempt stalled. Safe to retry."
          : o.courierBookingError || null,
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

// POST /api/admin/orders — create a manual (phone/admin) order.
// Prices are always resolved from the server catalog; the browser can only
// choose products, quantities and variants. No gateway session is created here.
export async function POST(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fail closed: an admin session alone must not open an unbounded write window.
  const ip = clientIp(request);
  const limit = await rateLimit(`admin-order-create:ip:${hashIp(ip)}`, 30, 60 * 60, {
    failClosed: true,
  });
  if (!limit.allowed) {
    return createRateLimitResponse(
      limit,
      "Too many manual orders created from this network. Please wait before trying again."
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      customer?: {
        fullName?: string;
        phone?: string;
        email?: string;
        address?: string;
        city?: string;
        district?: string;
        postalCode?: string;
      };
      items?: {
        productId?: number | string;
        slug?: string;
        quantity?: number | string;
        size?: string;
        color?: string;
      }[];
      paymentMethod?: string;
      shippingFee?: number | string;
      discount?: number | string;
      notes?: string;
      idempotencyKey?: string;
      markPaid?: boolean;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const customer = body.customer || {};
    const fullName = String(customer.fullName || "").trim();
    const phone = String(customer.phone || "").trim();
    const address = String(customer.address || "").trim();
    const city = String(customer.city || "").trim();
    const district = String(customer.district || city || "").trim();
    const email = String(customer.email || "").trim();

    if (!fullName || !phone || !address || !city) {
      return NextResponse.json(
        { error: "Customer name, phone, address and city are required." },
        { status: 400 }
      );
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Add at least one product to the order." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const rawPaymentMethod = String(body.paymentMethod || "cod").trim().toLowerCase();
    if (rawPaymentMethod !== "cod" && rawPaymentMethod !== "manual_paid") {
      return NextResponse.json(
        { error: "Manual orders support Cash on Delivery or a recorded manual payment." },
        { status: 400 }
      );
    }
    const isPaidUpfront = rawPaymentMethod === "manual_paid" || body.markPaid === true;

    // Resolve the authoritative catalog price for every line item.
    const allDbCatalog = await getAllDbProducts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallbackCatalog = REAL_PRODUCTS as any[];

    interface ResolvedAdminItem {
      productId: number;
      slug: string;
      name: string;
      price: number;
      quantity: number;
      size: string;
      color: string;
      image: string;
    }

    const itemsData: ResolvedAdminItem[] = [];
    let subtotal = 0;

    for (const rawItem of rawItems) {
      const pId = Number(rawItem.productId || 0);
      const rawSlug = String(rawItem.slug || "").trim().toLowerCase();
      const matched =
        allDbCatalog.find((p) => p.id === pId || (rawSlug && p.slug.toLowerCase() === rawSlug)) ||
        fallbackCatalog.find((p) => p.id === pId || (rawSlug && p.slug.toLowerCase() === rawSlug));

      if (!matched) {
        return NextResponse.json(
          { error: `Product "${rawItem.productId ?? rawItem.slug ?? "unknown"}" is not in the catalog.` },
          { status: 400 }
        );
      }

      const qty = Math.max(1, Math.min(99, parseInt(String(rawItem.quantity || "1"), 10) || 1));
      const rawPriceStr = String(
        matched.price || matched.sale_price || matched.regular_price || "0"
      ).trim();
      const unitPrice = parseFloat(rawPriceStr);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return NextResponse.json(
          { error: `Invalid pricing for "${matched.name}".` },
          { status: 400 }
        );
      }

      subtotal += unitPrice * qty;

      let resolvedImage = "";
      if (Array.isArray(matched.images) && matched.images[0]?.src) {
        resolvedImage = String(matched.images[0].src);
      }

      itemsData.push({
        productId: matched.id,
        slug: matched.slug || "",
        name: matched.name,
        price: unitPrice,
        quantity: qty,
        size: rawItem.size ? String(rawItem.size).trim() : "",
        color: rawItem.color ? String(rawItem.color).trim() : "",
        image: resolvedImage,
      });
    }

    // Delivery fee: computed server-side from store settings unless an admin
    // explicitly overrides it (bounded so a typo cannot create an absurd total).
    let shippingFee: number;
    if (body.shippingFee !== undefined && body.shippingFee !== null && body.shippingFee !== "") {
      const parsed = Number(body.shippingFee);
      shippingFee = Number.isFinite(parsed) ? Math.max(0, Math.min(5000, Math.round(parsed))) : 0;
    } else {
      const [shippingSettings, productRates] = await Promise.all([
        getShippingSettings(),
        getProductDeliveryRates(itemsData.map((item) => item.productId)),
      ]);
      shippingFee = calculateShipping({
        subtotal,
        district,
        city,
        settings: shippingSettings,
        itemRates: itemsData.map((item) => productRates.get(item.productId) ?? {}),
      }).fee;
    }

    const rawDiscount = Number(body.discount || 0);
    const discount = Number.isFinite(rawDiscount)
      ? Math.max(0, Math.min(subtotal, Math.round(rawDiscount)))
      : 0;

    const total = Math.max(0, subtotal - discount + shippingFee);
    const initialOrderStatus = "confirmed";
    const paymentStatus = isPaidUpfront ? "paid" : "unpaid";

    // Reserve stock before the order exists so an oversell never creates a
    // confirmed order. The reservation is rolled back if creation fails.
    const reservation = await reserveStockForOrder(itemsData);
    if (!reservation.ok) {
      return NextResponse.json(
        {
          error: reservation.item
            ? `${reservation.item.name} does not have enough stock for the requested quantity.`
            : "One or more items are out of stock.",
          code: "OUT_OF_STOCK",
        },
        { status: 409 }
      );
    }

    const orderNumber = await nextOrderNumber();
    const now = new Date();
    const actor = auth.user || "admin";

    let newOrder;
    try {
      newOrder = await Order.create({
        orderNumber,
        idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey).slice(0, 120) : undefined,
        userId: null,
        customer: {
          fullName,
          email,
          phone,
          address,
          city,
          district,
          postalCode: customer.postalCode ? String(customer.postalCode).trim() : "",
        },
        items: itemsData,
        subtotal,
        discount,
        promoCode: "",
        shippingFee,
        total,
        channel: "admin",
        paymentMethod: "cod",
        paymentStatus,
        paidAmount: isPaidUpfront ? total : 0,
        paidAt: isPaidUpfront ? now : null,
        expectedCodAmount: isPaidUpfront ? 0 : total,
        collectedCodAmount: 0,
        settledCodAmount: 0,
        courierCharge: 0,
        codSettlementStatus: isPaidUpfront ? "none" : "expected",
        shipmentBookingState: "not_booked",
        orderStatus: initialOrderStatus,
        statusHistory: [
          {
            status: initialOrderStatus,
            previousStatus: "",
            actor,
            note: `Manual order created from admin panel (${isPaidUpfront ? "recorded paid" : "COD"})`,
            source: "admin",
            at: now,
          },
        ],
        stockReservedAt: reservation.reserved.length ? now : null,
        notes: body.notes ? String(body.notes).trim().slice(0, 2000) : "",
      });
    } catch (createErr) {
      // Roll the stock reservation back so a failed insert cannot leak inventory.
      await restoreReservedItems(reservation.reserved).catch(() => {});
      throw createErr;
    }

    // COD (or recorded-paid) is confirmed immediately: mark the stock commitment.
    await commitStockForOrder(newOrder);

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor,
        action: "order.create",
        targetType: "order",
        targetId: orderNumber,
        before: null,
        after: {
          orderNumber,
          channel: "admin",
          total,
          paymentMethod: "cod",
          paymentStatus,
          items: itemsData.map((i) => `${i.name} x${i.quantity}`),
        },
        ip,
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json(
      {
        ok: true,
        order: {
          id: String(newOrder._id),
          orderNumber,
          total,
          orderStatus: initialOrderStatus,
          paymentStatus,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Admin manual order creation error:", err);
    return NextResponse.json(
      { error: "The order could not be created. Please retry." },
      { status: 500 }
    );
  }
}
