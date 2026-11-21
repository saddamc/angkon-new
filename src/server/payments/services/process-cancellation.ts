import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { PaymentEventRepository } from "../repositories/payment-event.repository";
import { OrderPaymentRepository } from "../repositories/order-payment.repository";
import { VerifyPaymentService } from "./verify-payment";
import { isSuccessfulStatus } from "../payment-state-machine";
import { createPaymentStatusToken } from "../status-token";

export class ProcessCancellationService {
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
        redirectUrl: "/checkout?error=payment_cancelled",
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

    const cancelReason =
      args.reason ||
      (args.payload?.error as string) ||
      "Customer cancelled payment at gateway";

    const verification = await VerifyPaymentService.verifyFailureNotification({
      valId: args.valId || (args.payload?.val_id as string) || null,
      expectedTranId: attempt.tranId,
    });

    // The cancel redirect is a customer action, not proof that no charge
    // exists. Verify before releasing stock or cancelling the order.
    if (!verification.ok) {
      await PaymentAttemptRepository.atomicTransition({
        attemptId: attempt._id,
        targetStatus: attempt.status,
        customerActivity: "returned_cancelled",
        reconciliationStatus: "scheduled",
        note: `Unverified cancellation ignored (${verification.reason || "unknown"}). Awaiting reconciliation.`,
      });

      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        eventType: "customer_cancelled",
        source: "sslcommerz_callback",
        metadata: {
          unverifiedCancellation: true,
          reason: verification.reason,
          reportedReason: cancelReason,
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
      gatewayStatus === "FAILED"
        ? "failed"
        : gatewayStatus === "EXPIRED"
        ? "expired"
        : "cancelled";
    const orderFailureStatus = targetStatus === "cancelled" ? "cancelled" : "failed";

    await PaymentAttemptRepository.atomicTransition({
      attemptId: attempt._id,
      targetStatus,
      customerActivity: "returned_cancelled",
      reconciliationStatus: "resolved",
      gatewayStatus: gatewayStatus || "CANCELLED",
      lastErrorCode: "PAYMENT_CANCELLED",
      lastErrorMessage: cancelReason,
      validationId: verification.normalized?.valId || null,
    });

    await OrderPaymentRepository.markOrderPaymentFailed({
      orderNumber: attempt.orderNumber,
      status: orderFailureStatus,
      reason: cancelReason,
      actor: "sslcommerz_cancel_callback",
    });

    await PaymentEventRepository.recordEvent({
      attemptId: attempt._id,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
      tranId: attempt.tranId,
      eventType: "payment_cancelled",
      source: "sslcommerz_callback",
      gatewayStatus: gatewayStatus || "CANCELLED",
      metadata: { cancelReason, verified: true },
    });

    return {
      attemptId: String(attempt._id),
      orderNumber: attempt.orderNumber,
      redirectUrl: statusUrl,
      verified: true,
    };
  }
}
