import { NextRequest, NextResponse } from "next/server";
import { drainMetaCapiQueue } from "@/server/meta-capi";
import { requireAdminSession } from "@/server/admin-auth";
import { DEFAULT_TENANT_ID } from "@/server/tenant";

export const dynamic = "force-dynamic";

/**
 * Scheduled / Administrative endpoint for processing queued & retrying CAPI events.
 * Accepts:
 * - Admin session (via requireAdminSession)
 * - Cron runner Authorization header matching process.env.CRON_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET?.trim();
    const isCronAuthorized =
      cronSecret && authHeader && authHeader.trim() === `Bearer ${cronSecret}`;

    let tenantId = DEFAULT_TENANT_ID;

    if (!isCronAuthorized) {
      const auth = await requireAdminSession(request);
      if (!auth.authorized) {
        return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      tenantId = auth.tenantId;
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "15", 10), 1), 50);

    const result = await drainMetaCapiQueue(tenantId, limit);

    return NextResponse.json({
      success: true,
      tenantId,
      ...result,
    });
  } catch (error) {
    console.error("POST /api/admin/meta/capi/drain error:", error);
    return NextResponse.json({ error: "Failed to process queue" }, { status: 500 });
  }
}
