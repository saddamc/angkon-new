import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { PaymentAttemptRepository } from "@/server/payments/repositories/payment-attempt.repository";
import { PaymentEventRepository } from "@/server/payments/repositories/payment-event.repository";
import { PaymentError } from "@/server/payments/payment-errors";
import { securityLog } from "@/server/security/security-log";
import { PaymentAttempt } from "@/models/PaymentAttempt";
import { normalizePaymentStatus } from "@/server/payments/payment-state-machine";
import { isValidObjectId } from "@/server/payments/utils/object-id";

/**
 * Append-only internal review note.
 *
 * Notes never change the financial status; they add evidence to the audit
 * trail and (optionally) flag the attempt for manual review.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const auth = await requireAdminSessionCore(req);
  if (!auth.authorized || auth.response) {
    return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { attemptId } = await params;
  if (!isValidObjectId(attemptId)) {
    return NextResponse.json({ ok: false, error: "Payment attempt not found." }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const flagForReview = body.flagForReview === true;

  if (!note) {
    return NextResponse.json({ ok: false, error: "A review note is required." }, { status: 400 });
  }

  if (note.length > 2000) {
    return NextResponse.json({ ok: false, error: "Review note is too long (max 2000 characters)." }, { status: 400 });
  }

  const attempt = await PaymentAttemptRepository.findById(attemptId);
  if (!attempt) {
    return NextResponse.json({ ok: false, error: "Payment attempt not found." }, { status: 404 });
  }

  const currentStatus = normalizePaymentStatus(attempt.status);

  try {
    await PaymentEventRepository.recordEvent({
      attemptId: attempt._id,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
      tranId: attempt.tranId,
      eventType: flagForReview ? "manual_review_started" : "manual_note",
      source: "admin_dashboard",
      metadata: {
        note,
        admin: auth.user || "unknown",
        previousStatus: currentStatus,
        flaggedForReview: flagForReview,
      },
    });

    if (flagForReview) {
      await PaymentAttempt.findByIdAndUpdate(attempt._id, {
        $set: { reconciliationStatus: "manual_review" },
      });
    }

    securityLog("payment.review_note", {
      actor: `admin:${auth.user || "unknown"}`,
      attemptId,
      flaggedForReview: flagForReview,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PaymentError) {
      return NextResponse.json(
        { ok: false, code: err.code, error: err.message },
        { status: err.statusCode || 400 }
      );
    }
    return NextResponse.json({ ok: false, error: "Could not save the review note." }, { status: 500 });
  }
}
