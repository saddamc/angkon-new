import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { PaymentEventRepository } from "../repositories/payment-event.repository";
import { PaymentRefundRepository } from "../repositories/payment-refund.repository";
import { OrderPaymentRepository } from "../repositories/order-payment.repository";
import { initiateSslcommerzRefund } from "../providers/sslcommerz/initiate-refund";
import { querySslcommerzRefund } from "../providers/sslcommerz/query-refund";
import { PaymentError } from "../payment-errors";
import { Order } from "@/models/Order";
import { PaymentAttempt } from "@/models/PaymentAttempt";
import { isSuccessfulStatus } from "../payment-state-machine";

export interface InitiateRefundServiceInput {
  attemptId: string;
  amount: number;
  reason: string;
  requestedBy: string;
}

export class ProcessRefundService {
  public static async initiateRefund(input: InitiateRefundServiceInput) {
    const attempt = await PaymentAttemptRepository.findById(input.attemptId);
    if (!attempt) {
      throw new PaymentError("Payment attempt not found.", "ATTEMPT_NOT_FOUND", 404);
    }

    if (!isSuccessfulStatus(attempt.status) && attempt.status !== "partially_refunded") {
      throw new PaymentError(
        `Cannot refund a payment in "${attempt.status}" state. Only successful payments can be refunded.`,
        "INVALID_PAYMENT_STATE",
        400
      );
    }

    const bankTranId = attempt.bankTranId || attempt.bankTransactionId;
    if (!bankTranId) {
      throw new PaymentError(
        "Missing bank transaction ID (bank_tran_id) required by SSLCOMMERZ for refund processing.",
        "MISSING_BANK_TRAN_ID",
        400
      );
    }

    const valId = attempt.valId || attempt.validationId;
    if (!valId) {
      throw new PaymentError("Missing validation ID (val_id) for refund processing.", "MISSING_VAL_ID", 400);
    }

    const expectedAmount =
      attempt.expectedAmount !== undefined && attempt.expectedAmount !== null
        ? attempt.expectedAmount
        : attempt.amount || 0;

    const alreadyRefunded = await PaymentRefundRepository.getTotalRefundedForPayment(attempt._id);
    const availableToRefund = expectedAmount - alreadyRefunded;

    if (input.amount <= 0 || input.amount > availableToRefund + 0.01) {
      throw new PaymentError(
        `Requested refund amount ৳${input.amount} exceeds available refundable balance of ৳${availableToRefund.toFixed(2)}.`,
        "REFUND_AMOUNT_EXCEEDED",
        400
      );
    }

    const refundId = `REF-${attempt.orderNumber}-${Date.now().toString(36).toUpperCase()}`;

    // 1. Create durable refund record in 'initiated' state
    const refundDoc = await PaymentRefundRepository.createRefund({
      refundId,
      paymentId: attempt._id,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
      tranId: attempt.tranId,
      valId,
      bankTranId,
      amount: input.amount,
      currency: attempt.currency || "BDT",
      reason: input.reason,
      requestedBy: input.requestedBy,
    });

    await PaymentEventRepository.recordEvent({
      attemptId: attempt._id,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
      tranId: attempt.tranId,
      eventType: "refund_initiated",
      source: "admin_dashboard",
      metadata: {
        refundId,
        amount: input.amount,
        reason: input.reason,
        requestedBy: input.requestedBy,
      },
    });

    // 2. Call official SSLCOMMERZ Initiate Refund API
    try {
      const gatewayRes = await initiateSslcommerzRefund({
        bankTranId,
        refundAmount: input.amount,
        refundRemarks: input.reason,
        refundRefId: refundId,
      });

      const isSuccess = gatewayRes.status === "success";

      await PaymentRefundRepository.updateStatus(
        refundDoc._id,
        isSuccess ? "processing" : "failed",
        {
          refundRefId: gatewayRes.refund_ref_id || null,
          failureReason: isSuccess ? null : gatewayRes.errorReason || "Gateway rejected refund request",
          rawResponse: gatewayRes as unknown as Record<string, unknown>,
        }
      );

      return {
        ok: isSuccess,
        refundId,
        status: isSuccess ? "processing" : "failed",
        refundRefId: gatewayRes.refund_ref_id || null,
        error: isSuccess ? undefined : gatewayRes.errorReason,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await PaymentRefundRepository.updateStatus(refundDoc._id, "failed", {
        failureReason: message,
      });
      throw err;
    }
  }

  public static async syncRefundStatus(refundId: string) {
    const refundDoc = await PaymentRefundRepository.findByRefundId(refundId);
    if (!refundDoc) {
      throw new PaymentError(`Refund record "${refundId}" not found.`, "REFUND_NOT_FOUND", 404);
    }

    if (!refundDoc.refundRefId) {
      return { ok: false, status: refundDoc.status, error: "No gateway refund_ref_id present to query" };
    }

    if (refundDoc.status === "succeeded") {
      return { ok: true, status: "succeeded", alreadyCompleted: true };
    }

    const queryRes = await querySslcommerzRefund(refundDoc.refundRefId);
    const gatewayStatus = (queryRes.status || "").toLowerCase();

    if (gatewayStatus === "refunded") {
      // Refund finalized at bank
      await PaymentRefundRepository.updateStatus(refundDoc._id, "succeeded", {
        rawQueryResponse: queryRes as unknown as Record<string, unknown>,
      });

      await PaymentEventRepository.recordEvent({
        attemptId: refundDoc.paymentId,
        orderId: refundDoc.orderId,
        orderNumber: refundDoc.orderNumber,
        tranId: refundDoc.tranId,
        eventType: "refund_completed",
        source: "sslcommerz_refund_query",
        metadata: {
          refundId: refundDoc.refundId,
          refundRefId: refundDoc.refundRefId,
          amount: refundDoc.amount,
        },
      });

      // Update attempt and order refund aggregations
      const totalRefunded = await PaymentRefundRepository.getTotalRefundedForPayment(refundDoc.paymentId);
      const attempt = await PaymentAttempt.findById(refundDoc.paymentId);
      if (attempt) {
        const expectedAmount =
          attempt.expectedAmount !== undefined && attempt.expectedAmount !== null
            ? attempt.expectedAmount
            : attempt.amount || 0;
        const isFullRefund = totalRefunded >= expectedAmount - 0.01;
        const targetStatus = isFullRefund ? "refunded" : "partially_refunded";

        await PaymentAttempt.findByIdAndUpdate(attempt._id, {
          $set: {
            status: targetStatus,
            refundedAmount: totalRefunded,
            refundedAt: new Date(),
          },
        });

        await Order.findByIdAndUpdate(refundDoc.orderId, {
          $set: {
            refundAmount: totalRefunded,
            refundStatus: isFullRefund ? "refunded" : "partially_refunded",
          },
          $push: {
            statusHistory: {
              status: isFullRefund ? "refunded" : "processing",
              previousStatus: "processing",
              actor: "refund_service",
              note: `Refund of ৳${refundDoc.amount} completed (Gateway Ref: ${refundDoc.refundRefId})`,
              source: "payment_gateway",
              at: new Date(),
            },
          },
        });
      }

      return { ok: true, status: "succeeded" };
    } else if (gatewayStatus === "cancelled" || gatewayStatus === "failed") {
      await PaymentRefundRepository.updateStatus(refundDoc._id, "failed", {
        failureReason: queryRes.errorReason || `Gateway marked refund as ${gatewayStatus}`,
        rawQueryResponse: queryRes as unknown as Record<string, unknown>,
      });
      return { ok: false, status: "failed", error: queryRes.errorReason };
    } else {
      // Still processing at gateway / bank
      return { ok: true, status: "processing" };
    }
  }
}
