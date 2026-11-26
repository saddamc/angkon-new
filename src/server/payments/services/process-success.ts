import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { PaymentEventRepository } from "../repositories/payment-event.repository";
import { validateSslcommerzTransaction } from "../providers/sslcommerz/validate-transaction";
import { normalizeSslcommerzResponse } from "../providers/sslcommerz/normalize-response";
import { VerifyPaymentService } from "./verify-payment";
import { FinalizePaymentService } from "./finalize-payment";
import { isSuccessfulStatus } from "../payment-state-machine";
import { createPaymentStatusToken } from "../status-token";

export class ProcessSuccessService {
  public static async processCallback(args: {
    attemptId?: string | null;
    tranId?: string | null;
    valId?: string | null;
    payload: Record<string, unknown>;
  }): Promise<{
    ok: boolean;
    attemptId: string;
    orderNumber: string;
    requiresManualReview: boolean;
    redirectUrl: string;
  }> {
    let attempt = args.attemptId
      ? await PaymentAttemptRepository.findById(args.attemptId)
      : null;

    if (!attempt && args.tranId) {
      attempt = await PaymentAttemptRepository.findByTranId(args.tranId);
    }

    if (!attempt) {
      return {
        ok: false,
        attemptId: "",
        orderNumber: "",
        requiresManualReview: false,
        redirectUrl: "/checkout?error=payment_attempt_not_found",
      };
    }

    const alreadySuccessful = isSuccessfulStatus(attempt.status);
    const statusRedirect = `/checkout/payment/result?attemptId=${encodeURIComponent(
      String(attempt._id)
    )}&token=${encodeURIComponent(createPaymentStatusToken(String(attempt._id)))}`;

    await PaymentEventRepository.recordEvent({
      attemptId: attempt._id,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
      tranId: attempt.tranId,
      eventType: "callback_received",
      source: "customer_browser",
      metadata: { alreadySuccessful },
    });

    // Browser callback alone is never proof of payment. It must have a val_id
    // and validate server-side, even when the attempt already looks paid —
    // a replay must not trigger a second order confirmation or stock commit.
    const valId = args.valId || (args.payload.val_id as string);
    if (!valId) {
      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        eventType: "validation_failed",
        source: "customer_browser",
        metadata: { error: "Missing val_id in success callback" },
      });

      if (alreadySuccessful) {
        return {
          ok: true,
          attemptId: String(attempt._id),
          orderNumber: attempt.orderNumber,
          requiresManualReview: false,
          redirectUrl: `/thankyou-for-shopping?order=${encodeURIComponent(attempt.orderNumber)}&payment=success`,
        };
      }

      return {
        ok: false,
        attemptId: String(attempt._id),
        orderNumber: attempt.orderNumber,
        requiresManualReview: true,
        redirectUrl: `${statusRedirect}&status=unconfirmed`,
      };
    }

    const existingValId = attempt.valId || attempt.validationId;
    if (alreadySuccessful && existingValId && valId && existingValId !== valId) {
      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        eventType: "duplicate_val_id_detected",
        source: "customer_browser",
        metadata: { settledValId: existingValId, replayValId: valId },
      });
    }

    await PaymentEventRepository.recordEvent({
      attemptId: attempt._id,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
      tranId: attempt.tranId,
      eventType: "validation_started",
      source: "sslcommerz_callback",
      metadata: { valId },
    });

    let rawValidation: Awaited<ReturnType<typeof validateSslcommerzTransaction>>;
    try {
      rawValidation = await validateSslcommerzTransaction(valId);
    } catch (err) {
      // A validator outage must never be reported as a failed payment. Keep
      // the attempt pending and let reconciliation retry.
      // CRITICAL: Never overwrite an already-settled attempt's reconciliationStatus,
      // paidAt, or validatedAt when a replay callback hits a transient validator outage.
      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        eventType: "validation_failed",
        source: "sslcommerz_callback",
        metadata: {
          error: err instanceof Error ? err.message : String(err),
          retryScheduled: !alreadySuccessful,
          alreadySuccessful,
        },
      });

      if (alreadySuccessful) {
        return {
          ok: true,
          attemptId: String(attempt._id),
          orderNumber: attempt.orderNumber,
          requiresManualReview: false,
          redirectUrl: `/thankyou-for-shopping?order=${encodeURIComponent(attempt.orderNumber)}&payment=success`,
        };
      }

      await PaymentAttemptRepository.atomicTransition({
        attemptId: attempt._id,
        targetStatus: "unknown",
        reconciliationStatus: "scheduled",
        note: "Validator temporarily unavailable; awaiting reconciliation.",
      });

      return {
        ok: false,
        attemptId: String(attempt._id),
        orderNumber: attempt.orderNumber,
        requiresManualReview: false,
        redirectUrl: `${statusRedirect}&status=unconfirmed`,
      };
    }

    const normalized = normalizeSslcommerzResponse(rawValidation);

    const verification = VerifyPaymentService.verifyResult({
      expectedOrderNumber: attempt.orderNumber,
      expectedAmount: attempt.expectedAmount ?? attempt.amount ?? 0,
      expectedCurrency: attempt.currency,
      attemptEnvironment: attempt.environment,
      normalized,
    });

    await PaymentEventRepository.recordEvent({
      attemptId: attempt._id,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
      tranId: attempt.tranId,
      eventType: verification.isValid ? "validation_succeeded" : "validation_failed",
      source: "sslcommerz_callback",
      metadata: { decision: verification.decision, reason: verification.reason },
    });

    const finalized = await FinalizePaymentService.finalize({
      attemptId: attempt._id,
      tranId: attempt.tranId,
      valId,
      verification,
      source: "sslcommerz_callback",
    });

    // Success sends the customer to the order confirmation page so the
    // existing thank-you tracker keeps working; failures and review states go
    // to the dedicated status page.
    const redirectUrl = verification.decision === "succeeded" && finalized.ok
      ? `/thankyou-for-shopping?order=${encodeURIComponent(attempt.orderNumber)}&payment=success`
      : statusRedirect;

    return {
      ok: finalized.ok,
      attemptId: String(attempt._id),
      orderNumber: attempt.orderNumber,
      requiresManualReview: finalized.requiresManualReview,
      redirectUrl,
    };
  }
}
