import { NextRequest, NextResponse } from "next/server";
import { rateLimit, createRateLimitResponse } from "@/server/rate-limit";
import { securityLog } from "@/server/security-log";
import { ProcessIpnService } from "@/server/payments/services/process-ipn";

export const dynamic = "force-dynamic";

/**
 * SSLCOMMERZ IPN (legacy path).
 *
 * Durable inbox persistence, deduplication and validator-confirmed settlement
 * live in ProcessIpnService. This route only parses the payload and enforces
 * gateway-friendly rate ceilings: a retry storm must never be mistaken for a
 * customer abusing the checkout.
 */
export async function POST(request: NextRequest) {
  try {
    let payload: Record<string, unknown> = {};

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await request.json().catch(() => ({}));
    } else {
      const formData = await request.formData().catch(() => new FormData());
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });
    }

    const tranId = String(payload.tran_id || payload.tranId || "").trim();
    const status = String(payload.status || "").trim().toUpperCase();

    if (!tranId || !/^[A-Za-z0-9_-]{4,60}$/.test(tranId)) {
      return NextResponse.json({ error: "Missing or invalid tran_id" }, { status: 400 });
    }

    const perTransaction = await rateLimit(`sslcommerz:ipn:tran:${tranId}`, 60, 60);
    if (!perTransaction.allowed) {
      securityLog("webhook.rate_limited", { provider: "sslcommerz", scope: "tran" });
      return createRateLimitResponse(
        perTransaction,
        "Too many notifications for this transaction; retry later."
      );
    }

    const globalCeiling = await rateLimit("sslcommerz:ipn:global", 3000, 60);
    if (!globalCeiling.allowed) {
      securityLog("webhook.rate_limited", { provider: "sslcommerz", scope: "global" });
      return createRateLimitResponse(
        globalCeiling,
        "Gateway notification ceiling reached; retry later."
      );
    }

    const result = await ProcessIpnService.processWebhook({
      ...payload,
      tran_id: tranId,
      status,
    });

    if (!result.ok && result.error?.includes("Attempt not found")) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (result.ignored) {
      securityLog("payment.verification_rejected", {
        provider: "sslcommerz",
        source: "ipn",
        reason: "unverified-or-unsupported-status",
      });
      return NextResponse.json({ success: true, ignored: true });
    }

    if (result.alreadyProcessed) {
      securityLog("payment.duplicate_notification", {
        provider: "sslcommerz",
        source: "ipn",
      });
    }

    return NextResponse.json({
      success: result.ok,
      duplicate: Boolean(result.alreadyProcessed),
    });
  } catch (error) {
    console.error("[SSLCOMMERZ] IPN error:", error);
    // A 500 makes SSLCOMMERZ retry; the durable inbox and reconciliation
    // worker provide additional recovery if the retry never arrives.
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
