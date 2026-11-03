import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { executeMetaSync, MetaSyncType } from "@/server/meta-sync";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return (
        auth.response ||
        NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
      );
    }

    let syncType: MetaSyncType = "all";
    try {
      const body = await request.json();
      if (body?.syncType) {
        syncType = body.syncType;
      }
    } catch {
      // no body, default to all
    }

    const result = await executeMetaSync(auth.tenantId, syncType, { forceFresh: true });

    return NextResponse.json(
      {
        ok: result.ok,
        syncType: result.syncType,
        status: result.status,
        lastSyncedAt: result.lastSyncedAt,
        nextSyncAt: result.nextSyncAt,
        durationMs: result.durationMs,
        data: result.data,
        error: result.error,
        errorCode: result.errorCode,
        reason: result.reason,
      },
      {
        status: result.ok ? 200 : result.status === "synchronizing" ? 409 : 502,
      }
    );
  } catch (error) {
    console.error("[Meta Sync Trigger] POST error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to trigger synchronization" },
      { status: 500 }
    );
  }
}
