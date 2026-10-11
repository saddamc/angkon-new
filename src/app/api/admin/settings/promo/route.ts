import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";

const DEFAULT_PROMO = {
  enabled: false,
  image: "",
  link: "",
};

export async function GET() {
  try {
    await connectToDatabase();
    const setting = await Settings.findOne({ key: "promo" }).lean();
    if (!setting || !setting.value) {
      return NextResponse.json(DEFAULT_PROMO);
    }
    return NextResponse.json(setting.value);
  } catch (error) {
    console.error("GET /api/admin/settings/promo error:", error);
    return NextResponse.json(DEFAULT_PROMO);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { enabled, image, link } = await request.json();
    const promo = {
      enabled: Boolean(enabled),
      image: typeof image === "string" ? image.trim() : "",
      link: typeof link === "string" ? link.trim() : "",
    };

    await connectToDatabase();
    await Settings.findOneAndUpdate(
      { key: "promo" },
      { $set: { value: promo } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, promo });
  } catch (error) {
    console.error("POST /api/admin/settings/promo error:", error);
    return NextResponse.json({ error: "Failed to update promo settings" }, { status: 500 });
  }
}
