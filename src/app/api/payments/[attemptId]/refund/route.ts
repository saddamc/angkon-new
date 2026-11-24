import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { ProcessRefundService } from "@/server/payments/services/process-refund";
import { PaymentRefundRepository } from "@/server/payments/repositories/payment-refund.repository";
import { PaymentError } from "@/server/payments/payment-errors";
import { isValidObjectId } from "@/server/payments/utils/object-id";
import { clientIp, createRateLimitResponse, hashIp, rateLimit } from "@/server/security/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const auth = await requireAdminSessionCore(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Refund is a money-moving admin action — cap it per admin IP so a
  // hijacked/compromised session cannot hammer the gateway refund API.
  const refundLimit = await rateLimit(
    `payment_refund:${hashIp(clientIp(req))}`,
    10,
    60
  );
  if (!refundLimit.allowed) {
    return createRateLimitResponse(
      refundLimit,
      "Too many refund requests. Please wait a moment before retrying."
    );
  }

  const { attemptId } = await params;
  if (!isValidObjectId(attemptId)) {
    return NextResponse.json({ ok: false, error: "Payment attempt not found." }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Valid refund amount is required." }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ ok: false, error: "Refund reason is required." }, { status: 400 });
    }

    const result = await ProcessRefundService.initiateRefund({
      attemptId,
      amount,
      reason,
      requestedBy: auth.user || "admin",
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err: unknown) {
    if (err instanceof PaymentError) {
      return NextResponse.json(
        { ok: false, code: err.code, error: err.message },
        { status: err.statusCode || 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal refund processing error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const auth = await requireAdminSessionCore(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { attemptId } = await params;
  const refunds = await PaymentRefundRepository.findByPaymentId(attemptId);

  return NextResponse.json({
    ok: true,
    refunds: refunds.map((r) => ({
      refundId: r.refundId,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      refundRefId: r.refundRefId,
      reason: r.reason,
      requestedBy: r.requestedBy,
      initiatedAt: r.initiatedAt,
      processedAt: r.processedAt,
      failureReason: r.failureReason,
    })),
  });
}
