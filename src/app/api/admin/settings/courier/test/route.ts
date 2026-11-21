import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireSuperAdminSessionCore } from "@/server/admin-auth";
import { courierService } from "@/server/courier";
import { clientIp } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const provider = typeof body.provider === "string" ? body.provider : "steadfast";

    await connectToDatabase();
    const result = await courierService.testConnection({
      provider,
      actor: auth.user || "admin",
      forceLive: body.forceLive === true,
    });

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "admin",
        action: "settings.courier.connection_test",
        targetType: "settings",
        targetId: provider,
        before: null,
        after: {
          ok: result.ok,
          latencyMs: result.latencyMs,
          balance: result.balance ?? null,
        },
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json(result, {
      status: result.ok ? 200 : result.configured ? 502 : 503,
    });
  } catch (error) {
    console.error("POST /api/admin/settings/courier/test error:", error);
    return NextResponse.json(
      { ok: false, error: "Could not execute courier connection test." },
      { status: 500 }
    );
  }
}
