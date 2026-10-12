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

    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    await connectToDatabase();

    const [allOrders, totalProducts] = await Promise.all([
      Order.find({})
        .select("orderStatus createdAt total shippingFee items customer.phone")
        .lean(),
      Product.countDocuments(),
    ]);

    const orders = allOrders.filter((ord) => new Date(ord.createdAt) >= startDate);

    let totalSales = 0;
    let totalItems = 0;
    let totalShipping = 0;

    for (const ord of orders) {
      totalSales += ord.total || 0;
      totalShipping += ord.shippingFee || 0;
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          totalItems += it.quantity || 1;
        }
      }
    }

    const netSales = Math.max(0, totalSales - totalShipping);
    const avgSales = orders.length > 0 ? (totalSales / orders.length).toFixed(2) : "0.00";

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
          net_sales: netSales.toFixed(2),
          average_sales: avgSales,
          total_orders: orders.length,
          total_items: totalItems,
          total_tax: "0.00",
          total_shipping: totalShipping.toFixed(2),
          total_refunds: 0,
          total_discount: "0.00",
          total_customers: new Set(allOrders.map((o) => o.customer?.phone).filter(Boolean)).size,
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
