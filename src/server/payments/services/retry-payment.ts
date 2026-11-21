import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { OrderPaymentRepository } from "../repositories/order-payment.repository";
import { InitiatePaymentService } from "./initiate-payment";
import { PaymentError } from "../payment-errors";
import { MAX_PAYMENT_ATTEMPTS } from "../constants";
import { normalizePaymentStatus, isSuccessfulStatus } from "../payment-state-machine";

export interface RetryPaymentInput {
  attemptId?: string;
  orderNumber?: string;
  appBaseUrl: string;
  idempotencyKey?: string;
}

export class RetryPaymentService {
  public static async retry(input: RetryPaymentInput) {
    let orderNumber = input.orderNumber?.trim();

    if (!orderNumber && input.attemptId) {
      const prevAttempt = await PaymentAttemptRepository.findById(input.attemptId);
      if (prevAttempt) {
        orderNumber = prevAttempt.orderNumber;
      }
    }

    if (!orderNumber) {
      throw new PaymentError("Order number or valid attemptId is required to retry payment.", "INVALID_INPUT", 400);
    }

    const order = await OrderPaymentRepository.findByOrderNumber(orderNumber);
    if (!order) {
      throw new PaymentError(`Order "${orderNumber}" not found.`, "ORDER_NOT_FOUND", 404);
    }

    if (order.paymentStatus === "paid") {
      throw new PaymentError("This order has already been paid.", "ALREADY_PAID", 400);
    }

    const attemptsCount = await PaymentAttemptRepository.countAttemptsForOrder(orderNumber);
    if (attemptsCount >= MAX_PAYMENT_ATTEMPTS) {
      throw new PaymentError(
        `Maximum payment attempts (${MAX_PAYMENT_ATTEMPTS}) reached for this order. Please contact support.`,
        "MAX_ATTEMPTS_EXCEEDED",
        429
      );
    }

    // Retry is only safe once the previous attempt is definitively terminal.
    // A pending, initiating, unknown or high-risk attempt may still succeed at
    // the gateway, so starting a second charge is never allowed automatically.
    const latestAttempt = await PaymentAttemptRepository.findLatestByOrderNumber(orderNumber);

    if (latestAttempt && isSuccessfulStatus(latestAttempt.status)) {
      throw new PaymentError(
        "This order already has a confirmed payment.",
        "ALREADY_PAID",
        409
      );
    }

    if (latestAttempt) {
      const latestStatus = normalizePaymentStatus(latestAttempt.status);
      const isReturnedFromGateway =
        latestAttempt.customerActivity === "returned_cancelled" ||
        latestAttempt.customerActivity === "returned_failed";

      if (
        !isReturnedFromGateway &&
        (latestStatus === "pending" ||
          latestStatus === "initiating" ||
          latestStatus === "created" ||
          latestStatus === "unknown" ||
          latestStatus === "review_required")
      ) {
        throw new PaymentError(
          "We are still checking your previous payment. Please do not submit another payment until its status is confirmed.",
          "RETRY_NOT_ALLOWED",
          409
        );
      }

      if (isReturnedFromGateway && (latestStatus === "pending" || latestStatus === "initiating")) {
        const targetStatus =
          latestAttempt.customerActivity === "returned_cancelled" ? "cancelled" : "failed";
        await PaymentAttemptRepository.atomicTransition({
          attemptId: latestAttempt._id,
          targetStatus,
          reconciliationStatus: "resolved",
          note: `Customer initiated retry after returning with ${latestAttempt.customerActivity}.`,
        });
      }
    }

    // Initiate fresh payment attempt
    return await InitiatePaymentService.initiate({
      orderNumber,
      appBaseUrl: input.appBaseUrl,
      idempotencyKey: input.idempotencyKey,
    });
  }
}
