import crypto from "node:crypto";

export interface ResendSvixHeaders {
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
}

export interface ResendWebhookPayload {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    bounce?: { message?: string; type?: string; subType?: string };
    failed?: { reason?: string };
    [key: string]: unknown;
  };
}

const DEFAULT_TOLERANCE_SECONDS = 300; // 5 minutes

function decodeSvixSecret(secret: string): Buffer {
  const clean = secret.trim();
  const base64Part = clean.startsWith("whsec_") ? clean.slice(6) : clean;
  return Buffer.from(base64Part, "base64");
}

/**
 * Verifies Resend (Svix) webhook signatures over the exact raw request body.
 * Prevents forged delivery/bounce events and timestamp replay attacks.
 */
export function verifyResendWebhookSignature(args: {
  rawBody: string;
  headers: ResendSvixHeaders;
  webhookSecret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): { ok: true; event: ResendWebhookPayload } | { ok: false; error: string } {
  const { rawBody, headers, webhookSecret } = args;
  const svixId = headers.svixId?.trim();
  const svixTimestamp = headers.svixTimestamp?.trim();
  const svixSignature = headers.svixSignature?.trim();

  if (!webhookSecret || !webhookSecret.trim()) {
    return { ok: false, error: "RESEND_WEBHOOK_SECRET is not configured" };
  }
  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, error: "Missing Svix signature headers" };
  }

  const tsSeconds = Number(svixTimestamp);
  if (!Number.isFinite(tsSeconds)) {
    return { ok: false, error: "Invalid svix-timestamp" };
  }

  const nowSec = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = args.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (Math.abs(nowSec - tsSeconds) > tolerance) {
    return { ok: false, error: "Webhook timestamp outside replay tolerance" };
  }

  let key: Buffer;
  try {
    key = decodeSvixSecret(webhookSecret);
  } catch {
    return { ok: false, error: "Invalid webhook secret format" };
  }

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expectedSig = crypto.createHmac("sha256", key).update(signedContent).digest("base64");
  const expectedBuf = Buffer.from(expectedSig, "utf8");

  const candidates = svixSignature
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  let matched = false;
  for (const candidate of candidates) {
    const [version, sigValue] = candidate.split(",", 2);
    if (version !== "v1" || !sigValue) continue;
    const candidateBuf = Buffer.from(sigValue, "utf8");
    if (candidateBuf.length === expectedBuf.length && crypto.timingSafeEqual(candidateBuf, expectedBuf)) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    return { ok: false, error: "Webhook signature mismatch" };
  }

  try {
    const parsed = JSON.parse(rawBody) as ResendWebhookPayload;
    if (!parsed || typeof parsed.type !== "string") {
      return { ok: false, error: "Invalid webhook JSON payload" };
    }
    return { ok: true, event: parsed };
  } catch {
    return { ok: false, error: "Malformed JSON webhook body" };
  }
}
