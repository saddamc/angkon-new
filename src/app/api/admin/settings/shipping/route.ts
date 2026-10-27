import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { revalidateStorefront } from "@/lib/catalog-sync";
import { getShippingSettings, SHIPPING_SETTINGS_KEY, invalidateShippingSettingsCache } from "@/server/shipping";

const FIELDS = [
  ["insideDhaka", "Inside Dhaka delivery"],
  ["nearDhaka", "Gazipur / Narayanganj / Savar delivery"],
  ["outsideDhaka", "Outside Dhaka delivery"],
  ["freeDeliveryThreshold", "Free delivery threshold"],
] as const;

const MAX_AMOUNT = 1_000_000;

export async function GET() {
  const settings = await getShippingSettings();
  return NextResponse.json(settings, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Validate strictly — a typo here would change what every customer is charged.
    const values: Record<string, number> = {};
    for (const [field, label] of FIELDS) {
      const raw = body[field];
      const n = typeof raw === "string" ? Number(raw.trim()) : Number(raw);
      if (raw === undefined || raw === null || raw === "" || !Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) {
        return NextResponse.json(
          { error: `${label} must be a number from 0 to ${MAX_AMOUNT.toLocaleString("en-US")}.` },
          { status: 400 },
        );
      }
      values[field] = Math.round(n);
    }

    await connectToDatabase();
    await Settings.findOneAndUpdate(
      { key: SHIPPING_SETTINGS_KEY },
      { $set: { value: values } },
      { upsert: true, new: true },
    );

    invalidateShippingSettingsCache();

    // Pages that print these prices (shipping, delivery-time, terms) refresh right away.
    revalidateStorefront();

    return NextResponse.json({ success: true, shipping: values });
  } catch (error) {
    console.error("POST /api/admin/settings/shipping error:", error);
    return NextResponse.json({ error: "Failed to update shipping settings." }, { status: 500 });
  }
}
