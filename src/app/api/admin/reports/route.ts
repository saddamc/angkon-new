import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";

// GET /api/admin/reports — fetch reports data from MongoDB Atlas
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "month";

  try {
    const now = new Date();
    let startDate = new Date();
    let endDate: Date | null = null;

    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    await connectToDatabase();

    const [allOrders, totalProducts] = await Promise.all([
      Order.find({})
        .select("orderStatus paymentStatus createdAt total shippingFee items customer.phone customer.email")
        .lean(),
      Product.countDocuments(),
    ]);

    // Filter orders by time window
    const ordersInPeriod = allOrders.filter((ord) => {
      const d = new Date(ord.createdAt);
      if (d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });

    // Separate valid orders from cancelled/refunded orders
    const validOrders = ordersInPeriod.filter(
      (ord) => !["cancelled", "failed", "refunded", "trash"].includes(ord.orderStatus)
    );
    const cancelledOrders = ordersInPeriod.filter((ord) =>
      ["cancelled", "failed", "refunded", "trash"].includes(ord.orderStatus)
    );

    let totalSales = 0;
    let totalItems = 0;
    let totalShipping = 0;
    let paidRevenue = 0;
    let pendingRevenue = 0;

    for (const ord of validOrders) {
      const orderTotal = Number(ord.total) || 0;
      totalSales += orderTotal;
      totalShipping += Number(ord.shippingFee) || 0;

      const isPaid = ord.paymentStatus === "paid" || ord.orderStatus === "completed";
      if (isPaid) {
        paidRevenue += orderTotal;
      } else {
        pendingRevenue += orderTotal;
      }

      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          totalItems += Number(it.quantity) || 1;
        }
      }
    }

    const cancelledSales = cancelledOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const netSales = Math.max(0, totalSales - totalShipping);
    const avgSales = validOrders.length > 0 ? (totalSales / validOrders.length).toFixed(2) : "0.00";

    const statusCounts: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const ord of allOrders) {
      const st = ord.orderStatus || "pending";
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    }

    const orderStatuses = Object.entries(statusCounts).map(([slug, total]) => ({
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      total,
    }));

    return NextResponse.json(
      {
        sales: {
          total_sales: totalSales.toFixed(2),
          paid_revenue: paidRevenue.toFixed(2),
          pending_revenue: pendingRevenue.toFixed(2),
          cancelled_sales: cancelledSales.toFixed(2),
          net_sales: netSales.toFixed(2),
          average_sales: avgSales,
          total_orders: validOrders.length,
          all_orders_count: ordersInPeriod.length,
          total_items: totalItems,
          total_tax: "0.00",
          total_shipping: totalShipping.toFixed(2),
          total_refunds: cancelledOrders.length,
          total_discount: "0.00",
          total_customers: new Set(allOrders.map((o) => o.customer?.phone || o.customer?.email).filter(Boolean)).size,
        },
        order_statuses: orderStatuses,
        top_sellers: [],
        total_products: totalProducts,
        period,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
