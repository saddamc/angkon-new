import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { PaymentEventRepository } from "../repositories/payment-event.repository";
import { OrderPaymentRepository } from "../repositories/order-payment.repository";
import { VerifyPaymentService } from "./verify-payment";
import { isSuccessfulStatus } from "../payment-state-machine";
import { createPaymentStatusToken } from "../status-token";

export class ProcessFailureService {
  public static async processCallback(args: {
    attemptId?: string | null;
    tranId?: string | null;
    valId?: string | null;
    reason?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<{
    attemptId: string;
    orderNumber: string;
    redirectUrl: string;
    verified: boolean;
  }> {
    let attempt = args.attemptId
      ? await PaymentAttemptRepository.findById(args.attemptId)
      : null;

    if (!attempt && args.tranId) {
      attempt = await PaymentAttemptRepository.findByTranId(args.tranId);
    }

    if (!attempt) {
      return {
        attemptId: "",
        orderNumber: "",
        redirectUrl: "/checkout?error=payment_failed",
        verified: false,
      };
    }

    const statusUrl = `/checkout/payment-status/${attempt._id}?token=${encodeURIComponent(
      createPaymentStatusToken(String(attempt._id))
    )}`;

    // Safety rule: never downgrade an already successful payment.
    if (isSuccessfulStatus(attempt.status)) {
      return {
        attemptId: String(attempt._id),
        orderNumber: attempt.orderNumber,
        redirectUrl: statusUrl,
        verified: true,
      };
    }

    const failureReason =
      args.reason ||
      (args.payload?.error as string) ||
      (args.payload?.failedreason as string) ||
      "Payment failed at gateway";

    // A public redirect is not proof. Only a validator-confirmed failure may
    // move the attempt to a terminal state; everything else stays pending and
    // is handed to reconciliation.
    const verification = await VerifyPaymentService.verifyFailureNotification({
      valId: args.valId || (args.payload?.val_id as string) || null,
      expectedTranId: attempt.tranId,
    });

    if (!verification.ok) {
      await PaymentAttemptRepository.atomicTransition({
        attemptId: attempt._id,
        targetStatus: attempt.status,
        customerActivity: "returned_failed",
        reconciliationStatus: "scheduled",
        lastErrorMessage: failureReason,
        note: `Unverified failure callback ignored (${verification.reason || "unknown"}). Awaiting reconciliation.`,
      });

      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        eventType: "callback_received",
        source: "sslcommerz_callback",
        metadata: {
          unverifiedFailure: true,
          reason: verification.reason,
          reportedReason: failureReason,
        },
      });

      return {
        attemptId: String(attempt._id),
        orderNumber: attempt.orderNumber,
        redirectUrl: statusUrl,
        verified: false,
      };
    }

    const gatewayStatus = verification.normalized?.status;
    const targetStatus =
      gatewayStatus === "CANCELLED"
        ? "cancelled"
        : gatewayStatus === "EXPIRED"
        ? "expired"
        : "failed";
    const orderFailureStatus = targetStatus === "cancelled" ? "cancelled" : "failed";

    await PaymentAttemptRepository.atomicTransition({
      attemptId: attempt._id,
      targetStatus,
      customerActivity: "returned_failed",
      reconciliationStatus: "resolved",
      gatewayStatus: gatewayStatus || "FAILED",
      lastErrorCode: "PAYMENT_FAILED",
      lastErrorMessage: failureReason,
      validationId: verification.normalized?.valId || null,
    });

    await OrderPaymentRepository.markOrderPaymentFailed({
      orderNumber: attempt.orderNumber,
      status: orderFailureStatus,
      reason: failureReason,
      actor: "sslcommerz_fail_callback",
    });

    await PaymentEventRepository.recordEvent({
      attemptId: attempt._id,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
      tranId: attempt.tranId,
      eventType: "payment_failed",
      source: "sslcommerz_callback",
      gatewayStatus: gatewayStatus || "FAILED",
      metadata: { failureReason, verified: true },
    });

    return {
      attemptId: String(attempt._id),
      orderNumber: attempt.orderNumber,
      redirectUrl: statusUrl,
      verified: true,
    };
  }
}
