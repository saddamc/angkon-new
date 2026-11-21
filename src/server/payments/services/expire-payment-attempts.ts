import { PaymentAttempt } from "@/models/PaymentAttempt";
import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { OrderPaymentRepository } from "../repositories/order-payment.repository";
import { PaymentEventRepository } from "../repositories/payment-event.repository";
import { PAYMENT_CONSTANTS } from "../constants";
import { connectToDatabase } from "@/lib/mongodb";

export class ExpirePaymentAttemptsService {
  public static async expireStaleAttempts(maxBatch: number = 50): Promise<{ expiredCount: number }> {
    await connectToDatabase();
    const cutoff = new Date(Date.now() - PAYMENT_CONSTANTS.SESSION_EXPIRATION_HOURS * 60 * 60 * 1000);

    // Only attempts that never received a gateway session can be expired
    // locally. A pending/unknown attempt with a GatewayPageURL may still have
    // succeeded at the gateway; it must be resolved by reconciliation, never
    // released on a timer.
    const staleAttempts = await PaymentAttempt.find({
      status: { $in: ["created", "initiating"] },
      gatewayPageUrl: { $in: [null, ""] },
      initiatedAt: { $lte: cutoff },
    }).limit(maxBatch);

    let expiredCount = 0;

    for (const attempt of staleAttempts) {
      const transition = await PaymentAttemptRepository.atomicTransition({
        attemptId: attempt._id,
        targetStatus: "expired",
        customerActivity: "no_return_detected",
        reconciliationStatus: "resolved",
        note: `Expired after exceeding ${PAYMENT_CONSTANTS.SESSION_EXPIRATION_HOURS} hours inactivity.`,
      });

      if (transition.success) {
        expiredCount++;

        await OrderPaymentRepository.markOrderPaymentFailed({
          orderNumber: attempt.orderNumber,
          status: "failed",
          reason: "Payment attempt expired",
          actor: "expiration_job",
        });

        await PaymentEventRepository.recordEvent({
          attemptId: attempt._id,
          orderId: attempt.orderId,
          orderNumber: attempt.orderNumber,
          tranId: attempt.tranId,
          eventType: "session_expired",
          source: "expiration_job",
          metadata: {
            initiatedAt: attempt.initiatedAt,
            expiredAt: new Date(),
          },
        });
      }
    }

    return { expiredCount };
  }
}
