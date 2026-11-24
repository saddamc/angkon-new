import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import {
  getPolicySettings,
  POLICY_SETTINGS_KEY,
  invalidatePolicySettingsCache,
  normalizePolicySettings,
} from "@/server/settings/policy-settings";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const settings = await getPolicySettings();
  return NextResponse.json(settings, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const normalized = normalizePolicySettings({
      ...body,
      lastUpdated: new Date().toISOString().split("T")[0],
    });

    await connectToDatabase();
    await Settings.findOneAndUpdate(
      { key: POLICY_SETTINGS_KEY },
      { $set: { value: normalized } },
      { upsert: true, returnDocument: "after" }
    );

    invalidatePolicySettingsCache();

    return NextResponse.json({
      success: true,
      settings: normalized,
    });
  } catch (error) {
    console.error("Failed to update policy settings:", error);
    return NextResponse.json({ error: "Could not save policy configuration." }, { status: 500 });
  }
}
