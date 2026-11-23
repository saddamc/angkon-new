import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireSuperAdminSessionCore } from "@/server/admin-auth";
import { courierService } from "@/server/courier";
import {
  COURIER_SETTINGS_KEY,
  getCourierSettings,
  invalidateCourierSettingsCache,
  normalizeCourierSettings,
} from "@/server/courier/settings";
import { clientIp } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const [settings, diagnostics] = await Promise.all([
      getCourierSettings(),
      courierService.getDiagnostics(),
    ]);

    return NextResponse.json(
      {
        settings,
        providers: courierService.getProviderStatuses(settings),
        webhooks: {
          // The webhook route accepts STEADFAST_WEBHOOK_TOKEN or
          // STEADFAST_WEBHOOK_SECRET — the indicator must match both.
          steadfast: Boolean(
            (
              process.env.STEADFAST_WEBHOOK_TOKEN || process.env.STEADFAST_WEBHOOK_SECRET || ""
            ).trim()
          ),
          pathao: false,
          redx: false,
        },
        diagnostics,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/settings/courier error:", error);
    return NextResponse.json({ error: "Could not load courier settings." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireSuperAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const normalized = normalizeCourierSettings(body);

    await connectToDatabase();
    const existing = await Settings.findOne({ key: COURIER_SETTINGS_KEY }).lean();

    await Settings.findOneAndUpdate(
      { tenantId: auth.tenantId, key: COURIER_SETTINGS_KEY },
      {
        $set: {
          tenantId: auth.tenantId,
          key: COURIER_SETTINGS_KEY,
          value: normalized,
        },
      },
      { upsert: true, new: true }
    );

    invalidateCourierSettingsCache();

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "unknown",
        action: "settings.courier.update",
        targetType: "settings",
        targetId: COURIER_SETTINGS_KEY,
        before: (existing?.value as Record<string, unknown>) || null,
        after: normalized as unknown as Record<string, unknown>,
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json({ ok: true, settings: normalized });
  } catch (error) {
    console.error("PUT /api/admin/settings/courier error:", error);
    return NextResponse.json({ error: "Could not save courier settings." }, { status: 500 });
  }
}
