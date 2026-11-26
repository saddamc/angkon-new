import { NextRequest, NextResponse } from "next/server";
import { PaymentAttemptRepository } from "@/server/payments/repositories/payment-attempt.repository";
import { verifyPaymentStatusToken, createPaymentStatusToken } from "@/server/payments/status-token";
import { requireCustomerId, assertAttemptOwnership } from "@/server/payments/customer-auth";
import { PaymentError } from "@/server/payments/payment-errors";
import { checkDualRateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import { getPaymentStatusInfo } from "@/lib/payments/payment-status-labels";
import { isValidObjectId } from "@/server/payments/utils/object-id";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params;

  if (!isValidObjectId(attemptId)) {
    return NextResponse.json({ ok: false, error: "Payment attempt not found." }, { status: 404 });
  }

  const limit = await checkDualRateLimit({
    request: req,
    prefix: "pay_status",
    ipLimit: { limit: 60, windowSeconds: 60 },
  });
  if (!limit.allowed) {
    return createRateLimitResponse(limit, "Too many status checks. Please wait a moment.");
  }

  const attempt = await PaymentAttemptRepository.findById(attemptId);
  if (!attempt) {
    return NextResponse.json({ ok: false, error: "Payment attempt not found." }, { status: 404 });
  }

  // Access is granted by the signed status token handed to the browser at
  // checkout, or by the owning customer's session.
  const token = req.nextUrl.searchParams.get("token");
  const tokenValid = verifyPaymentStatusToken(token, attemptId);

  if (!tokenValid) {
    try {
      const userId = await requireCustomerId(req);
      await assertAttemptOwnership(attempt, userId);
    } catch (err) {
      if (err instanceof PaymentError) {
        return NextResponse.json(
          { ok: false, code: err.code, error: err.message },
          { status: err.statusCode || 403 }
        );
      }
      throw err;
    }
  }

  const statusInfo = getPaymentStatusInfo(attempt.status);

  return NextResponse.json(
    {
      ok: true,
      attempt: {
        id: String(attempt._id),
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        status: attempt.status,
        statusLabel: statusInfo.label,
        customerActivity: attempt.customerActivity,
        reconciliationStatus: attempt.reconciliationStatus,
        expectedAmount: attempt.expectedAmount ?? attempt.amount ?? 0,
        currency: attempt.currency,
        paidAt: attempt.paidAt,
        failedAt: attempt.failedAt,
        cancelledAt: attempt.cancelledAt,
        valId: attempt.valId || attempt.validationId || null,
        bankTranId: attempt.bankTranId || attempt.bankTransactionId || null,
        cardType: attempt.cardType || null,
        cardBrand: attempt.cardBrand || null,
        failureReason: attempt.lastErrorMessage || attempt.failureReason || null,
        isTerminal: statusInfo.isTerminal,
        canRetry: statusInfo.canRetry,
        statusToken: createPaymentStatusToken(String(attempt._id)),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
