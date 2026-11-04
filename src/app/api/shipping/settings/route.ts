import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/server/admin-auth";
import { getShippingSettings } from "@/server/shipping";

export const dynamic = "force-dynamic";

/**
 * /api/shipping/settings is strictly protected for administrators.
 * Public delivery rates for the storefront cart and checkout are served from /api/shipping/rates.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request);
  if (!auth.authorized) {
    return (
      auth.response ||
      NextResponse.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      )
    );
  }

  const settings = await getShippingSettings();
  return NextResponse.json(settings);
}
