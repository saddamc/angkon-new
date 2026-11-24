import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import type { InitiatePaymentInput, InitiatePaymentResult } from "../types";
import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { PaymentEventRepository } from "../repositories/payment-event.repository";
import { generateTranId } from "../utils/generate-tran-id";
import { createSslcommerzSession } from "../providers/sslcommerz/create-session";
import { maskSessionKey } from "../payment-idempotency";
import { getSslcommerzConfig } from "../providers/sslcommerz/config";
import { isSslcommerzLiveReady } from "@/server/payments/config/sslcommerz";
import { getAppEnvironment } from "@/server/env/app-environment";
import { GatewayTimeoutError, PaymentError } from "../payment-errors";
import { createPaymentReturnToken } from "../return-token";
import { normalizePaymentStatus, isSuccessfulStatus } from "../payment-state-machine";

export class InitiatePaymentService {
  public static async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const orderNumber = input.orderNumber.trim();
    const order = await Order.findOne({ orderNumber });

    if (!order) {
      throw new PaymentError(`Order "${orderNumber}" not found.`, "ORDER_NOT_FOUND", 404);
    }

    if (order.paymentStatus === "paid") {
      throw new PaymentError("This order has already been paid.", "ALREADY_PAID", 400);
    }

    if (order.orderStatus === "cancelled" || order.orderStatus === "refunded") {
      throw new PaymentError(
        `Cannot initiate payment for an order in ${order.orderStatus} state.`,
        "INVALID_ORDER_STATE",
        400
      );
    }

    // Check inventory availability from Product collection before starting session
    const productIds = order.items.map((i) => i.productId);
    const dbProducts = await Product.find({ id: { $in: productIds } })
      .select("id name manage_stock stock_quantity")
      .lean();

    for (const item of order.items) {
      const prod = dbProducts.find((p) => p.id === item.productId);
      if (prod && prod.manage_stock && typeof prod.stock_quantity === "number") {
        if (prod.stock_quantity < item.quantity && !order.stockReservedAt) {
          throw new PaymentError(
            `Item "${item.name}" does not have enough stock.`,
            "OUT_OF_STOCK",
            409
          );
        }
      }
    }

    // Determine attempt count
    const priorAttemptsCount = await PaymentAttemptRepository.countAttemptsForOrder(orderNumber);
    const attemptNumber = priorAttemptsCount + 1;
    const tranId = generateTranId(orderNumber, attemptNumber);

    // Reuse an unresolved session instead of silently opening a second one.
    // A caller that explicitly wants a fresh attempt uses RetryPaymentService.
    const latestAttempt = await PaymentAttemptRepository.findLatestByOrderNumber(orderNumber);

    if (latestAttempt && isSuccessfulStatus(latestAttempt.status)) {
      throw new PaymentError(
        "This order already has a confirmed payment.",
        "ALREADY_PAID",
        409
      );
    }

    if (latestAttempt && normalizePaymentStatus(latestAttempt.status) === "review_required") {
      throw new PaymentError(
        "This payment is under manual review. Please contact support before paying again.",
        "PAYMENT_UNDER_REVIEW",
        409
      );
    }

    if (
      latestAttempt &&
      latestAttempt.gatewayPageUrl &&
      ["initiating", "pending", "unknown"].includes(normalizePaymentStatus(latestAttempt.status))
    ) {
      return {
        ok: true,
        status: latestAttempt.status,
        orderNumber: order.orderNumber,
        tranId: latestAttempt.tranId,
        attemptId: String(latestAttempt._id),
        attemptNumber: latestAttempt.attemptNumber,
        total: latestAttempt.expectedAmount ?? latestAttempt.amount ?? order.total,
        currency: latestAttempt.currency || "BDT",
        gatewayUrl: latestAttempt.gatewayPageUrl,
        sessionKey: null,
        retryAllowed: false,
      };
    }

    const config = getSslcommerzConfig();

    const appEnv = getAppEnvironment();
    if (appEnv === "production") {
      if (!isSslcommerzLiveReady() || config.isSandbox) {
        throw new PaymentError(
          "SSLCOMMERZ Sandbox payment is disabled in Production environment.",
          "SANDBOX_NOT_ALLOWED_IN_PRODUCTION",
          403
        );
      }
    }

    // Idempotency key: replay the same result instead of creating a second attempt.
    const existingByKey = input.idempotencyKey
      ? await PaymentAttemptRepository.findByIdempotencyKey(input.idempotencyKey)
      : null;

    if (existingByKey && existingByKey.gatewayPageUrl) {
      return {
        ok: true,
        status: existingByKey.status,
        orderNumber: existingByKey.orderNumber,
        tranId: existingByKey.tranId,
        attemptId: String(existingByKey._id),
        attemptNumber: existingByKey.attemptNumber,
        total: existingByKey.expectedAmount ?? existingByKey.amount ?? order.total,
        currency: existingByKey.currency || "BDT",
        gatewayUrl: existingByKey.gatewayPageUrl,
        sessionKey: null,
        retryAllowed: false,
      };
    }

    // 1. Create PaymentAttempt record in "initiating" state
    const attempt = await PaymentAttemptRepository.createAttempt({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId || null,
      attemptNumber,
      tranId,
      expectedAmount: order.total,
      currency: "BDT",
      idempotencyKey: existingByKey ? undefined : input.idempotencyKey || undefined,
      environment: config.isSandbox ? "sandbox" : "live",
    });

    await PaymentEventRepository.recordEvent({
      attemptId: attempt._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      tranId,
      eventType: "payment_initiation_started",
      source: "customer_browser",
      metadata: { attemptNumber, amount: order.total },
    });

    // 2. Build SSLCOMMERZ gateway URLs
    const baseUrl = input.appBaseUrl.replace(/\/$/, "");
    const attemptQuery = `attemptId=${encodeURIComponent(String(attempt._id))}&tranId=${encodeURIComponent(tranId)}&token=${encodeURIComponent(
      createPaymentReturnToken(tranId)
    )}`;

    // Determine direct gateway channel routing
    const channel = (input.paymentChannel || (order.paymentMethod as string) || "").toLowerCase().trim();
    let multiCardName: string | undefined = undefined;
    if (channel === "bkash") {
      multiCardName = "bkash";
    } else if (channel === "nagad") {
      multiCardName = "nagad";
    } else if (channel === "cards" || channel === "card") {
      multiCardName = "visacard,mastercard,amexcard,othercard";
    } else if (channel === "internetbanking" || channel === "netbanking") {
      multiCardName = "citytouch,ibbl,dbblnexus,bankasia,abtbl";
    }

    const sessionInput = {
      tranId,
      totalAmount: order.total,
      customer: {
        fullName: order.customer.fullName,
        email: order.customer.email || "customer@angkon.com",
        phone: order.customer.phone,
        address: order.customer.address,
        city: order.customer.city || "Dhaka",
        district: order.customer.district || "Dhaka",
        postalCode: order.customer.postalCode || "1200",
      },
      successUrl: `${baseUrl}/api/payments/sslcommerz/success?${attemptQuery}`,
      failUrl: `${baseUrl}/api/payments/sslcommerz/fail?${attemptQuery}`,
      cancelUrl: `${baseUrl}/api/payments/sslcommerz/cancel?${attemptQuery}`,
      ipnUrl: `${baseUrl}/api/payments/sslcommerz/ipn`,
      multiCardName,
    };

    try {
      const gatewayResponse = await createSslcommerzSession(sessionInput);

      if (gatewayResponse.status === "SUCCESS" && gatewayResponse.GatewayPageURL) {
        // Success: update attempt to pending with session info
        attempt.status = "pending";
        attempt.customerActivity = "redirected";
        attempt.gatewayPageUrl = gatewayResponse.GatewayPageURL;
        attempt.sessionKey = maskSessionKey(gatewayResponse.sessionkey);
        attempt.gatewaySessionCreatedAt = new Date();
        attempt.nextCheckAt = new Date(Date.now() + 5 * 60 * 1000); // Check in 5 mins if no return
        attempt.reconciliationStatus = "scheduled";
        await attempt.save();

        await PaymentEventRepository.recordEvent({
          attemptId: attempt._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          tranId,
          eventType: "gateway_session_created",
          source: "sslcommerz_gateway",
          metadata: { sessionCreated: true },
        });

        return {
          ok: true,
          status: "pending",
          orderNumber: order.orderNumber,
          tranId,
          attemptId: String(attempt._id),
          attemptNumber,
          total: order.total,
          currency: "BDT",
          gatewayUrl: gatewayResponse.GatewayPageURL,
          sessionKey: null,
          retryAllowed: false,
        };
      }

      // Gateway returned explicit rejection
      const rejectionReason = gatewayResponse.failedreason || "Payment gateway rejected initiation.";
      attempt.status = "failed";
      attempt.lastErrorCode = "GATEWAY_INIT_REJECTED";
      attempt.lastErrorMessage = rejectionReason;
      attempt.reconciliationStatus = "resolved";
      await attempt.save();

      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        tranId,
        eventType: "gateway_session_failed",
        source: "sslcommerz_gateway",
        metadata: { rejectionReason },
      });

      return {
        ok: false,
        status: "failed",
        orderNumber: order.orderNumber,
        tranId,
        attemptId: String(attempt._id),
        attemptNumber,
        total: order.total,
        currency: "BDT",
        error: rejectionReason,
        errorCode: "GATEWAY_INIT_REJECTED",
        retryAllowed: true,
      };
    } catch (err: unknown) {
      // Handle Ambiguous Network Timeout:
      // The gateway might have created the session, but our request timed out.
      // We must mark as "unknown" and schedule reconciliation rather than blind failure!
      const isTimeout = err instanceof GatewayTimeoutError;
      const errorMessage = err instanceof Error ? err.message : String(err);

      attempt.status = "unknown";
      attempt.reconciliationStatus = "scheduled";
      attempt.nextCheckAt = new Date(Date.now() + 2 * 60 * 1000); // Check in 2 minutes
      attempt.lastErrorCode = isTimeout ? "GATEWAY_TIMEOUT" : "GATEWAY_NETWORK_ERROR";
      attempt.lastErrorMessage = errorMessage;
      await attempt.save();

      await PaymentEventRepository.recordEvent({
        attemptId: attempt._id,
        orderId: order._id,
        orderNumber: order.orderNumber,
        tranId,
        eventType: "gateway_session_failed",
        source: "system",
        metadata: { error: errorMessage, isTimeout },
      });

      return {
        ok: false,
        status: "unknown",
        orderNumber: order.orderNumber,
        tranId,
        attemptId: String(attempt._id),
        attemptNumber,
        total: order.total,
        currency: "BDT",
        error: isTimeout
          ? "Payment gateway communication timed out. Verifying transaction state..."
          : "Temporary network interruption while reaching payment gateway.",
        errorCode: attempt.lastErrorCode,
        retryAllowed: false,
        requiresReconciliation: true,
      };
    }
  }
}
