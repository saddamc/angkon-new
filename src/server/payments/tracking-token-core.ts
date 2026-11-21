import crypto from "crypto";

/** Pure post-payment tracking token (secret injected, no app imports). */

export const TRACKING_TOKEN_TTL_MS = 15 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createTrackingToken(
  orderNumber: string,
  total: number,
  secret: string,
  now = Date.now()
): string {
  const payload = `${orderNumber}:${total}:${now}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload, secret)}`;
}

export function verifyTrackingToken(
  token: string,
  expectedOrderNumber: string,
  secret: string,
  now = Date.now(),
  ttlMs = TRACKING_TOKEN_TTL_MS
): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payloadB64, sig] = parts;
    const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    const [orderNumber, , timestampStr] = payload.split(":");
    if (orderNumber !== expectedOrderNumber) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || now - timestamp > ttlMs) return false;

    const expectedSig = sign(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}
