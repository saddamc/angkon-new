import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/server/auth/auth";
import { isSslcommerzConfigured, isOnlinePaymentAvailableForEnvironment } from "@/server/payments/config/sslcommerz";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import { requireCustomerId, assertOrderOwnership } from "@/server/payments/customer-auth";
import { OrderPaymentRepository } from "@/server/payments/repositories/order-payment.repository";
import { InitiatePaymentService } from "@/server/payments/services/initiate-payment";
import { PaymentError } from "@/server/payments/payment-errors";

export const dynamic = "force-dynamic";

/**
 * @deprecated Legacy payment initiation endpoint.
 * Canonical endpoint: /api/payments/sslcommerz/initiate
 * Maintained strictly for backward compatibility with pending customer sessions.
 *
 * All payment business logic (inventory validation, order state verification like
 * order.paymentStatus === "paid", and gateway communication) has been consolidated into
 * InitiatePaymentService.initiate, superseding legacy duplicate initiateSslcommerzForOrder logic.
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

    const body = (await request.json().catch(() => ({}))) as {
      orderNumber?: unknown;
      idempotencyKey?: unknown;
    };
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

    // Money-moving operation: verify customer authentication and ownership before initiating
    const userId = await requireCustomerId(request);
    const order = await OrderPaymentRepository.findByOrderNumber(orderNumber);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    await assertOrderOwnership(order, userId);

    const appBaseUrl = getSiteUrl(request);
    const idempotencyKey =
      typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined;

    // Delegate directly to the canonical domain service
    const result = await InitiatePaymentService.initiate({
      orderNumber,
      appBaseUrl,
      idempotencyKey,
    });

    if (!result.ok || !result.gatewayUrl) {
      return NextResponse.json(
        {
          error: result.error || "Could not initialize payment session with gateway.",
          code: "GATEWAY_INIT_FAILED",
        },
        { status: 502 }
      );
    }

    // Preserve legacy response shape for existing clients
    return NextResponse.json({
      ok: true,
      orderNumber: result.orderNumber,
      total: result.total,
      currency: result.currency || "BDT",
      gatewayUrl: result.gatewayUrl,
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 400 }
      );
    }

    console.error("[Payment:Initiate:Legacy] Unexpected error:", error);
    return NextResponse.json(
      { error: "Payment initiation encountered an unexpected error. Please try again." },
      { status: 500 }
    );
  }
}
