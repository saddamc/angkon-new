import crypto from "crypto";

export function generateEventFingerprint(args: {
  provider: string;
  tranId: string;
  valId?: string | null;
  status: string;
  amount?: number | string;
}): string {
  const normProvider = (args.provider || "sslcommerz").trim().toLowerCase();
  const normTranId = (args.tranId || "").trim();
  const normValId = (args.valId || "").trim();
  const normStatus = (args.status || "").trim().toUpperCase();
  const normAmount = String(args.amount || "").trim();

  const raw = `${normProvider}:${normTranId}:${normValId}:${normStatus}:${normAmount}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function maskSessionKey(sessionKey?: string | null): string | null {
  if (!sessionKey || typeof sessionKey !== "string") return null;
  const trimmed = sessionKey.trim();
  if (trimmed.length <= 8) return "********";
  return crypto.createHash("sha256").update(trimmed).digest("hex");
}
