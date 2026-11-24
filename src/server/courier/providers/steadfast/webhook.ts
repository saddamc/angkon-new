import crypto from "crypto";

export interface SteadfastWebhookAuthOptions {
  signature?: string | null;
  authHeader?: string | null;
  tokenParam?: string | null;
  rawBody: string;
  secret?: string | null;
}

export function safeTimingEqual(a: string, b: string): boolean {
  return (
    typeof a === "string" &&
    typeof b === "string" &&
    a.length > 0 &&
    a.length === b.length &&
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}

/**
 * Validates Steadfast delivery webhook credentials:
 * 1. HMAC-SHA256 `x-steadfast-signature` against raw payload
 * 2. `Authorization: Bearer <token>`
 * 3. `?token=` query parameter
 */
export function verifySteadfastWebhookCredentials(
  options: SteadfastWebhookAuthOptions
): { valid: boolean; reason?: string } {
  const secret = (
    options.secret ||
    process.env.STEADFAST_WEBHOOK_TOKEN ||
    process.env.STEADFAST_WEBHOOK_SECRET ||
    ""
  ).trim();

  if (!secret) {
    return { valid: false, reason: "Steadfast webhook secret is not configured." };
  }

  const signature = (options.signature || "").trim();
  const authHeader = (options.authHeader || "").trim();
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const token = (options.tokenParam || "").trim();

  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(options.rawBody)
    .digest("hex");

  const signatureValid = safeTimingEqual(signature, expectedHmac);
  const bearerValid = safeTimingEqual(bearerToken, secret);
  const tokenValid = safeTimingEqual(token, secret);

  if (signatureValid || bearerValid || tokenValid) {
    return { valid: true };
  }

  return { valid: false, reason: "Invalid webhook credentials." };
}
