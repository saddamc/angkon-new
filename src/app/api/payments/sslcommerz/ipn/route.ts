import { NextRequest, NextResponse } from "next/server";
import { rateLimit, createRateLimitResponse } from "@/server/security/rate-limit";
import { ProcessIpnService } from "@/server/payments/services/process-ipn";
import { parseGatewayCallback } from "@/server/payments/parse-callback";
import { securityLog } from "@/server/security/security-log";

export async function POST(req: NextRequest) {
  const payload = await parseGatewayCallback(req);
  const tranId = String(payload.tran_id || payload.tranId || "").trim();

  if (!tranId || !/^[A-Za-z0-9_-]{4,60}$/.test(tranId)) {
    return NextResponse.json({ ok: false, error: "Missing or invalid tran_id" }, { status: 400 });
  }

  // Gateway-friendly ceilings: retries for one transaction are always allowed
  // within a generous window, and a global guard absorbs a retry storm without
  // ever singling out a customer.
  const perTransaction = await rateLimit(`sslcommerz:ipn:tran:${tranId}`, 60, 60);
  if (!perTransaction.allowed) {
    securityLog("webhook.rate_limited", { provider: "sslcommerz", scope: "tran" });
    return createRateLimitResponse(perTransaction, "Too many notifications for this transaction.");
  }

  const globalCeiling = await rateLimit("sslcommerz:ipn:global", 3000, 60);
  if (!globalCeiling.allowed) {
    securityLog("webhook.rate_limited", { provider: "sslcommerz", scope: "global" });
    return createRateLimitResponse(globalCeiling, "Gateway notification ceiling reached.");
  }

  try {
    const result = await ProcessIpnService.processWebhook(payload);

    if (!result.ok && result.error?.includes("Attempt not found")) {
      return NextResponse.json({ ok: false, error: "Transaction not found" }, { status: 404 });
    }

    if (result.ignored) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (result.alreadyProcessed) {
      securityLog("payment.duplicate_notification", {
        provider: "sslcommerz",
        source: "ipn",
      });
    }

    return NextResponse.json({
      ok: result.ok,
      duplicate: Boolean(result.alreadyProcessed),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "IPN processing error";
    securityLog("payment.ipn_processing_failed", {
      provider: "sslcommerz",
      tranId,
      error: message,
    });
    // SSLCOMMERZ retries on 500; the inbox row and reconciliation worker also
    // recover the notification independently.
    return NextResponse.json({ ok: false, error: "IPN processing failed" }, { status: 500 });
  }
}
