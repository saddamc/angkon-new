import type { IOrder } from "@/models/Order";
import { InitiatePaymentService } from "./services/initiate-payment";
import { PaymentError } from "./payment-errors";
import { isOnlinePaymentMethod, normalizePaymentMethod } from "@/lib/payment-methods";

/**
 * Backward-compatible adapter used by the order-creation route.
 *
 * The actual session creation, attempt bookkeeping and gateway calls live in
 * `InitiatePaymentService`. Keeping this thin wrapper avoids a second provider
 * implementation while preserving the existing internal call signature.
 */

export interface InitiateResult {
  ok: boolean;
  gatewayUrl: string | null;
  error?: string;
  paymentId?: string;
}

export async function initiateSslcommerzForOrder(
  order: IOrder,
  appBaseUrl: string
): Promise<InitiateResult> {
  const method = normalizePaymentMethod(order.paymentMethod);
  const isOnline = isOnlinePaymentMethod(method);
  if (!isOnline) {
    return { ok: true, gatewayUrl: null };
  }

  try {
    const result = await InitiatePaymentService.initiate({
      orderNumber: order.orderNumber,
      appBaseUrl,
      idempotencyKey: order.idempotencyKey || undefined,
      paymentChannel: method,
    });

    return {
      ok: result.ok,
      gatewayUrl: result.gatewayUrl ?? null,
      error: result.error,
      paymentId: result.attemptId,
    };
  } catch (err: unknown) {
    const message =
      err instanceof PaymentError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Payment gateway unavailable.";
    return { ok: false, gatewayUrl: null, error: message };
  }
}
