import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import {
  CHECKOUT_SETTINGS_KEY,
  getCheckoutSettings,
  normalizeCheckoutSettings,
} from "@/server/checkout-settings";

export async function GET() {
  const settings = await getCheckoutSettings();
  return NextResponse.json(settings, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const current = await getCheckoutSettings();
    const normalized = normalizeCheckoutSettings({ ...current, ...body });

    await connectToDatabase();
    await Settings.findOneAndUpdate(
      { key: CHECKOUT_SETTINGS_KEY },
      { $set: { value: normalized } },
      { upsert: true, new: true },
    );
    return NextResponse.json({ success: true, settings: normalized });
  } catch (error) {
    console.error("POST /api/admin/settings/checkout error:", error);
    return NextResponse.json({ error: "Failed to update checkout settings." }, { status: 500 });
  }
}
