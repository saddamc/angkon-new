import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runMetaQueueDrainPass } from "@/server/jobs/meta-queue-worker";
import { verifyAdminToken } from "@/server/auth/admin-auth";
import { getCronSecret } from "@/lib/env";
import { DEFAULT_TENANT_ID } from "@/server/auth/tenant";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * GET/POST /api/cron/meta-queue
 *
 * Dedicated cron trigger for draining the Meta Conversions API queue.
 * Allows multi-replica deployments (Coolify, Kubernetes, ECS) to disable
 * in-process timers via DISABLE_IN_PROCESS_WORKERS=true and run the worker
 * through a single centralized cron job.
 */
async function handleQueueDrainCron(request: NextRequest) {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured on the server." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const querySecret = request.nextUrl.searchParams.get("secret") || "";

  let authorized = false;
  let tenantId = DEFAULT_TENANT_ID;

  if (safeEqual(authHeader, `Bearer ${cronSecret}`) || safeEqual(querySecret, cronSecret)) {
    authorized = true;
  } else {
    const token = request.cookies.get("nb_admin_token")?.value;
    if (token) {
      const verified = await verifyAdminToken(token);
      if (verified.valid && (verified.role === "admin" || verified.role === "superadmin")) {
        authorized = true;
        tenantId = verified.defaultTenant || DEFAULT_TENANT_ID;
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runMetaQueueDrainPass(tenantId);
    return NextResponse.json({
      ok: true,
      message: "Meta CAPI queue drain pass executed successfully.",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Meta queue cron drain error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Queue drain failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleQueueDrainCron(request);
}

export async function POST(request: NextRequest) {
  return handleQueueDrainCron(request);
}
