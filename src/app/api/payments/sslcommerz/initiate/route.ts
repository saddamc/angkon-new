import { NextRequest, NextResponse } from "next/server";
import { checkDualRateLimit, createRateLimitResponse } from "@/server/rate-limit";
import { InitiatePaymentService } from "@/server/payments/services/initiate-payment";
import { PaymentError } from "@/server/payments/payment-errors";
import { requireCustomerId, assertOrderOwnership } from "@/server/payments/customer-auth";
import { OrderPaymentRepository } from "@/server/payments/repositories/order-payment.repository";

export async function POST(req: NextRequest) {
  const rateLimitResult = await checkDualRateLimit({
    request: req,
    prefix: "pay_init",
    ipLimit: { limit: 10, windowSeconds: 60 },
  });

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, "Too many payment initiation requests. Please wait.");
  }

  try {
    const body = await req.json().catch(() => ({}));
    const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";

    if (!orderNumber) {
      return NextResponse.json({ ok: false, error: "Order number is required." }, { status: 400 });
    }

    // Money-moving operation: require an authenticated owner.
    const userId = await requireCustomerId(req);
    const order = await OrderPaymentRepository.findByOrderNumber(orderNumber);
    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }
    await assertOrderOwnership(order, userId);

    const appBaseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin ||
      "http://localhost:3000";

    const result = await InitiatePaymentService.initiate({
      orderNumber,
      appBaseUrl,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    if (err instanceof PaymentError) {
      return NextResponse.json(
        { ok: false, code: err.code, error: err.message },
        { status: err.statusCode || 400 }
      );
    }

    const message = err instanceof Error ? err.message : "Internal payment initiation error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
