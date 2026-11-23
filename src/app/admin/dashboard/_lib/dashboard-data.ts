import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import type {
  DashboardData,
  DailySalesBucket,
  RecentOrder,
  StockProduct,
} from "../_types/dashboard.types";

function dhakaDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function getDashboardData(): Promise<DashboardData> {
  await connectToDatabase();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const staleBookingCutoff = new Date(now.getTime() - 2 * 60 * 1000);

  // Dhaka (UTC+6) day/month boundaries
  const dhakaToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const todayStart = new Date(`${dhakaToday}T00:00:00+06:00`);
  const monthStart = new Date(`${dhakaToday.slice(0, 7)}-01T00:00:00+06:00`);

  const [kpiAgg, recentOrdersRaw, lowStockRaw, topProductsRaw, dailyAgg] = await Promise.all([
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
          pendingCount: {
            $sum: { $cond: [{ $in: ["$orderStatus", ["pending", "on-hold"]] }, 1, 0] },
          },
          deliveredCount: {
            $sum: { $cond: [{ $in: ["$orderStatus", ["delivered", "completed"]] }, 1, 0] },
          },
          returnsIssuesCount: {
            $sum: {
              $cond: [
                { $in: ["$orderStatus", ["cancelled", "returned", "refunded", "failed"]] },
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
          discrepancyCount: {
            $sum: { $cond: [{ $eq: ["$codSettlementStatus", "discrepancy"] }, 1, 0] },
          },
          total7d: { $sum: { $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0] } },
          totalPrev7d: {
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
          todayRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$createdAt", todayStart] },
                    {
                      $not: {
                        $in: ["$orderStatus", ["cancelled", "returned", "refunded", "failed"]],
                      },
                    },
                  ],
                },
                "$total",
                0,
              ],
            },
          },
          todayPaid: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$createdAt", todayStart] },
                    { $not: { $in: ["$orderStatus", ["cancelled", "refunded", "failed"]] } },
                  ],
                },
                {
                  $cond: [
                    { $eq: ["$paymentStatus", "paid"] },
                    "$total",
                    { $ifNull: ["$paidAmount", 0] },
                  ],
                },
                0,
              ],
            },
          },
          todayOrders: { $sum: { $cond: [{ $gte: ["$createdAt", todayStart] }, 1, 0] } },
          monthRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$createdAt", monthStart] },
                    {
                      $not: {
                        $in: ["$orderStatus", ["cancelled", "returned", "refunded", "failed"]],
                      },
                    },
                  ],
                },
                "$total",
                0,
              ],
            },
          },
          monthPaid: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$createdAt", monthStart] },
                    { $not: { $in: ["$orderStatus", ["cancelled", "refunded", "failed"]] } },
                  ],
                },
                {
                  $cond: [
                    { $eq: ["$paymentStatus", "paid"] },
                    "$total",
                    { $ifNull: ["$paidAmount", 0] },
                  ],
                },
                0,
              ],
            },
          },
          monthOrders: { $sum: { $cond: [{ $gte: ["$createdAt", monthStart] }, 1, 0] } },
        },
      },
    ]),
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .select("orderNumber customer.fullName total orderStatus createdAt")
      .lean(),
    Product.find({ manage_stock: true, stock_quantity: { $lte: 5 } })
      .sort({ stock_quantity: 1 })
      .limit(5)
      .select("id name images stock_quantity total_sales")
      .lean(),
    Product.find({})
      .sort({ total_sales: -1 })
      .limit(5)
      .select("id name total_sales")
      .lean(),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(sevenDaysAgo.getTime() - 24 * 60 * 60 * 1000) },
          orderStatus: { $nin: ["cancelled", "failed", "refunded", "trash"] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Dhaka" } },
          revenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const k = kpiAgg[0] || {};
  const totalOrders = Number(k.totalOrders || 0);
  const totalRevenue = Math.round(Number(k.totalRevenue || 0));
  const paidRevenue = Math.round(Number(k.paidRevenue || 0));
  const outstanding = Math.max(0, totalRevenue - paidRevenue);
  const pendingCount = Number(k.pendingCount || 0);
  const deliveredCount = Number(k.deliveredCount || 0);
  const returnsIssues = Number(k.returnsIssuesCount || 0);
  const readyToBook = Number(k.readyToBookCount || 0);
  const inTransit = Number(k.inTransitCount || 0);
  const needsAction = Number(k.needsActionCount || 0);
  const paymentIssues = Number(k.paymentIssuesCount || 0);
  const discrepancy = Number(k.discrepancyCount || 0);
  const total7d = Number(k.total7d || 0);
  const totalPrev7d = Number(k.totalPrev7d || 0);

  const todayRevenue = Math.round(Number(k.todayRevenue || 0));
  const todayPaid = Math.round(Number(k.todayPaid || 0));
  const todayOrders = Number(k.todayOrders || 0);
  const monthRevenue = Math.round(Number(k.monthRevenue || 0));
  const monthPaid = Math.round(Number(k.monthPaid || 0));
  const monthOrders = Number(k.monthOrders || 0);

  const dailyMap = new Map<string, { revenue: number; count: number }>(
    (dailyAgg as { _id: string; revenue: number; count: number }[]).map((d) => [
      d._id,
      { revenue: Number(d.revenue || 0), count: Number(d.count || 0) },
    ])
  );

  const days: DailySalesBucket[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const key = dhakaDayKey(d);
    const bucket = dailyMap.get(key) || { revenue: 0, count: 0 };
    return {
      key,
      label: new Intl.DateTimeFormat("en-BD", { weekday: "short", timeZone: "Asia/Dhaka" }).format(d),
      revenue: bucket.revenue,
      count: bucket.count,
    };
  });

  const maxRevenue = Math.max(1, ...days.map((d) => d.revenue));
  const weekRevenue = days.reduce((sum, d) => sum + d.revenue, 0);
  const weekOrders = days.reduce((sum, d) => sum + d.count, 0);

  const revenueDonuts = [
    {
      title: "Today",
      revenue: todayRevenue,
      paid: todayPaid,
      pending: Math.max(0, todayRevenue - todayPaid),
      color: "#9333ea",
      orders: todayOrders,
    },
    {
      title: "This Month",
      revenue: monthRevenue,
      paid: monthPaid,
      pending: Math.max(0, monthRevenue - monthPaid),
      color: "#ef4444",
      orders: monthOrders,
    },
    {
      title: "All Time",
      revenue: totalRevenue,
      paid: paidRevenue,
      pending: Math.max(0, totalRevenue - paidRevenue),
      color: "#7c3aed",
      orders: totalOrders,
    },
  ];

  const pipeline = [
    { key: "pending", label: "Pending", value: pendingCount, tone: "text-amber-600", href: "/admin/orders?status=pending" },
    { key: "ready_to_book", label: "Ready to Book", value: readyToBook, tone: "text-blue-600", href: "/admin/orders?status=ready_to_book" },
    { key: "in_transit", label: "In Transit", value: inTransit, tone: "text-indigo-600", href: "/admin/orders?status=in_transit" },
    { key: "delivered", label: "Delivered", value: deliveredCount, tone: "text-emerald-600", href: "/admin/orders?status=delivered" },
    { key: "issues", label: "Returns / Issues", value: returnsIssues, tone: "text-rose-600", href: "/admin/orders?status=issues" },
  ];

  return {
    totalRevenue,
    paidRevenue,
    outstanding,
    totalOrders,
    total7d,
    totalPrev7d,
    needsAction,
    paymentIssues,
    discrepancy,
    revenueDonuts,
    days,
    maxRevenue,
    weekRevenue,
    weekOrders,
    pipeline,
    recentOrders: recentOrdersRaw as unknown as RecentOrder[],
    lowStock: lowStockRaw as unknown as StockProduct[],
    topProducts: topProductsRaw as unknown as StockProduct[],
  };
}
