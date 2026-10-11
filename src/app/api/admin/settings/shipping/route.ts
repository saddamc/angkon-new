import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";

const DEFAULT_SHIPPING = {
  insideDhaka: 60,
  outsideDhaka: 120,
  freeDeliveryThreshold: 0,
};

export async function GET() {
  try {
    await connectToDatabase();
    const setting = await Settings.findOne({ key: "shipping" }).lean();
    if (!setting || !setting.value) {
      return NextResponse.json(DEFAULT_SHIPPING);
    }
    return NextResponse.json(setting.value);
  } catch (error) {
    console.error("GET /api/admin/settings/shipping error:", error);
    return NextResponse.json(DEFAULT_SHIPPING);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const insideDhaka = Number(body.insideDhaka ?? 60);
    const outsideDhaka = Number(body.outsideDhaka ?? 120);
    const freeDeliveryThreshold = Number(body.freeDeliveryThreshold ?? 0);

    const shipping = {
      insideDhaka: isNaN(insideDhaka) ? 60 : insideDhaka,
      outsideDhaka: isNaN(outsideDhaka) ? 120 : outsideDhaka,
      freeDeliveryThreshold: isNaN(freeDeliveryThreshold) ? 0 : freeDeliveryThreshold,
    };

    await connectToDatabase();
    await Settings.findOneAndUpdate(
      { key: "shipping" },
      { $set: { value: shipping } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, shipping });
  } catch (error) {
    console.error("POST /api/admin/settings/shipping error:", error);
    return NextResponse.json({ error: "Failed to update shipping settings" }, { status: 500 });
  }
}
