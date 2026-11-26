import type { FinalizePaymentInput, FinalizePaymentResult } from "../types";
import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { PaymentEventRepository } from "../repositories/payment-event.repository";
import { OrderPaymentRepository } from "../repositories/order-payment.repository";
import { isSuccessfulStatus } from "../payment-state-machine";
import { sendVerifiedPurchaseCapi } from "../capi";
import { dispatchVerifiedPaidInvoiceEmails } from "@/server/email/email-outbox.service";

export class FinalizePaymentService {
  public static async finalize(input: FinalizePaymentInput): Promise<FinalizePaymentResult> {
    const attempt = await PaymentAttemptRepository.findById(input.attemptId);
    if (!attempt) {
      return {
        ok: false,
        alreadySettled: false,
        attemptStatus: "unknown",
        orderStatus: "unknown",
        orderPaymentStatus: "unknown",
        orderNumber: "",
        requiresManualReview: false,
        error: "Payment attempt not found.",
      };
    }

    const { decision, normalized, reason, details } = input.verification;
    const isHighRisk = decision === "review_required" && normalized.riskLevel === "1";

    // 1. Success case
    if (decision === "succeeded" || isHighRisk) {
      // Idempotency: if this attempt is already settled successfully, return
      // without writing another confirmation or re-committing inventory.
      if (isSuccessfulStatus(attempt.status) && !isHighRisk) {
        const currentOrder = await OrderPaymentRepository.findByOrderNumber(attempt.orderNumber);
        return {
          ok: true,
          alreadySettled: true,
          attemptStatus: attempt.status,
          orderStatus: currentOrder?.orderStatus || "confirmed",
          orderPaymentStatus: currentOrder?.paymentStatus || "paid",
          orderNumber: attempt.orderNumber,
          requiresManualReview: false,
        };
      }

      const targetAttemptStatus = isHighRisk ? "review_required" : "succeeded";
      const reconStatus = isHighRisk ? "manual_review" : "resolved";

      const attemptUpdate = await PaymentAttemptRepository.atomicTransition({
        attemptId: attempt._id,
        targetStatus: targetAttemptStatus,
        customerActivity: input.source.includes("callback") ? "returned_success" : undefined,
        reconciliationStatus: reconStatus,
        validationId: normalized.valId,
        bankTransactionId: normalized.bankTranId,
        gatewayAmount: Number.isFinite(normalized.amount) ? normalized.amount : null,
        storeAmount: normalized.storeAmount ?? null,
        tranDate: normalized.tranDate ?? null,
        validatedOn: normalized.validatedOn ?? null,
        cardType: normalized.cardType,
        cardBrand: normalized.cardBrand,
        cardIssuer: normalized.cardIssuer ?? null,
        riskLevel: normalized.riskLevel,
        riskTitle: normalized.riskTitle,
        gatewayStatus: normalized.status,
        rawValidation: normalized.rawResponse,
        note: details || reason || null,
      });

      // Settle the order and finalize inventory exactly once.
      const orderSettlement = await OrderPaymentRepository.settleOrderPayment({
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        amount: normalized.amount || attempt.expectedAmount || attempt.amount || 0,
        paymentId: attempt._id,
        valId: normalized.valId,
        isHighRisk,
        actor: input.source,
      });

      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        eventType: isHighRisk ? "payment_review_required" : "payment_confirmed",
        source: input.source,
        gatewayStatus: normalized.status,
        metadata: {
          valId: normalized.valId,
          amount: normalized.amount,
          riskLevel: normalized.riskLevel,
          alreadySettled: orderSettlement.alreadySettled,
        },
        correlationId: input.correlationId,
      });

      if (!isHighRisk && orderSettlement.settled) {
        await sendVerifiedPurchaseCapi(attempt.orderId);

        // Dispatch Official Paid Invoice Email via persistent EmailDelivery outbox.
        // Never mark invoiceSentAt prior to Resend confirmation, and never allow
        // PDF or email failure to roll back a canonically verified payment.
        try {
          const targetOrder = orderSettlement.order;
          if (targetOrder) {
            await dispatchVerifiedPaidInvoiceEmails({
              orderId: String(targetOrder._id),
              userId: targetOrder.userId ? String(targetOrder.userId) : null,
              orderNumber: targetOrder.orderNumber,
              paymentMethod: targetOrder.paymentMethod,
              paymentStatus: targetOrder.paymentStatus || "paid",
              orderStatus: targetOrder.orderStatus || "confirmed",
              paidAmount: targetOrder.paidAmount ?? targetOrder.total,
              expectedCodAmount: 0,
              subtotal: targetOrder.subtotal,
              shippingFee: targetOrder.shippingFee,
              discount: targetOrder.discount ?? 0,
              promoCode: targetOrder.promoCode || "",
              total: targetOrder.total,
              notes: targetOrder.notes,
              createdAt: targetOrder.createdAt ? new Date(targetOrder.createdAt).toISOString() : null,
              paidAt: (targetOrder.paidAt || attempt.paidAt || new Date()).toISOString(),
              customer: {
                fullName: targetOrder.customer.fullName,
                email: targetOrder.customer.email,
                phone: targetOrder.customer.phone,
                address: targetOrder.customer.address,
                city: targetOrder.customer.city,
                district: targetOrder.customer.district,
                postalCode: targetOrder.customer.postalCode,
              },
              items: targetOrder.items.map((it) => ({
                productId: it.productId,
                slug: it.slug,
                name: it.name,
                price: it.price,
                quantity: it.quantity,
                size: it.size,
                color: it.color,
                image: it.image,
              })),
              payment: {
                attemptId: String(attempt._id),
                tranId: attempt.tranId,
                valId: normalized.valId || null,
                bankTranId: normalized.bankTranId || null,
                cardType: normalized.cardType || null,
                cardBrand: normalized.cardBrand || null,
                cardIssuer: normalized.cardIssuer || null,
                amount: normalized.amount || attempt.expectedAmount || targetOrder.total,
                currency: attempt.currency || "BDT",
                paidAt: (attempt.paidAt || new Date()).toISOString(),
              },
            });
          }
        } catch (err) {
          console.warn("Paid invoice outbox dispatch warning:", err);
        }
      }

      return {
        ok: true,
        alreadySettled: orderSettlement.alreadySettled,
        attemptStatus: attemptUpdate.attempt?.status || targetAttemptStatus,
        orderStatus: orderSettlement.order?.orderStatus || "confirmed",
        orderPaymentStatus: orderSettlement.order?.paymentStatus || "paid",
        orderNumber: attempt.orderNumber,
        requiresManualReview: isHighRisk,
      };
    }

    // Success is terminal. A late failure/cancellation notification must never
    // downgrade a settled attempt or emit a misleading failure event.
    if (isSuccessfulStatus(attempt.status)) {
      const currentOrder = await OrderPaymentRepository.findByOrderNumber(attempt.orderNumber);
      return {
        ok: true,
        alreadySettled: true,
        attemptStatus: attempt.status,
        orderStatus: currentOrder?.orderStatus || "confirmed",
        orderPaymentStatus: currentOrder?.paymentStatus || "paid",
        orderNumber: attempt.orderNumber,
        requiresManualReview: false,
      };
    }

    // 2. Failure case
    if (decision === "failed") {
      await PaymentAttemptRepository.atomicTransition({
        attemptId: attempt._id,
        targetStatus: "failed",
        customerActivity: input.source.includes("callback") ? "returned_failed" : undefined,
        reconciliationStatus: "resolved",
        gatewayStatus: normalized.status,
        lastErrorCode: reason,
        lastErrorMessage: details || reason,
      });

      await OrderPaymentRepository.markOrderPaymentFailed({
        orderNumber: attempt.orderNumber,
        status: "failed",
        reason: details || reason,
        actor: input.source,
      });

      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        eventType: "payment_failed",
        source: input.source,
        gatewayStatus: normalized.status,
        metadata: { reason, details },
        correlationId: input.correlationId,
      });

      return {
        ok: true,
        alreadySettled: false,
        attemptStatus: "failed",
        orderStatus: "failed",
        orderPaymentStatus: "failed",
        orderNumber: attempt.orderNumber,
        requiresManualReview: false,
      };
    }

    // 3. Cancellation case
    if (decision === "cancelled") {
      await PaymentAttemptRepository.atomicTransition({
        attemptId: attempt._id,
        targetStatus: "cancelled",
        customerActivity: input.source.includes("callback") ? "returned_cancelled" : undefined,
        reconciliationStatus: "resolved",
        gatewayStatus: normalized.status,
        lastErrorCode: "CUSTOMER_CANCELLED",
        lastErrorMessage: "Customer cancelled payment at gateway.",
      });

      await OrderPaymentRepository.markOrderPaymentFailed({
        orderNumber: attempt.orderNumber,
        status: "cancelled",
        reason: "Customer cancelled at gateway",
        actor: input.source,
      });

      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber,
        tranId: attempt.tranId,
        eventType: "customer_cancelled",
        source: input.source,
        gatewayStatus: normalized.status,
        correlationId: input.correlationId,
      });

      return {
        ok: true,
        alreadySettled: false,
        attemptStatus: "cancelled",
        orderStatus: "cancelled",
        orderPaymentStatus: "failed",
        orderNumber: attempt.orderNumber,
        requiresManualReview: false,
      };
    }

    // 4. Mismatch or unclear state -> manual review or schedule reconciliation.
    const targetStatus = decision === "review_required" ? "review_required" : "unknown";
    await PaymentAttemptRepository.atomicTransition({
      attemptId: attempt._id,
      targetStatus,
      reconciliationStatus: decision === "review_required" ? "manual_review" : "scheduled",
      gatewayStatus: normalized.status,
      lastErrorCode: reason,
      lastErrorMessage: details || reason,
    });

    await PaymentEventRepository.recordEvent({
      attemptId: attempt._id,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
      tranId: attempt.tranId,
      eventType: decision === "review_required" ? "payment_review_required" : "validation_failed",
      source: input.source,
      gatewayStatus: normalized.status,
      metadata: { reason, details },
      correlationId: input.correlationId,
    });

    return {
      ok: false,
      alreadySettled: false,
      attemptStatus: targetStatus,
      orderStatus: "pending",
      orderPaymentStatus: "pending",
      orderNumber: attempt.orderNumber,
      requiresManualReview: decision === "review_required",
      error: details || reason,
    };
  }
}
