import { NextResponse } from "next/server";
import { getShippingSettings } from "@/server/shipping";

/**
 * Public, read-only delivery rates for the cart, checkout and info pages.
 * (Writing happens in /api/admin/settings/shipping, which requires admin login.)
 */
export async function GET() {
  const settings = await getShippingSettings();
  return NextResponse.json(settings, {
    headers: { "Cache-Control": "public, max-age=15, s-maxage=60, stale-while-revalidate=300" },
  });
}
