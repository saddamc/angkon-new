import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";

// GET /api/admin/orders — list orders from MongoDB Atlas (newest first)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);
  const status = searchParams.get("status") ?? "any";

  try {
    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (status && status !== "any") {
      filter.orderStatus = status;
    }

    const total = await Order.countDocuments(filter);
    const totalPages = Math.ceil(total / perPage) || 1;
    const skip = (page - 1) * perPage;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();

    // Format for admin dashboard table compatibility
    const formattedOrders = orders.map((o) => ({
      id: o.orderNumber,
      number: o.orderNumber,
      status: o.orderStatus,
      date_created: o.createdAt,
      total: String(o.total),
      shipping_total: String(o.shippingFee),
      payment_method_title:
        o.paymentMethod === "sslcommerz" ? "Online Payment" : "Cash on Delivery",
      billing: {
        first_name: o.customer?.fullName || "Guest",
        last_name: "",
        email: o.customer?.email || "",
        phone: o.customer?.phone || "",
        address_1: o.customer?.address || "",
        city: o.customer?.district || o.customer?.city || "",
      },
      line_items: (o.items || []).map((it) => ({
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        meta_data: it.size ? [{ key: "Size", value: it.size }] : [],
      })),
      raw: o,
    }));

    return NextResponse.json(
      { orders: formattedOrders, total, totalPages },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    console.error("MongoDB admin orders fetch error:", err);
    return NextResponse.json(
      { orders: [], total: 0, totalPages: 1 },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
