import crypto from "crypto";

/**
 * Pure signed-return-token helpers (secret injected, no app imports).
 * Kept separate so the app wrapper can use the environment secret while tests
 * can exercise sign/verify without loading Next.js aliases.
 */

export const RETURN_TOKEN_TTL_MS = 30 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createReturnToken(
  orderNumber: string,
  secret: string,
  now = Date.now()
): string {
  const payload = `${orderNumber}:${now}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload, secret)}`;
}

export function verifyReturnToken(
  token: string | null | undefined,
  expectedOrderNumber: string,
  secret: string,
  now = Date.now(),
  ttlMs = RETURN_TOKEN_TTL_MS
): boolean {
  try {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payloadB64, signature] = parts;
    const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    const [orderNumber, timestampRaw] = payload.split(":");
    if (orderNumber !== expectedOrderNumber) return false;

    const timestamp = Number(timestampRaw);
    if (!Number.isFinite(timestamp) || now - timestamp > ttlMs || timestamp > now + 60_000) {
      return false;
    }

    const expected = sign(payload, secret);
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
