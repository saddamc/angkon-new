import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { getPathaoAreas, getPathaoCities, getPathaoZones } from "@/server/courier/providers/pathao";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "cities";
  const cityId = Number(searchParams.get("cityId") || "0");
  const zoneId = Number(searchParams.get("zoneId") || "0");

  try {
    if (type === "cities") {
      const res = await getPathaoCities();
      if (!res.ok) return NextResponse.json({ error: res.error.message }, { status: 502 });
      return NextResponse.json({ items: res.items });
    }
    if (type === "zones") {
      if (!cityId) return NextResponse.json({ error: "cityId is required" }, { status: 400 });
      const res = await getPathaoZones(cityId);
      if (!res.ok) return NextResponse.json({ error: res.error.message }, { status: 502 });
      return NextResponse.json({ items: res.items });
    }
    if (type === "areas") {
      if (!zoneId) return NextResponse.json({ error: "zoneId is required" }, { status: 400 });
      const res = await getPathaoAreas(zoneId);
      if (!res.ok) return NextResponse.json({ error: res.error.message }, { status: 502 });
      return NextResponse.json({ items: res.items });
    }
    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/admin/couriers/pathao/locations error:", error);
    return NextResponse.json({ error: "Could not load Pathao locations." }, { status: 500 });
  }
}
