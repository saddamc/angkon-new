import type { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User, type IUser } from "@/models/User";
import { Order, type IOrder } from "@/models/Order";
import { Shipment } from "@/models/Shipment";
import { PaymentRefund } from "@/models/PaymentRefund";
import {
  evaluateCustomerCancellationEligibility,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPMENT_STATUS_LABELS,
} from "@/server/orders/workflow";
import {
  EMAIL_RESEND_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
  VERIFY_TOKEN_TTL_MS,
  generateOneTimeToken,
  getEmailSiteUrl,
  hashToken,
} from "@/server/auth";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email/account-emails";

/** Shape returned to the browser — never includes hashes or tokens. */
export function publicUser(user: IUser) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    hasPassword: Boolean(user.password),
    addresses: user.addresses || [],
  };
}

/** True when another verification email may be sent (simple anti-spam cooldown). */
export function canSendVerification(user: IUser): boolean {
  const last = user.lastVerificationSentAt ? new Date(user.lastVerificationSentAt).getTime() : 0;
  return Date.now() - last >= EMAIL_RESEND_COOLDOWN_MS;
}

/**
 * Create a fresh verification token, store its hash, and email the link.
 * Any previous verification link stops working.
 */
export async function issueVerificationEmail(
  user: IUser,
  _request: NextRequest,
  reason: "register" | "checkout" | "resend",
  orderNumber?: string,
) {
  const { raw, hash } = generateOneTimeToken();
  user.verifyTokenHash = hash;
  user.verifyTokenExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
  user.lastVerificationSentAt = new Date();
  await user.save();

  const verifyUrl = `${getEmailSiteUrl()}/api/auth/verify?token=${encodeURIComponent(raw)}`;
  return sendVerificationEmail({ to: user.email, name: user.name, verifyUrl, reason, orderNumber });
}

/** Create a password-reset token (1 hour, single use) and email the link. */
export async function issuePasswordResetEmail(user: IUser, _request: NextRequest) {
  const { raw, hash } = generateOneTimeToken();
  user.resetTokenHash = hash;
  user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  user.lastResetSentAt = new Date();
  await user.save();

  const resetUrl = `${getEmailSiteUrl()}/my-account/reset-password?token=${encodeURIComponent(raw)}`;
  return sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
}

/** Find the user owning a still-valid token. Does not consume it. */
export async function findUserByToken(kind: "verify" | "reset", rawToken: unknown) {
  if (typeof rawToken !== "string" || rawToken.length < 20) return null;
  await connectToDatabase();
  const hash = hashToken(rawToken);
  const now = new Date();
  return kind === "verify"
    ? User.findOne({ verifyTokenHash: hash, verifyTokenExpires: { $gt: now } })
    : User.findOne({ resetTokenHash: hash, resetTokenExpires: { $gt: now } });
}

/**
 * Orders an account may see.
 * - Always: orders linked to the account (placed while signed in or at checkout).
 * - Only after the email is verified: older guest orders placed with that email.
 * Phone numbers are never used for matching — they aren't verified.
 */
export async function getAccountOrders(user: IUser): Promise<IOrder[]> {
  await connectToDatabase();
  const conditions: Record<string, unknown>[] = [{ userId: user._id }];
  if (user.emailVerified && user.email) {
    const escaped = user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    conditions.push({ "customer.email": { $regex: `^${escaped}$`, $options: "i" } });
  }
  const orders = await Order.find({ $or: conditions }).sort({ createdAt: -1 }).limit(100).lean();
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o._id);
  const activeShipments = await Shipment.find({
    orderId: { $in: orderIds },
    status: { $nin: ["cancelled", "failed", "returned", "delivered", "partial_delivered"] },
  })
    .select("orderId status consignmentId trackingCode provider")
    .sort({ createdAt: -1 })
    .lean();

  const shipmentByOrderId = new Map<string, (typeof activeShipments)[number]>();
  for (const s of activeShipments) {
    const key = String(s.orderId);
    if (!shipmentByOrderId.has(key)) {
      shipmentByOrderId.set(key, s);
    }
  }

  const refundDocs = await PaymentRefund.find({ orderId: { $in: orderIds } })
    .select("refundId orderId amount currency status refundChannel refundMethod initiatedAt processedAt failedAt")
    .sort({ initiatedAt: -1 })
    .lean();

  const refundsByOrderId = new Map<string, Array<{
    refundId: string;
    amount: number;
    currency: string;
    status: string;
    refundChannel?: string;
    refundMethod?: string | null;
    initiatedAt?: string | null;
    processedAt?: string | null;
    failedAt?: string | null;
  }>>();

  for (const r of refundDocs) {
    const key = String(r.orderId);
    const list = refundsByOrderId.get(key) || [];
    list.push({
      refundId: r.refundId,
      amount: Number(r.amount) || 0,
      currency: r.currency || "BDT",
      status: String(r.status || "pending").toLowerCase(),
      refundChannel: r.refundChannel || "sslcommerz",
      refundMethod: r.refundMethod || null,
      initiatedAt: r.initiatedAt ? new Date(r.initiatedAt).toISOString() : null,
      processedAt: r.processedAt ? new Date(r.processedAt).toISOString() : null,
      failedAt: r.failedAt ? new Date(r.failedAt).toISOString() : null,
    });
    refundsByOrderId.set(key, list);
  }

  const formatLabel = (map: Record<string, string>, raw?: string | null, fallback = "Pending") => {
    const key = String(raw || "").trim().toLowerCase();
    if (!key) return fallback;
    if (map[key]) return map[key];
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return orders.map((o) => {
    const activeShipment = shipmentByOrderId.get(String(o._id)) || null;
    const cancellationEligibility = evaluateCustomerCancellationEligibility(o, activeShipment);
    const resolvedShipmentStatus = activeShipment?.status || o.shipmentStatus || "not_booked";
    const orderRefunds = refundsByOrderId.get(String(o._id)) || [];
    const totalRefunded = orderRefunds
      .filter((r) => r.status === "succeeded")
      .reduce((sum, r) => sum + r.amount, 0);
    const pendingRefundAmount = orderRefunds
      .filter((r) => ["initiated", "pending", "processing"].includes(r.status))
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      ...o,
      shipmentStatus: resolvedShipmentStatus,
      consignmentId: activeShipment?.consignmentId || o.consignmentId,
      trackingCode: activeShipment?.trackingCode || o.trackingCode,
      orderStatusLabel: formatLabel(ORDER_STATUS_LABELS, o.orderStatus, "Pending"),
      paymentStatusLabel: formatLabel(PAYMENT_STATUS_LABELS, o.paymentStatus, "Pending"),
      shipmentStatusLabel: formatLabel(SHIPMENT_STATUS_LABELS, resolvedShipmentStatus, "Not Booked"),
      cancellationEligibility,
      refunds: orderRefunds,
      refundSummary: {
        totalRefunded,
        pendingRefundAmount,
      },
    };
  }) as unknown as IOrder[];
}
