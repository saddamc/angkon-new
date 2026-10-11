import type { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User, type IUser } from "@/models/User";
import { Order, type IOrder } from "@/models/Order";
import {
  EMAIL_RESEND_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
  VERIFY_TOKEN_TTL_MS,
  generateOneTimeToken,
  getSiteUrl,
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
  request: NextRequest,
  reason: "register" | "checkout" | "resend",
  orderNumber?: string,
) {
  const { raw, hash } = generateOneTimeToken();
  user.verifyTokenHash = hash;
  user.verifyTokenExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
  user.lastVerificationSentAt = new Date();
  await user.save();

  const verifyUrl = `${getSiteUrl(request)}/api/auth/verify?token=${encodeURIComponent(raw)}`;
  return sendVerificationEmail({ to: user.email, name: user.name, verifyUrl, reason, orderNumber });
}

/** Create a password-reset token (1 hour, single use) and email the link. */
export async function issuePasswordResetEmail(user: IUser, request: NextRequest) {
  const { raw, hash } = generateOneTimeToken();
  user.resetTokenHash = hash;
  user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  user.lastResetSentAt = new Date();
  await user.save();

  const resetUrl = `${getSiteUrl(request)}/my-account/reset-password?token=${encodeURIComponent(raw)}`;
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
  return orders as unknown as IOrder[];
}
