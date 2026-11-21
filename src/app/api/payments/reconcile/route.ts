import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { getCronSecret } from "@/lib/env";
import { securityLog } from "@/server/security-log";
import { runAllPaymentJobs } from "@/server/payments/run-reconciliation";
import { inspectReconciliationQueue } from "@/server/payments/reconcile-inspection";

function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Canonical reconciliation trigger.
 *
 * Authorised by either:
 *  - a superadmin session (dashboard "Reconcile now"), or
 *  - `Authorization: Bearer <CRON_SECRET>` / `?key=<CRON_SECRET>` (cron).
 *
 * Fails closed: with no CRON_SECRET configured and no admin session, the route
 * is not anonymously callable.
 */
async function executeReconcile(req: NextRequest) {
  const cronSecret = getCronSecret();
  const authHeader = req.headers.get("authorization") || "";
  const passedKey = req.nextUrl.searchParams.get("key") || "";

  const cronAuthorized = Boolean(
    cronSecret &&
      (safeEqual(authHeader, `Bearer ${cronSecret}`) || safeEqual(passedKey, cronSecret))
  );

  let actor = "cron";
  if (!cronAuthorized) {
    const auth = await requireAdminSessionCore(req);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "superadmin" && auth.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    actor = `admin:${auth.user || "unknown"}`;
  }

  try {
    // Read-only inspection: no gateway calls, no writes.
    if (req.nextUrl.searchParams.get("dryRun") === "1") {
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
    securityLog("payment.reconciliation_failed", {
      actor,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "Reconciliation failed." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return executeReconcile(req);
}

export async function POST(req: NextRequest) {
  return executeReconcile(req);
}
