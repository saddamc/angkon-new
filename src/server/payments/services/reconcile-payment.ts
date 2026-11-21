import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { PaymentEventRepository } from "../repositories/payment-event.repository";
import { OrderPaymentRepository } from "../repositories/order-payment.repository";
import { querySslcommerzTransactionByTranId } from "../providers/sslcommerz/query-transaction";
import { normalizeSslcommerzResponse } from "../providers/sslcommerz/normalize-response";
import { VerifyPaymentService } from "./verify-payment";
import { FinalizePaymentService } from "./finalize-payment";
import { PAYMENT_CONSTANTS } from "../constants";
import { PaymentAttempt, type IPaymentAttempt } from "@/models/PaymentAttempt";
import { isSuccessfulStatus } from "../payment-state-machine";

export interface ReconcilePaymentResult {
  ok: boolean;
  status: string;
  resolved: boolean;
  requiresManualReview?: boolean;
  error?: string;
}

export class ReconcilePaymentService {
  public static async reconcile(attemptIdOrDoc: string | IPaymentAttempt): Promise<ReconcilePaymentResult> {
    const attempt = typeof attemptIdOrDoc === "string"
      ? await PaymentAttemptRepository.findById(attemptIdOrDoc)
      : attemptIdOrDoc;

    if (!attempt) {
      return { ok: false, status: "not_found", resolved: false, error: "Payment attempt not found" };
    }

    // If already succeeded (including legacy `paid`), ensure reconciliation is resolved.
    if (isSuccessfulStatus(attempt.status)) {
      if (attempt.reconciliationStatus !== "resolved") {
        await PaymentAttempt.findByIdAndUpdate(attempt._id, { $set: { reconciliationStatus: "resolved" } });
      }
      return { ok: true, status: "succeeded", resolved: true };
    }

    const currentAttempts = (attempt.reconcileAttempts || 0) + 1;
    const now = new Date();

    // Check if max reconciliation retries exceeded
    if (currentAttempts > PAYMENT_CONSTANTS.MAX_RECONCILE_ATTEMPTS) {
      await PaymentAttemptRepository.atomicTransition({
        attemptId: attempt._id,
        targetStatus: attempt.status,
        reconciliationStatus: "manual_review",
        note: `Exceeded max reconciliation attempts (${PAYMENT_CONSTANTS.MAX_RECONCILE_ATTEMPTS}). Escalated to manual review.`,
      });

      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        eventType: "reconciliation_failed",
        source: "payment_reconciler",
        metadata: { currentAttempts, reason: "Max reconciliation attempts exceeded" },
      });

      return {
        ok: false,
        status: attempt.status,
        resolved: false,
        requiresManualReview: true,
        error: "Max reconciliation attempts exceeded",
      };
    }

    // Record reconciliation attempt started
    await PaymentEventRepository.recordEvent({
      attemptId: attempt._id,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
      tranId: attempt.tranId,
      eventType: "reconciliation_started",
      source: "payment_reconciler",
      metadata: { attemptCount: currentAttempts },
    });

    try {
      // Query SSLCOMMERZ gateway by transaction ID
      const queryResponse = await querySslcommerzTransactionByTranId(attempt.tranId);

      if (!queryResponse || !queryResponse.status) {
        // Gateway has no record yet (e.g. customer didn't complete or entered gateway and left)
        const sessionAgeHours = (now.getTime() - new Date(attempt.initiatedAt).getTime()) / (1000 * 60 * 60);

        if (sessionAgeHours >= PAYMENT_CONSTANTS.SESSION_EXPIRATION_HOURS) {
          // Expire abandoned session
          await PaymentAttemptRepository.atomicTransition({
            attemptId: attempt._id,
            targetStatus: "expired",
            customerActivity: "no_return_detected",
            reconciliationStatus: "resolved",
            note: "Payment session expired without completion at gateway",
          });

          await OrderPaymentRepository.markOrderPaymentFailed({
            orderNumber: attempt.orderNumber,
            status: "failed",
            reason: "Payment session expired",
            actor: "payment_reconciler",
          });

          await PaymentEventRepository.recordEvent({
            attemptId: attempt._id,
            orderId: attempt.orderId,
            orderNumber: attempt.orderNumber,
            tranId: attempt.tranId,
            eventType: "session_expired",
            source: "payment_reconciler",
            metadata: { sessionAgeHours },
          });

          return { ok: true, status: "expired", resolved: true };
        }

        // Schedule next check with backoff
        const backoffIdx = Math.min(currentAttempts - 1, PAYMENT_CONSTANTS.BACKOFF_SCHEDULE_MINUTES.length - 1);
        const backoffMinutes = PAYMENT_CONSTANTS.BACKOFF_SCHEDULE_MINUTES[backoffIdx];
        const nextCheckAt = new Date(now.getTime() + backoffMinutes * 60 * 1000);

        await PaymentAttempt.findByIdAndUpdate(attempt._id, {
          $set: {
            reconciliationStatus: "scheduled",
            nextCheckAt,
            lastCheckedAt: now,
          },
          $inc: { reconcileAttempts: 1 },
        });

        return { ok: true, status: attempt.status, resolved: false };
      }

      const normalized = normalizeSslcommerzResponse(queryResponse);
      const gatewayStatus = (normalized.status || "").toUpperCase();

      if (gatewayStatus === "VALID" || gatewayStatus === "VALIDATED") {
        const verification = VerifyPaymentService.verifyResult({
          expectedOrderNumber: attempt.orderNumber,
          expectedAmount: attempt.expectedAmount ?? attempt.amount ?? 0,
          expectedCurrency: attempt.currency,
          attemptEnvironment: attempt.environment,
          normalized,
        });

        const finalized = await FinalizePaymentService.finalize({
          attemptId: attempt._id,
          tranId: attempt.tranId,
          valId: normalized.valId,
          verification,
          source: "payment_reconciler",
        });

        await PaymentAttempt.findByIdAndUpdate(attempt._id, {
          $set: {
            reconciliationStatus: finalized.requiresManualReview ? "manual_review" : "resolved",
            reconciledAt: now,
            lastCheckedAt: now,
          },
          $inc: { reconcileAttempts: 1 },
        });

        await PaymentEventRepository.recordEvent({
          attemptId: attempt._id,
          orderId: attempt.orderId,
          orderNumber: attempt.orderNumber,
          tranId: attempt.tranId,
          eventType: "reconciliation_resolved",
          source: "payment_reconciler",
          metadata: { decision: verification.decision, status: "succeeded" },
        });

        return {
          ok: finalized.ok,
          status: finalized.attemptStatus,
          resolved: true,
          requiresManualReview: finalized.requiresManualReview,
        };
      } else if (gatewayStatus === "FAILED") {
        await PaymentAttemptRepository.atomicTransition({
          attemptId: attempt._id,
          targetStatus: "failed",
          reconciliationStatus: "resolved",
          gatewayStatus: "FAILED",
          lastErrorCode: "RECONCILED_FAILED",
          lastErrorMessage: "Gateway confirmed payment failed",
        });

        await OrderPaymentRepository.markOrderPaymentFailed({
          orderNumber: attempt.orderNumber,
          status: "failed",
          reason: "Payment failed at gateway (confirmed via reconciliation)",
          actor: "payment_reconciler",
        });

        await PaymentEventRepository.recordEvent({
          attemptId: attempt._id,
          orderId: attempt.orderId,
          orderNumber: attempt.orderNumber,
          tranId: attempt.tranId,
          eventType: "payment_failed",
          source: "payment_reconciler",
          metadata: { gatewayStatus },
        });

        return { ok: true, status: "failed", resolved: true };
      } else if (gatewayStatus === "CANCELLED") {
        await PaymentAttemptRepository.atomicTransition({
          attemptId: attempt._id,
          targetStatus: "cancelled",
          reconciliationStatus: "resolved",
          gatewayStatus: "CANCELLED",
          lastErrorCode: "RECONCILED_CANCELLED",
          lastErrorMessage: "Gateway confirmed payment cancelled",
        });

        await OrderPaymentRepository.markOrderPaymentFailed({
          orderNumber: attempt.orderNumber,
          status: "cancelled",
          reason: "Payment cancelled at gateway (confirmed via reconciliation)",
          actor: "payment_reconciler",
        });

        await PaymentEventRepository.recordEvent({
          attemptId: attempt._id,
          orderId: attempt.orderId,
          orderNumber: attempt.orderNumber,
          tranId: attempt.tranId,
          eventType: "payment_cancelled",
          source: "payment_reconciler",
          metadata: { gatewayStatus },
        });

        return { ok: true, status: "cancelled", resolved: true };
      } else {
        // Pending or unknown status at gateway
        const backoffIdx = Math.min(currentAttempts - 1, PAYMENT_CONSTANTS.BACKOFF_SCHEDULE_MINUTES.length - 1);
        const backoffMinutes = PAYMENT_CONSTANTS.BACKOFF_SCHEDULE_MINUTES[backoffIdx];
        const nextCheckAt = new Date(now.getTime() + backoffMinutes * 60 * 1000);

        await PaymentAttempt.findByIdAndUpdate(attempt._id, {
          $set: {
            reconciliationStatus: "scheduled",
            nextCheckAt,
            lastCheckedAt: now,
          },
          $inc: { reconcileAttempts: 1 },
        });

        return { ok: true, status: attempt.status, resolved: false };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Schedule next backoff check even on error
      const backoffIdx = Math.min(currentAttempts - 1, PAYMENT_CONSTANTS.BACKOFF_SCHEDULE_MINUTES.length - 1);
      const backoffMinutes = PAYMENT_CONSTANTS.BACKOFF_SCHEDULE_MINUTES[backoffIdx];
      const nextCheckAt = new Date(now.getTime() + backoffMinutes * 60 * 1000);

      await PaymentAttempt.findByIdAndUpdate(attempt._id, {
        $set: {
          nextCheckAt,
          lastCheckedAt: now,
        },
        $inc: { reconcileAttempts: 1 },
      });

      // Persist the failure for operators; a transient gateway/database error
      // must remain visible without downgrading the payment.
      try {
        await PaymentEventRepository.recordEvent({
          attemptId: attempt._id,
          orderId: attempt.orderId,
          orderNumber: attempt.orderNumber,
          tranId: attempt.tranId,
          eventType: "reconciliation_failed",
          source: "payment_reconciler",
          metadata: {
            error: message.slice(0, 300),
            attemptCount: currentAttempts,
            nextCheckAt: nextCheckAt.toISOString(),
          },
        });
      } catch {
        // Event logging must never mask the original reconciliation error.
      }

      return { ok: false, status: attempt.status, resolved: false, error: message };
    }
  }
}
