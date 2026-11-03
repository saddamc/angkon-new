import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { getMetaSyncSnapshot } from "@/server/meta-sync";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return (
        auth.response ||
        NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
      );
    }

    const { searchParams } = new URL(request.url);
    const syncType = (searchParams.get("type") as "all" | "events_reporting" | "integrations" | "assets" | "emq_quality") || "all";

    const snapshot = await getMetaSyncSnapshot(auth.tenantId, syncType);

    return NextResponse.json(
      {
        ok: true,
        tenantId: auth.tenantId,
        syncType,
        ...snapshot,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("[Meta Sync Status] GET error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load synchronization snapshot" },
      { status: 500 }
    );
  }
}
