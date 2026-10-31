import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { verifyPaymentTrackingToken } from "@/server/sslcommerz";
import { getSessionUserId } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * Protected server-side verification endpoint for post-payment storefront tracking.
 * Returns only minimal non-sensitive e-commerce telemetry payload for validated, paid orders.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = String(searchParams.get("order") || "").trim();

    if (!orderNumber || !/^[A-Za-z0-9_-]{4,60}$/.test(orderNumber)) {
      return NextResponse.json({ error: "Invalid or missing order parameter" }, { status: 400 });
    }

    await connectToDatabase();
    const order = await Order.findOne({ orderNumber }).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 1. Verify payment status is paid/valid
    if (order.paymentStatus !== "paid") {
      return NextResponse.json({ error: "Order payment is not validated or pending" }, { status: 400 });
    }

    // 2. Verify order has not been cancelled, refunded, or failed
    if (order.orderStatus === "cancelled" || order.orderStatus === "refunded" || order.orderStatus === "failed") {
      return NextResponse.json({ error: "Order is no longer eligible for conversion tracking" }, { status: 400 });
    }

    // 3. Ownership / checkout session verification:
    // Either the request possesses a valid signed payment tracking token cookie,
    // or the authenticated user owns the order.
    const trackingCookie = request.cookies.get("sslcommerz_tracking_token")?.value;
    const isTokenValid = trackingCookie ? verifyPaymentTrackingToken(trackingCookie, order.orderNumber) : false;

    const sessionUserId = getSessionUserId(request);
    const isOwner = sessionUserId && order.userId ? String(order.userId) === sessionUserId : false;

    if (!isTokenValid && !isOwner) {
      return NextResponse.json(
        { error: "Unauthorized access: valid checkout session or ownership required." },
        { status: 403 }
      );
    }

    // 4. Return strictly minimal telemetry payload (zero sensitive customer PII)
    const contentIds = order.items.map((it) => it.productId);
    const contents = order.items.map((it) => ({
      id: String(it.productId),
      quantity: it.quantity,
      item_price: it.price,
    }));

    return NextResponse.json({
      verified: true,
      orderNumber: order.orderNumber,
      eventId: `order_${order.orderNumber}`,
      value: order.total,
      currency: "BDT",
      num_items: order.items.reduce((acc, it) => acc + it.quantity, 0),
      content_ids: contentIds,
      contents,
    });
  } catch (error) {
    console.error("GET /api/orders/verify-tracking error:", error);
    return NextResponse.json({ error: "Order verification failed" }, { status: 500 });
  }
}
