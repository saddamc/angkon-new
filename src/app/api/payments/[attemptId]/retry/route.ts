import { NextRequest, NextResponse } from "next/server";
import { checkDualRateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import { RetryPaymentService } from "@/server/payments/services/retry-payment";
import { PaymentError } from "@/server/payments/payment-errors";
import { requireCustomerId, assertAttemptOwnership } from "@/server/payments/customer-auth";
import { PaymentAttemptRepository } from "@/server/payments/repositories/payment-attempt.repository";
import { verifyPaymentStatusToken } from "@/server/payments/status-token";
import { isValidObjectId } from "@/server/payments/utils/object-id";
import { getPaymentCallbackBaseUrl } from "@/server/payments/config/sslcommerz";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;

  if (!isValidObjectId(attemptId)) {
    return NextResponse.json({ ok: false, error: "Payment attempt not found." }, { status: 404 });
  }

  const rateLimitResult = await checkDualRateLimit({
    request: req,
    prefix: "pay_retry",
    ipLimit: { limit: 10, windowSeconds: 60 },
  });

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, "Too many retry requests. Please wait.");
  }

  try {
    // A retry creates a new charge. Access requires the signed status token
    // handed to this browser, or the owning customer's session.
    const token = req.nextUrl.searchParams.get("token");
    const tokenValid = verifyPaymentStatusToken(token, attemptId);
    const previous = await PaymentAttemptRepository.findById(attemptId);
    if (!previous) {
      return NextResponse.json({ ok: false, error: "Payment attempt not found." }, { status: 404 });
    }

    if (!tokenValid) {
      const userId = await requireCustomerId(req);
      await assertAttemptOwnership(previous, userId);
    }

    const appBaseUrl = getPaymentCallbackBaseUrl();

    const body = await req.json().catch(() => ({}));

    const result = await RetryPaymentService.retry({
      attemptId,
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

    const message = err instanceof Error ? err.message : "Retry initiation error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
