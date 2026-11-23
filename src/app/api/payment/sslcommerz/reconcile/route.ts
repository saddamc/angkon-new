import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { getCronSecret } from "@/lib/env";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/rate-limit";
import { securityLog } from "@/server/security-log";
import { runAllPaymentJobs } from "@/server/payments/run-reconciliation";
import { inspectReconciliationQueue } from "@/server/payments/reconcile-inspection";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * @deprecated Legacy order-specific reconciliation trigger.
 * Canonical endpoint: /api/payments/reconcile
 *
 * Legacy reconciliation trigger, kept for the order dashboard and the existing
 * Vercel cron entry. It delegates to the same job suite as
 * `/api/payments/reconcile` so there is only one reconciliation implementation.
 *
 * Authorised by a superadmin session or the cron secret. Fails closed.
 */
async function handle(request: NextRequest) {
  const limit = await rateLimit(
    `sslcommerz:reconcile:${hashIp(clientIp(request))}`,
    20,
    60
  );
  if (!limit.allowed) {
    return createRateLimitResponse(limit, "Too many reconciliation requests.");
  }

  const cronSecret = getCronSecret();
  const authHeader = request.headers.get("authorization") || "";
  const querySecret = request.nextUrl.searchParams.get("secret") || "";

  const cronAuthorized = Boolean(
    cronSecret &&
      (safeEqual(authHeader, `Bearer ${cronSecret}`) ||
        safeEqual(querySecret, cronSecret))
  );

  let actor = "cron";
  if (!cronAuthorized) {
    const auth = await requireAdminSessionCore(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "superadmin" && auth.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Administrator privileges required." },
        { status: 403 }
      );
    }
    actor = `admin:${auth.user || "unknown"}`;
  }

  try {
    if (request.nextUrl.searchParams.get("dryRun") === "1") {
      const inspection = await inspectReconciliationQueue();
      return NextResponse.json(
        { ok: true, dryRun: true, ...inspection },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const stats = await runAllPaymentJobs();
    securityLog("payment.reconciliation_run", { actor, stats: JSON.stringify(stats) });
    return NextResponse.json(
      { ok: true, stats, executedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[SSLCOMMERZ] Reconcile error:", error);
    return NextResponse.json(
      { ok: false, error: "Payment reconciliation failed." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
