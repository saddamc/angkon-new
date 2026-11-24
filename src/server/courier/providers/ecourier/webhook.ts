import crypto from "crypto";

export function verifyEcourierWebhookSignature(args: {
  secret?: string | null;
  signature?: string | null;
  rawBody: string;
}): { valid: boolean; reason?: string } {
  const secret = (args.secret || process.env.ECOURIER_WEBHOOK_SECRET || "").trim();

  if (!secret) {
    return {
      valid: false,
      reason: "ECOURIER_WEBHOOK_SECRET is not configured on the server. Rejected fail-closed.",
    };
  }

  if (!args.signature || !args.signature.trim()) {
    return {
      valid: false,
      reason: "Missing eCourier webhook signature header.",
    };
  }

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
      reason: isValid ? undefined : "Invalid eCourier webhook HMAC signature.",
    };
  } catch (err) {
    return {
      valid: false,
      reason: `Webhook verification error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
