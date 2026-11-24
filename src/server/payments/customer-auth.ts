import type { NextRequest } from "next/server";
import { getSessionUserId, normalizeEmail } from "@/server/auth/auth";
import { Order, type IOrder } from "@/models/Order";
import { User } from "@/models/User";
import type { IPaymentAttempt } from "@/models/PaymentAttempt";
import { PaymentError } from "./payment-errors";

/**
 * Customer authorization for the payment APIs.
 *
 * Payment initiation and retry are money-moving operations, so they require a
 * signed-in customer who actually owns the order. The browser-only status page
 * additionally accepts a signed status token for guest checkouts.
 */

export async function requireCustomerId(request: NextRequest): Promise<string> {
  const userId = getSessionUserId(request);
  if (!userId) {
    throw new PaymentError(
      "Please sign in to manage this payment.",
      "AUTH_REQUIRED",
      401
    );
  }
  return userId;
}

export async function assertOrderOwnership(
  order: Pick<IOrder, "userId" | "customer">,
  userId: string
): Promise<void> {
  if (order.userId && String(order.userId) === String(userId)) {
    return;
  }

  // Legacy orders may not carry a userId but do carry the checkout email.
  const user = await User.findById(userId).select("email").lean();
  const userEmail = normalizeEmail(user?.email);
  const orderEmail = normalizeEmail(order.customer?.email);
  if (userEmail && orderEmail && userEmail === orderEmail) {
    return;
  }

  throw new PaymentError(
    "You do not have access to this order.",
    "ORDER_FORBIDDEN",
    403
  );
}

export async function assertAttemptOwnership(
  attempt: IPaymentAttempt,
  userId: string
): Promise<void> {
  if (attempt.userId && String(attempt.userId) === String(userId)) {
    return;
  }

  const order = await Order.findOne({ orderNumber: attempt.orderNumber });
  if (!order) {
    throw new PaymentError("Order not found for this payment.", "ORDER_NOT_FOUND", 404);
  }

  await assertOrderOwnership(order, userId);
}

/** True when the signed-in customer owns the order; used by read-only views. */
export async function customerOwnsOrder(
  order: Pick<IOrder, "userId" | "customer">,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;
  try {
    await assertOrderOwnership(order, userId);
    return true;
  } catch {
    return false;
  }
}
