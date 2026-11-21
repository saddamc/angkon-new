import crypto from "crypto";
import { getJwtSecret } from "@/lib/env";

/**
 * Signed customer status token.
 *
 * A payment status page is reachable from the browser redirect, which happens
 * without a session cookie for guest checkouts. The token proves that the
 * browser was handed this attempt's status URL by ANGKON; it is not payment
 * proof (the SSLCOMMERZ val_id validator is) and it never authorizes money
 * movement.
 */

export const PAYMENT_STATUS_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createPaymentStatusToken(attemptId: string, now = Date.now()): string {
  const cleanId = String(attemptId || "").trim();
  if (!cleanId) return "";
  const payload = `${cleanId}:${now}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload, getJwtSecret())}`;
}

export function verifyPaymentStatusToken(
  token: string | null | undefined,
  attemptId: string,
  now = Date.now()
): boolean {
  try {
    if (!token) return false;
    const cleanId = String(attemptId || "").trim();
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const payload = Buffer.from(parts[0], "base64url").toString("utf8");
    const [tokenAttemptId, timestampRaw] = payload.split(":");
    if (tokenAttemptId !== cleanId) return false;

    const timestamp = Number(timestampRaw);
    if (
      !Number.isFinite(timestamp) ||
      now - timestamp > PAYMENT_STATUS_TOKEN_TTL_MS ||
      timestamp > now + 60_000
    ) {
      return false;
    }

    const expected = sign(payload, getJwtSecret());
    const provided = parts[1];
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function statusTokenForAttempt(attemptId: string): string {
  return createPaymentStatusToken(attemptId);
}
