import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { getRedxAreas } from "@/server/courier/redx";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await getRedxAreas();
    if (!res.ok) {
      return NextResponse.json({ error: res.error.message }, { status: 502 });
    }
    return NextResponse.json({ items: res.items });
  } catch (error) {
    console.error("GET /api/admin/couriers/redx/areas error:", error);
    return NextResponse.json({ error: "Could not load RedX areas." }, { status: 500 });
  }
}
