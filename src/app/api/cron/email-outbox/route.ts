import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { drainEmailDeliveryOutbox } from "@/server/email/email-outbox.service";
import { verifyAdminToken } from "@/server/auth/admin-auth";
import { getCronSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function handleEmailOutboxCron(request: NextRequest) {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured on the server." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const querySecret = request.nextUrl.searchParams.get("secret") || "";

  let authorized =
    safeEqual(authHeader, `Bearer ${cronSecret}`) || safeEqual(querySecret, cronSecret);

  if (!authorized) {
    const token = request.cookies.get("nb_admin_token")?.value;
    if (token) {
      const verified = await verifyAdminToken(token);
      if (verified.valid && (verified.role === "admin" || verified.role === "superadmin")) {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const stats = await drainEmailDeliveryOutbox(30);
  return NextResponse.json({
    ok: true,
    stats,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return handleEmailOutboxCron(request);
}

export async function POST(request: NextRequest) {
  return handleEmailOutboxCron(request);
}
