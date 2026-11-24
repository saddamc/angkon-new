import crypto from "crypto";

export interface RedxWebhookPayload {
  tracking_id?: string;
  trackingId?: string;
  status?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export interface RedxWebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * RedX Webhook signature verification interface placeholder.
 *
 * Fail-closed design:
 * Until official RedX webhook documentation and secret keys are supplied,
 * this rejects incoming webhook deliveries to protect against unauthenticated forged updates.
 */
export function verifyRedxWebhookSignature(args: {
  secret?: string | null;
  signature?: string | null;
  rawBody: string;
}): RedxWebhookVerificationResult {
  const secret = (args.secret || process.env.REDX_WEBHOOK_SECRET || "").trim();

  if (!secret) {
    return {
      valid: false,
      reason: "REDX_WEBHOOK_SECRET is not configured on the server. Webhook verification rejected fail-closed.",
    };
  }

  if (!args.signature || !args.signature.trim()) {
    return {
      valid: false,
      reason: "Missing RedX webhook signature header.",
    };
  }

  // Placeholder HMAC SHA-256 verification when documentation specifies HMAC header
  try {
    const computed = crypto.createHmac("sha256", secret).update(args.rawBody).digest("hex");
    const sigBuffer = Buffer.from(args.signature.trim().toLowerCase(), "utf8");
    const compBuffer = Buffer.from(computed.toLowerCase(), "utf8");

    if (sigBuffer.length !== compBuffer.length) {
      return { valid: false, reason: "Signature length mismatch." };
    }

    const isValid = crypto.timingSafeEqual(sigBuffer, compBuffer);
    return {
      valid: isValid,
      reason: isValid ? undefined : "Invalid RedX webhook HMAC signature.",
    };
  } catch (err) {
    return {
      valid: false,
      reason: `Webhook signature verification error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
