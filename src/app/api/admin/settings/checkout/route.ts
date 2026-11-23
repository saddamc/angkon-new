import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireSuperAdminSessionCore } from "@/server/admin-auth";
import {
  CHECKOUT_SETTINGS_KEY,
  getCheckoutSettings,
  normalizeCheckoutSettings,
  invalidateCheckoutSettingsCache,
} from "@/server/checkout-settings";
import { clientIp } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

// Checkout settings include online payment (SSLCOMMERZ) controls, so they are
// restricted to super administrators — both reads and writes.
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getCheckoutSettings();
  return NextResponse.json(settings, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const current = await getCheckoutSettings();
    const normalized = normalizeCheckoutSettings({ ...current, ...body });

    await connectToDatabase();
    await Settings.findOneAndUpdate(
      { key: CHECKOUT_SETTINGS_KEY },
      { $set: { value: normalized } },
      { upsert: true, returnDocument: "after" }
    );
    invalidateCheckoutSettingsCache();

    try {
      await AdminAuditLog.create({
        tenantId: auth.tenantId,
        actor: auth.user || "admin",
        action: "settings.checkout.update",
        targetType: "settings",
        targetId: "checkout",
        before: current as unknown as Record<string, unknown>,
        after: normalized as unknown as Record<string, unknown>,
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent") || "",
      });
    } catch (auditErr) {
      console.warn("Admin audit log write failed:", auditErr);
    }

    return NextResponse.json({ success: true, settings: normalized });
  } catch (error) {
    console.error("POST /api/admin/settings/checkout error:", error);
    return NextResponse.json({ error: "Failed to update checkout settings." }, { status: 500 });
  }
}
