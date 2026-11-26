import { NextResponse } from "next/server";
import { Order, type IOrder } from "@/models/Order";
import { Product } from "@/models/Product";
import { Shipment } from "@/models/Shipment";
import { User } from "@/models/User";
import { getProviderConfigSummary } from "@/server/courier";
import { computeOrderFinancials } from "@/server/orders/workflow";
import { ONLINE_PAYMENT_METHODS } from "@/lib/payment-methods";

export async function resolveLiveProductImageMap(
  productIds: number[]
): Promise<Map<number, string>> {
  const uniqueIds = Array.from(
    new Set(productIds.filter((id) => Number.isFinite(id) && id > 0))
  );
  const map = new Map<number, string>();
  if (uniqueIds.length === 0) return map;

  const productRows = await Product.find({ id: { $in: uniqueIds } })
    .select("id images")
    .lean();
  for (const p of productRows) {
    const firstImg =
      Array.isArray(p.images) && p.images[0]?.src ? String(p.images[0].src).trim() : "";
    if (firstImg) map.set(Number(p.id), firstImg);
  }
  return map;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function escapeCsvCell(value: unknown): string {
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

export function parseDateBoundary(raw: string | null, endOfDay: boolean): Date | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
    : trimmed;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface AdminOrderQueryParams {
  page?: number;
  perPage?: number;
  status?: string;
  paymentStatus?: string;
  shipmentStatus?: string;
  courierFilter?: string;
  search?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  exportFormat?: string;
  showTestOrders?: boolean;
}

export async function queryAdminOrders(params: AdminOrderQueryParams) {
  const page = Math.max(1, params.page || 1);
  const perPage = Math.min(200, Math.max(1, params.perPage || 20));
  const status = (params.status ?? "any").trim().toLowerCase();
  const paymentStatus = (params.paymentStatus ?? "any").trim().toLowerCase();
  const shipmentStatus = (params.shipmentStatus ?? "any").trim().toLowerCase();
  const courierFilter = (params.courierFilter ?? "").trim().toLowerCase();
  const search = (params.search ?? "").trim();
  const dateFrom = params.dateFrom;
  const dateTo = params.dateTo;
  const exportFormat = (params.exportFormat ?? "").trim().toLowerCase();
  const showTestOrders = Boolean(params.showTestOrders);

  // A booking that has been "in progress" longer than this is treated as
  // stalled everywhere (listing, counts and row UI).
  const staleBookingCutoff = new Date(Date.now() - 2 * 60 * 1000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andClauses: Record<string, any>[] = [];

  if (!showTestOrders) {
    andClauses.push({
      isTestOrder: { $ne: true },
      isArchived: { $ne: true },
      orderNumber: { $not: /^SANDBOX/i },
    });
  }

  if (status && status !== "any") {
    if (status === "needs_action") {
      andClauses.push({
        $or: [
          { orderStatus: "pending" },
          { "cancellationRequest.status": "requested" },
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
      const fin = computeOrderFinancials(o as unknown as IOrder);
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

    return {
      type: "csv" as const,
      csv: lines.join("\r\n"),
      filename: `angkon-orders-${new Date().toISOString().slice(0, 10)}.csv`,
    };
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
                    { $eq: ["$cancellationRequest.status", "requested"] },
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

  // Read latest active consignment COD amount
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

  const liveProductImageMap = await resolveLiveProductImageMap(
    orders.flatMap((o) => (o.items || []).map((it) => Number(it.productId)))
  );

  const formattedOrders = orders.map((o) => {
    const financials = computeOrderFinancials(o as unknown as IOrder);
    const shipment =
      activeShipmentByOrder.get(String(o._id)) || latestShipmentByOrder.get(String(o._id));
    const shipmentCodAmount = shipment ? Math.max(0, Number(shipment.codAmount) || 0) : null;
    const hasActiveShipment = Boolean(activeShipmentByOrder.has(String(o._id)));
    const shipmentCodMismatch =
      hasActiveShipment &&
      shipmentCodAmount !== null &&
      shipmentCodAmount > financials.codAmountToCollect + 0.009;

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
      line_items: (o.items || []).map((it) => {
        const liveSrc =
          (it.productId ? liveProductImageMap.get(Number(it.productId)) : undefined) || it.image;
        return {
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          size: it.size || "",
          color: it.color || "",
          image: liveSrc ? { src: liveSrc } : undefined,
          meta_data: [
            ...(it.size ? [{ key: "Size", value: it.size }] : []),
            ...(it.color ? [{ key: "Color", value: it.color }] : []),
          ],
        };
      }),
      cancellationRequest: o.cancellationRequest
        ? {
            status: o.cancellationRequest.status,
            requestedAt: o.cancellationRequest.requestedAt || null,
            reason: o.cancellationRequest.reason || null,
            reviewedAt: o.cancellationRequest.reviewedAt || null,
            reviewNote: o.cancellationRequest.reviewNote || null,
          }
        : null,
      raw: o,
    };
  });

  const providers = getProviderConfigSummary();
  return {
    type: "json" as const,
    data: {
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
  };
}
