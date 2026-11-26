/**
 * ProcessRefundService
 *
 * Handles SSLCOMMERZ gateway refunds (initiateRefund / syncRefundStatus) and
 * manual offline refunds (recordManualRefund).
 *
 * Key invariants:
 * - Order.paidAmount is NEVER modified — it is the immutable captured history.
 * - Refund math is always computed from PaymentRefund rows, not order fields.
 * - Timeout / network ambiguity keeps the refund in "initiated" with
 *   reconciliationRequired = true rather than marking it failed — prevents
 *   duplicate gateway submissions after timeouts.
 * - syncRefundStatus does NOT push to Order.statusHistory and does NOT write
 *   non-existent Order fields (refundAmount / refundStatus).
 */

import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { PaymentEventRepository } from "../repositories/payment-event.repository";
import { PaymentRefundRepository } from "../repositories/payment-refund.repository";
import { initiateSslcommerzRefund } from "../providers/sslcommerz/initiate-refund";
import { querySslcommerzRefund } from "../providers/sslcommerz/query-refund";
import { PaymentError } from "../payment-errors";
import { Order } from "@/models/Order";
import { PaymentAttempt } from "@/models/PaymentAttempt";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { isSuccessfulStatus } from "../payment-state-machine";
import { computeOrderRefundSummary } from "./order-refund-summary.service";
import { Types } from "mongoose";

export interface InitiateRefundServiceInput {
  attemptId: string;
  amount: number;
  reason: string;
  requestedBy: string;
  idempotencyKey?: string;
}

export interface ManualRefundInput {
  orderNumber: string;
  orderId: string | Types.ObjectId;
  amount: number;
  refundMethod: string;
  externalReference: string;
  refundDate: Date;
  reason: string;
  requestedBy: string;
  adminNote?: string;
  evidenceNote?: string;
  idempotencyKey?: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
}

/** Ambiguous network/timeout errors — keep initiated, don't mark failed. */
function isAmbiguousNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const name = err.name;
  if (name === "AbortError" || name === "TimeoutError") return true;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up")
  );
}

export class ProcessRefundService {
  /**
   * Initiate a SSLCOMMERZ gateway refund.
   *
   * - Creates an atomic "initiated" reservation before hitting the gateway.
   * - On network/timeout ambiguity: keeps status "initiated", sets
   *   reconciliationRequired = true so the polling job can resolve it.
   * - On deterministic gateway rejection: marks "failed", releases reservation.
   * - Never marks "succeeded" — only syncRefundStatus does that after
   *   provider confirmation.
   */
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

    // Idempotency check — if a non-failed refund with this key already exists, return it.
    if (input.idempotencyKey) {
      const existing = await PaymentRefundRepository.findByIdempotencyKey(
        input.idempotencyKey,
        attempt._id
      );
      if (existing && existing.status !== "failed") {
        return {
          ok: true,
          refundId: existing.refundId,
          status: existing.status,
          refundRefId: existing.refundRefId || null,
          idempotent: true,
        };
      }
    }

    // Fast pre-check (fail early without creating anything).
    const alreadyRefundedPre = await PaymentRefundRepository.getTotalRefundedForPayment(attempt._id, {
      includeInitiated: true,
    });
    if (input.amount <= 0 || input.amount > expectedAmount - alreadyRefundedPre + 0.01) {
      throw new PaymentError(
        `Requested refund amount ৳${input.amount} exceeds available refundable balance of ৳${(
          expectedAmount - alreadyRefundedPre
        ).toFixed(2)}.`,
        "REFUND_AMOUNT_EXCEEDED",
        400
      );
    }

    const refundId = `REF-${attempt.orderNumber}-${Date.now().toString(36).toUpperCase()}`;

    // 1. Reserve the balance BEFORE hitting the gateway (atomic "initiated" row).
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
      refundChannel: "sslcommerz",
      idempotencyKey: input.idempotencyKey ?? null,
    });

    // Post-reservation check: sum now includes this reservation and all concurrent ones.
    const alreadyRefunded = await PaymentRefundRepository.getTotalRefundedForPayment(attempt._id, {
      includeInitiated: true,
    });
    if (alreadyRefunded > expectedAmount + 0.01) {
      await PaymentRefundRepository.updateStatus(refundDoc._id, "failed", {
        failureReason:
          "Concurrent refund request exceeded the available refundable balance — reservation released.",
      });
      throw new PaymentError(
        `Requested refund amount ৳${input.amount} exceeds available refundable balance of ৳${(
          expectedAmount - alreadyRefunded + input.amount
        ).toFixed(2)}.`,
        "REFUND_AMOUNT_EXCEEDED",
        400
      );
    }

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

    // Update order paymentStatus to refund_pending while initiated/processing.
    await Order.findByIdAndUpdate(attempt.orderId, {
      $set: { paymentStatus: "refund_pending" },
    });

    // 2. Call SSLCOMMERZ Initiate Refund API
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

      if (!isSuccess) {
        // Gateway definitively rejected — restore paymentStatus based on actual refunds.
        await ProcessRefundService._syncOrderPaymentStatus(
          attempt.orderId,
          attempt.orderNumber,
          String(attempt._id),
          expectedAmount
        );
      }

      return {
        ok: isSuccess,
        refundId,
        status: isSuccess ? "processing" : "failed",
        refundRefId: gatewayRes.refund_ref_id || null,
        error: isSuccess ? undefined : gatewayRes.errorReason,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (isAmbiguousNetworkError(err)) {
        // Keep "initiated" — do NOT release the reservation. Mark reconciliation needed.
        await PaymentRefundRepository.updateStatus(refundDoc._id, "initiated", {
          reconciliationRequired: true,
          reconcileError: `Ambiguous network error: ${message}`,
        });
        await PaymentEventRepository.recordEvent({
          attemptId: attempt._id,
          orderId: attempt.orderId,
          orderNumber: attempt.orderNumber,
          tranId: attempt.tranId,
          eventType: "refund_timeout_reconcile_needed",
          source: "system",
          metadata: { refundId, error: message },
        });
        return {
          ok: false,
          refundId,
          status: "initiated",
          error: "Network timeout — refund submission status unknown. Reconciliation scheduled.",
          reconciliationRequired: true,
        };
      }

      // Deterministic error — release reservation.
      await PaymentRefundRepository.updateStatus(refundDoc._id, "failed", {
        failureReason: message,
      });
      await ProcessRefundService._syncOrderPaymentStatus(
        attempt.orderId,
        attempt.orderNumber,
        String(attempt._id),
        expectedAmount
      );
      throw err;
    }
  }

  /**
   * Query SSLCOMMERZ for the current refund status and update accordingly.
   *
   * - Only marks "succeeded" after provider confirms "refunded".
   * - Updates Order.paymentStatus based on computed refund summary.
   * - Does NOT push to Order.statusHistory.
   * - Does NOT write non-existent Order fields.
   */
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
      await PaymentRefundRepository.updateStatus(refundDoc._id, "succeeded", {
        rawQueryResponse: queryRes as unknown as Record<string, unknown>,
        reconciliationRequired: false,
        reconcileError: null,
      });

      await PaymentEventRepository.recordEvent({
        attemptId: refundDoc.paymentId,
        orderId: refundDoc.orderId,
        orderNumber: refundDoc.orderNumber,
        tranId: refundDoc.tranId || "",
        eventType: "refund_completed",
        source: "sslcommerz_refund_query",
        metadata: {
          refundId: refundDoc.refundId,
          refundRefId: refundDoc.refundRefId,
          amount: refundDoc.amount,
        },
      });

      // Update PaymentAttempt status.
      const attempt = await PaymentAttempt.findById(refundDoc.paymentId);
      if (attempt) {
        const expectedAmount =
          attempt.expectedAmount !== undefined && attempt.expectedAmount !== null
            ? attempt.expectedAmount
            : attempt.amount || 0;
        const totalRefunded = await PaymentRefundRepository.getTotalRefundedForPayment(refundDoc.paymentId!);
        const isFullRefund = totalRefunded >= expectedAmount - 0.01;
        await PaymentAttempt.findByIdAndUpdate(attempt._id, {
          $set: {
            status: isFullRefund ? "refunded" : "partially_refunded",
            refundedAmount: totalRefunded,
            refundedAt: new Date(),
          },
        });
        // Update Order.paymentStatus only — no statusHistory mutation.
        await Order.findByIdAndUpdate(refundDoc.orderId, {
          $set: {
            paymentStatus: isFullRefund ? "refunded" : "partially_refunded",
          },
        });
      }

      return { ok: true, status: "succeeded" };
    } else if (gatewayStatus === "cancelled" || gatewayStatus === "failed") {
      await PaymentRefundRepository.updateStatus(refundDoc._id, "failed", {
        failureReason: queryRes.errorReason || `Gateway marked refund as ${gatewayStatus}`,
        rawQueryResponse: queryRes as unknown as Record<string, unknown>,
      });
      // Restore order paymentStatus.
      if (refundDoc.paymentId) {
        const attempt = await PaymentAttempt.findById(refundDoc.paymentId);
        if (attempt) {
          const expectedAmount =
            attempt.expectedAmount !== undefined && attempt.expectedAmount !== null
              ? attempt.expectedAmount
              : attempt.amount || 0;
          await ProcessRefundService._syncOrderPaymentStatus(
            refundDoc.orderId,
            refundDoc.orderNumber,
            String(refundDoc.paymentId),
            expectedAmount
          );
        }
      }
      return { ok: false, status: "failed", error: queryRes.errorReason };
    } else {
      return { ok: true, status: "processing" };
    }
  }

  /**
   * Record a manual / offline refund — money returned to the customer outside
   * the payment gateway (bank transfer, mobile banking, cash hand-back, etc.).
   *
   * - Validates amount against available refundable balance.
   * - Creates PaymentRefund with channel = "manual_offline" and status = "succeeded".
   * - Does NOT modify Order.paidAmount.
   * - Updates Order.paymentStatus based on resulting refund summary.
   * - Writes AdminAuditLog for traceability.
   */
  public static async recordManualRefund(
    input: ManualRefundInput
  ): Promise<{ ok: true; refundId: string } | { ok: false; error: string; code: string }> {
    if (!input.amount || input.amount <= 0) {
      return { ok: false, error: "Refund amount must be greater than zero.", code: "INVALID_AMOUNT" };
    }

    const orderId =
      input.orderId instanceof Types.ObjectId
        ? input.orderId
        : new Types.ObjectId(String(input.orderId));

    // Load the order to get its _id for the refund record.
    const order = await Order.findById(orderId).select("_id orderNumber paymentStatus").lean();
    if (!order) {
      return { ok: false, error: "Order not found.", code: "ORDER_NOT_FOUND" };
    }

    // Idempotency check.
    if (input.idempotencyKey) {
      const existing = await PaymentRefundRepository.findByIdempotencyKey(input.idempotencyKey, null);
      if (existing) {
        return { ok: true, refundId: existing.refundId };
      }
    }

    // Compute available balance using the authoritative summary.
    const summary = await computeOrderRefundSummary(input.orderNumber, orderId);
    if (input.amount > summary.availableRefundableAmount + 0.01) {
      return {
        ok: false,
        error: `Refund amount ৳${input.amount} exceeds available refundable balance of ৳${summary.availableRefundableAmount.toFixed(2)}.`,
        code: "REFUND_AMOUNT_EXCEEDED",
      };
    }

    const refundId = `REF-MANUAL-${input.orderNumber}-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date();

    // Create the refund record as immediately succeeded (admin confirmed it already happened).
    await PaymentRefundRepository.createRefund({
      refundId,
      paymentId: null,
      orderId,
      orderNumber: input.orderNumber,
      tranId: null,
      valId: null,
      bankTranId: null,
      amount: input.amount,
      currency: "BDT",
      reason: input.reason,
      requestedBy: input.requestedBy,
      refundChannel: "manual_offline",
      refundMethod: input.refundMethod,
      externalReference: input.externalReference,
      refundDate: input.refundDate ?? now,
      adminNote: input.adminNote ?? null,
      evidenceNote: input.evidenceNote ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      status: "succeeded",
      processedAt: now,
    });

    // Record the payment event (no attempt — manual).
    await PaymentEventRepository.recordEvent({
      attemptId: null,
      orderId,
      orderNumber: input.orderNumber,
      tranId: "",
      eventType: "manual_refund_recorded",
      source: "admin_dashboard",
      metadata: {
        refundId,
        amount: input.amount,
        refundMethod: input.refundMethod,
        externalReference: input.externalReference,
        reason: input.reason,
        requestedBy: input.requestedBy,
      },
    });

    // Compute updated summary and sync Order.paymentStatus.
    const updatedSummary = await computeOrderRefundSummary(input.orderNumber, orderId);
    const isFullRefund = updatedSummary.availableRefundableAmount <= 0.01;
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        paymentStatus: isFullRefund ? "refunded" : "partially_refunded",
      },
    });

    // Audit log.
    await AdminAuditLog.create({
      tenantId: input.tenantId ?? "angkon-main",
      actor: input.requestedBy,
      action: "order.payment.manual_refund",
      targetType: "Order",
      targetId: input.orderNumber,
      before: { paymentStatus: order.paymentStatus },
      after: { paymentStatus: isFullRefund ? "refunded" : "partially_refunded", refundId },
      ip: input.ip ?? "",
      userAgent: input.userAgent ?? "",
    });

    return { ok: true, refundId };
  }

  /**
   * Recompute and sync Order.paymentStatus from actual PaymentRefund rows.
   * Called after a refund fails or reservation is released.
   */
  private static async _syncOrderPaymentStatus(
    orderId: Types.ObjectId,
    orderNumber: string,
    paymentId: string,
    capturedAmount: number
  ): Promise<void> {
    const totalCompleted = await PaymentRefundRepository.getTotalRefundedForPayment(
      new Types.ObjectId(paymentId)
    );
    const pendingTotal = await PaymentRefundRepository.getTotalRefundedForPayment(
      new Types.ObjectId(paymentId),
      { includeInitiated: true }
    );
    const hasPending = pendingTotal - totalCompleted > 0.01;
    let newStatus: string;
    if (hasPending) {
      newStatus = "refund_pending";
    } else if (totalCompleted >= capturedAmount - 0.01) {
      newStatus = "refunded";
    } else if (totalCompleted > 0.01) {
      newStatus = "partially_refunded";
    } else {
      newStatus = "paid";
    }
    await Order.findByIdAndUpdate(orderId, { $set: { paymentStatus: newStatus } });
  }
}
