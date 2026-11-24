import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { executeMetaSync } from "@/server/jobs/meta-sync";
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
 * GET/POST /api/cron/meta-sync
 *
 * Protected cron trigger for recurring background synchronization.
 * Authorised either by Authorization: Bearer <CRON_SECRET> header, ?secret=<CRON_SECRET> query param,
 * or an active superadmin session cookie.
 */
async function handleCronSync(request: NextRequest) {
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
    // Check if called from an admin browser session
    const token = request.cookies.get("nb_admin_token")?.value;
    if (token) {
      const verified = await verifyAdminToken(token);
      if (verified.valid && verified.role === "superadmin") {
        authorized = true;
        tenantId = verified.defaultTenant || DEFAULT_TENANT_ID;
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron execution" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const syncType = (searchParams.get("type") as "all" | "events_reporting" | "integrations" | "assets" | "emq_quality") || "all";

  const result = await executeMetaSync(tenantId, syncType, { forceFresh: false });

  return NextResponse.json({
    ok: result.ok,
    syncType: result.syncType,
    status: result.status,
    lastSyncedAt: result.lastSyncedAt,
    nextSyncAt: result.nextSyncAt,
    durationMs: result.durationMs,
    error: result.error,
  });
}

export async function GET(request: NextRequest) {
  return handleCronSync(request);
}

export async function POST(request: NextRequest) {
  return handleCronSync(request);
}
