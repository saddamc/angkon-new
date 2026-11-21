import { PaymentWebhookRepository } from "../repositories/payment-webhook.repository";
import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { PaymentEventRepository } from "../repositories/payment-event.repository";
import { OrderPaymentRepository } from "../repositories/order-payment.repository";
import { validateSslcommerzTransaction } from "../providers/sslcommerz/validate-transaction";
import { normalizeSslcommerzResponse } from "../providers/sslcommerz/normalize-response";
import { VerifyPaymentService } from "./verify-payment";
import { FinalizePaymentService } from "./finalize-payment";
import { isSuccessfulStatus } from "../payment-state-machine";

export interface ProcessIpnResult {
  ok: boolean;
  alreadyProcessed?: boolean;
  ignored?: boolean;
  attemptId?: string;
  orderNumber?: string;
  error?: string;
}

export class ProcessIpnService {
  public static async processWebhook(payload: Record<string, unknown>): Promise<ProcessIpnResult> {
    const tranId = String(payload.tran_id || payload.tranId || "").trim();
    const valId = payload.val_id ? String(payload.val_id).trim() : null;
    const status = String(payload.status || "").trim().toUpperCase();
    const amount = payload.amount !== undefined ? Number(payload.amount) : undefined;

    if (!tranId) {
      return { ok: false, error: "Missing tran_id in IPN payload" };
    }

    // 1. Persist the notification before doing anything else. If this write
    // fails the route returns 500 so SSLCOMMERZ retries, and the reconciliation
    // worker can still recover the transaction independently.
    const { isDuplicate, inboxDoc } = await PaymentWebhookRepository.recordInboundWebhook({
      provider: "sslcommerz",
      tranId,
      valId,
      status,
      amount,
      rawPayload: payload,
    });

    if (isDuplicate && inboxDoc.processingStatus === "processed") {
      return {
        ok: true,
        alreadyProcessed: true,
        attemptId: inboxDoc.attemptId ? String(inboxDoc.attemptId) : undefined,
      };
    }

    // 2. Locate the payment attempt (same `payments` collection for legacy rows).
    const attempt = await PaymentAttemptRepository.findByTranId(tranId);
    if (!attempt) {
      await PaymentWebhookRepository.markProcessed(inboxDoc._id, "ignored", `Attempt not found for tranId: ${tranId}`);
      return { ok: false, error: `Attempt not found for tranId: ${tranId}` };
    }

    if (!inboxDoc.attemptId) {
      inboxDoc.attemptId = attempt._id;
      await inboxDoc.save();
    }

    try {
      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        eventType: "ipn_received",
        source: "sslcommerz_ipn",
        gatewayStatus: status,
        metadata: { valId, amount },
      });

      if (status === "VALID" || status === "VALIDATED") {
        // Idempotency: a second success notification must not re-confirm the
        // order or re-commit inventory.
        if (isSuccessfulStatus(attempt.status)) {
          await PaymentWebhookRepository.markProcessed(inboxDoc._id, "processed");
          return {
            ok: true,
            alreadyProcessed: true,
            attemptId: String(attempt._id),
            orderNumber: attempt.orderNumber,
          };
        }

        if (!valId) {
          await PaymentWebhookRepository.markProcessed(inboxDoc._id, "failed", "Missing val_id in VALID IPN");
          return { ok: false, error: "Missing val_id in VALID IPN payload" };
        }

        const rawValidation = await validateSslcommerzTransaction(valId);
        const normalized = normalizeSslcommerzResponse(rawValidation);

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
          valId,
          verification,
          source: "sslcommerz_ipn",
        });

        await PaymentWebhookRepository.markProcessed(
          inboxDoc._id,
          finalized.ok ? "processed" : "failed",
          finalized.error
        );

        return {
          ok: finalized.ok,
          attemptId: String(attempt._id),
          orderNumber: attempt.orderNumber,
          error: finalized.error,
        };
      }

      if (status === "FAILED" || status === "CANCELLED" || status === "CANCEL" || status === "EXPIRED") {
        // Never downgrade a confirmed payment.
        if (isSuccessfulStatus(attempt.status)) {
          await PaymentWebhookRepository.markProcessed(inboxDoc._id, "processed");
          return {
            ok: true,
            alreadyProcessed: true,
            attemptId: String(attempt._id),
            orderNumber: attempt.orderNumber,
          };
        }

        // The IPN endpoint is public: a forged `status=FAILED` must not cancel
        // a legitimate order. Require validator confirmation of the val_id.
        const verification = await VerifyPaymentService.verifyFailureNotification({
          valId,
          expectedTranId: attempt.tranId,
        });

        if (!verification.ok) {
          await PaymentWebhookRepository.markProcessed(
            inboxDoc._id,
            "ignored",
            `Unverified ${status} notification: ${verification.reason || "unknown"}`
          );
          await PaymentEventRepository.recordEvent({
            attemptId: attempt._id,
            orderId: attempt.orderId,
            orderNumber: attempt.orderNumber,
            tranId: attempt.tranId,
            eventType: "validation_failed",
            source: "sslcommerz_ipn",
            gatewayStatus: status,
            metadata: { unverifiedFailure: true, reason: verification.reason },
          });

          return {
            ok: true,
            ignored: true,
            attemptId: String(attempt._id),
            orderNumber: attempt.orderNumber,
          };
        }

        const gatewayStatus = verification.normalized?.status;
        const targetStatus =
          gatewayStatus === "FAILED"
            ? "failed"
            : gatewayStatus === "EXPIRED"
            ? "expired"
            : "cancelled";
        const orderFailureStatus = targetStatus === "cancelled" ? "cancelled" : "failed";
        const failureReason = String(
          payload.failedreason || payload.error || `Gateway confirmed ${gatewayStatus || status}`
        );

        await PaymentAttemptRepository.atomicTransition({
          attemptId: attempt._id,
          targetStatus,
          reconciliationStatus: "resolved",
          gatewayStatus: gatewayStatus || status,
          lastErrorCode: `IPN_${targetStatus.toUpperCase()}`,
          lastErrorMessage: failureReason,
          validationId: verification.normalized?.valId || null,
        });

        await OrderPaymentRepository.markOrderPaymentFailed({
          orderNumber: attempt.orderNumber,
          status: orderFailureStatus,
          reason: failureReason,
          actor: "sslcommerz_ipn",
        });

        await PaymentEventRepository.recordEvent({
          attemptId: attempt._id,
          orderId: attempt.orderId,
          orderNumber: attempt.orderNumber,
          tranId: attempt.tranId,
          eventType: targetStatus === "failed" ? "payment_failed" : "payment_cancelled",
          source: "sslcommerz_ipn",
          gatewayStatus: gatewayStatus || status,
          metadata: { failureReason, verified: true },
        });

        await PaymentWebhookRepository.markProcessed(inboxDoc._id, "processed");
        return { ok: true, attemptId: String(attempt._id), orderNumber: attempt.orderNumber };
      }

      // Unknown / pending / unattempted: keep the attempt alive and schedule it.
      await PaymentAttemptRepository.atomicTransition({
        attemptId: attempt._id,
        targetStatus: attempt.status === "created" || attempt.status === "initiating" ? "unknown" : attempt.status,
        reconciliationStatus: "scheduled",
        gatewayStatus: status || "UNKNOWN",
        note: `Received unhandled IPN status: ${status || "EMPTY"}`,
      });

      await PaymentWebhookRepository.markProcessed(inboxDoc._id, "processed");
      return {
        ok: true,
        attemptId: String(attempt._id),
        orderNumber: attempt.orderNumber,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await PaymentWebhookRepository.markProcessed(inboxDoc._id, "failed", message);
      throw err;
    }
  }
}
