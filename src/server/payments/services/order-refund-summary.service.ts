/**
 * Authoritative server-side refund summary for an order.
 *
 * Uses PaymentRefund rows as the single source of truth — never the stale
 * Order.paidAmount field for refund math. `Order.paidAmount` remains immutable
 * as the historical captured amount.
 */

import { connectToDatabase } from "@/lib/mongodb";
import { Payment, type IPayment } from "@/models/Payment";
import { PaymentRefund } from "@/models/PaymentRefund";
import { Types } from "mongoose";

export interface EligibleGatewayAttempt {
  attemptId: string;
  tranId: string;
  bankTranId: string | null;
  valId: string | null;
  captured: number;
  completedRefunds: number;
  pendingRefunds: number;
  available: number;
}

export interface OrderRefundSummary {
  /** Sum of all successfully captured (paid) payment amounts for this order. */
  capturedAmount: number;
  /** Sum of all PaymentRefund rows with status succeeded. */
  completedRefundAmount: number;
  /**
   * Sum of all PaymentRefund rows with status initiated | processing.
   * These hold a reservation that counts against the balance.
   */
  pendingRefundAmount: number;
  /** capturedAmount - completedRefundAmount - pendingRefundAmount. Never < 0. */
  availableRefundableAmount: number;
  /** Detailed per-attempt breakdown for the SSLCOMMERZ refund UI. */
  eligibleGatewayAttempts: EligibleGatewayAttempt[];
  /** Sum refundable via manual offline workflow. */
  manualRefundableAmount: number;
  /** Total refunded (completed). Alias for completedRefundAmount. */
  totalRefundedAmount: number;
  /** True when at least one PaymentRefund has reconciliationRequired = true. */
  hasReconciliationPending: boolean;
}

/** Payment statuses that represent money that was actually captured. */
const CAPTURED_STATUSES = ["paid", "succeeded", "refunded", "partially_refunded"] as const;

/**
 * Compute the authoritative refund summary for an order.
 *
 * @param orderNumber - Unique order number string.
 * @param orderId - Optional Order ObjectId (unused, reserved for future sharding).
 */
export async function computeOrderRefundSummary(
  orderNumber: string,
  orderId?: string | Types.ObjectId
): Promise<OrderRefundSummary> {
  await connectToDatabase();

  // 1. Fetch all successfully-captured payment attempts for this order.
  //    Use aggregate to avoid strict-status-enum type conflicts with lean().
  const rawAttempts = await Payment.aggregate<{
    _id: Types.ObjectId;
    tranId: string;
    bankTranId: string | null;
    valId: string | null;
    amount: number;
    expectedAmount: number | null;
    status: string;
  }>([
    {
      $match: {
        orderNumber: orderNumber.trim(),
        status: { $in: CAPTURED_STATUSES as unknown as string[] },
      },
    },
    {
      $project: {
        _id: 1,
        tranId: 1,
        bankTranId: 1,
        valId: 1,
        amount: 1,
        expectedAmount: 1,
        status: 1,
      },
    },
  ]);

  // 2. Fetch all PaymentRefund rows for this order.
  const refunds = await PaymentRefund.find({ orderNumber: orderNumber.trim() }).lean();

  const capturedAmount = rawAttempts.reduce((sum, a) => {
    const amt = typeof a.expectedAmount === "number" ? a.expectedAmount : a.amount || 0;
    return sum + amt;
  }, 0);

  const completedRefundAmount = refunds
    .filter((r) => r.status === "succeeded")
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingRefundAmount = refunds
    .filter((r) => r.status === "initiated" || r.status === "processing")
    .reduce((sum, r) => sum + r.amount, 0);

  const availableRefundableAmount = Math.max(
    0,
    capturedAmount - completedRefundAmount - pendingRefundAmount
  );

  const hasReconciliationPending = refunds.some((r) => r.reconciliationRequired === true);

  // 3. Build per-attempt breakdown.
  const eligibleGatewayAttempts: EligibleGatewayAttempt[] = rawAttempts.map((attempt) => {
    const attemptId = String(attempt._id);
    const attemptRefunds = refunds.filter(
      (r) => r.paymentId && String(r.paymentId) === attemptId
    );
    const captured = typeof attempt.expectedAmount === "number" ? attempt.expectedAmount : attempt.amount || 0;
    const completedRefunds = attemptRefunds
      .filter((r) => r.status === "succeeded")
      .reduce((s, r) => s + r.amount, 0);
    const pendingRefunds = attemptRefunds
      .filter((r) => r.status === "initiated" || r.status === "processing")
      .reduce((s, r) => s + r.amount, 0);
    return {
      attemptId,
      tranId: attempt.tranId || "",
      bankTranId: attempt.bankTranId || null,
      valId: attempt.valId || null,
      captured,
      completedRefunds,
      pendingRefunds,
      available: Math.max(0, captured - completedRefunds - pendingRefunds),
    };
  });

  return {
    capturedAmount,
    completedRefundAmount,
    pendingRefundAmount,
    availableRefundableAmount,
    eligibleGatewayAttempts,
    manualRefundableAmount: availableRefundableAmount,
    totalRefundedAmount: completedRefundAmount,
    hasReconciliationPending,
  };
}
