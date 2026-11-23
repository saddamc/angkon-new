import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { getSiteUrl } from "@/server/auth";
import { initiateSslcommerzForOrder } from "@/server/payments/initiate";
import { isSslcommerzConfigured, isOnlinePaymentAvailableForEnvironment } from "@/server/sslcommerz";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/rate-limit";
import { Product } from "@/models/Product";
import { requireCustomerId, assertOrderOwnership } from "@/server/payments/customer-auth";
import { PaymentError } from "@/server/payments/payment-errors";

export const dynamic = "force-dynamic";

/**
 * @deprecated Legacy payment initiation endpoint.
 * Canonical endpoint: /api/payments/sslcommerz/initiate
 * Maintained strictly for backward compatibility with pending customer sessions.
 *
 * POST /api/payment/sslcommerz/initiate
 *
 * Safe payment initiation and retry endpoint.
 * Enables customers to initiate or re-attempt payment for an existing unpaid
 * SSLCOMMERZ order without creating duplicate orders or double-deducting stock.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const ipLimit = await rateLimit(`pay-init:ip:${hashIp(ip)}`, 10, 15 * 60);
    if (!ipLimit.allowed) {
      return createRateLimitResponse(
        ipLimit,
        "Too many payment initiation attempts from this network. Please wait a few minutes."
      );
    }

    const body = (await request.json().catch(() => ({}))) as { orderNumber?: unknown };
    const orderNumber = String(body.orderNumber || "").trim();

    if (!orderNumber) {
      return NextResponse.json({ error: "Missing orderNumber in request body." }, { status: 400 });
    }

    const orderLimit = await rateLimit(`pay-init:order:${orderNumber}`, 5, 15 * 60);
    if (!orderLimit.allowed) {
      return createRateLimitResponse(
        orderLimit,
        "Too many payment attempts for this order. Please wait a few minutes before retrying."
      );
    }

    if (!isSslcommerzConfigured() || !isOnlinePaymentAvailableForEnvironment()) {
      return NextResponse.json(
        {
          error: "Online payment gateway is temporarily unavailable. Please contact support or choose Cash on Delivery.",
          code: "PAYMENT_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    await connectToDatabase();
    const order = await Order.findOne({ orderNumber });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Only the customer who owns this order may start a payment session.
    try {
      const userId = await requireCustomerId(request);
      await assertOrderOwnership(order, userId);
    } catch (authError) {
      if (authError instanceof PaymentError) {
        return NextResponse.json(
          { error: authError.message, code: authError.code },
          { status: authError.statusCode }
        );
      }
      throw authError;
    }

    if (order.paymentMethod !== "sslcommerz") {
      return NextResponse.json(
        { error: "This order is not configured for online payment." },
        { status: 400 }
      );
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "This order has already been paid successfully.", code: "ALREADY_PAID" },
        { status: 400 }
      );
    }

    if (order.orderStatus === "cancelled" || order.orderStatus === "refunded") {
      return NextResponse.json(
        { error: `Cannot pay for an order in ${order.orderStatus} state.`, code: "INVALID_ORDER_STATE" },
        { status: 400 }
      );
    }

    // Verify product availability from database catalog before restarting session
    const productIds = order.items.map((i) => i.productId);
    const dbProducts = await Product.find({ id: { $in: productIds } })
      .select("id name manage_stock stock_quantity")
      .lean();

    for (const item of order.items) {
      const prod = dbProducts.find((p) => p.id === item.productId);
      if (prod && prod.manage_stock && typeof prod.stock_quantity === "number") {
        if (prod.stock_quantity < item.quantity && !order.stockReservedAt) {
          return NextResponse.json(
            {
              error: `Item "${item.name}" does not have enough stock to complete payment.`,
              code: "OUT_OF_STOCK",
            },
            { status: 409 }
          );
        }
      }
    }

    const appBaseUrl = getSiteUrl(request);
    const result = await initiateSslcommerzForOrder(order, appBaseUrl);

    if (!result.ok || !result.gatewayUrl) {
      return NextResponse.json(
        {
          error: result.error || "Could not initialize payment session with gateway.",
          code: "GATEWAY_INIT_FAILED",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      total: order.total,
      currency: "BDT",
      gatewayUrl: result.gatewayUrl,
    });
  } catch (error) {
    console.error("[Payment:Initiate] Unexpected error:", error);
    return NextResponse.json(
      { error: "Payment initiation encountered an unexpected error. Please try again." },
      { status: 500 }
    );
  }
}
