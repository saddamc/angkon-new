import { NextResponse } from "next/server";
import { DISTRICT_TO_WC_CODE } from "@/data/bangladesh-districts";
import {
  fetchZonesWithData,
  calcZoneCostForClasses,
} from "./lib";

// ── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const district = searchParams.get("district");
  const classIdsParam = searchParams.get("classIds"); // preferred: comma-separated shipping_class_ids from cart

  // ── Exact cart shipping: ?district=Cumilla&classIds=28,29 ──
  if (district && classIdsParam !== null) {
    try {
      const zones = await fetchZonesWithData();
      const wcCode = DISTRICT_TO_WC_CODE[district.toLowerCase().trim()];
      const targetZone =
        (wcCode ? zones.find((z) => !z.isCatchAll && z.states.includes(wcCode)) : null)
        ?? zones.find((z) => z.isCatchAll)
        ?? zones[0];

      if (!targetZone) return NextResponse.json({ fee: 0 });

      const classIds = classIdsParam
        .split(",")
        .map(Number)
        .filter((n) => !isNaN(n));

      const fee = calcZoneCostForClasses(targetZone, classIds);
      return NextResponse.json({ fee }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      console.error("Cart shipping calc error:", err);
      return NextResponse.json({ fee: 0 }, { status: 200 });
    }
  }

  // ── Full zone data for initial page load ──
  try {
    const zones = await fetchZonesWithData();
    const catchAll = zones.find((z) => z.isCatchAll);
    const fee = catchAll?.cost ?? zones.find((z) => z.cost > 0)?.cost ?? 0;
    const methods = zones.map((z) => ({
      instance_id: z.id,
      method_id: z.method_id,
      title: z.method_title,
      cost: z.cost,
      enabled: true,
    }));
    return NextResponse.json(
      { fee, methods, zones },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    console.error("Shipping fetch error:", err);
    return NextResponse.json({ fee: 0, methods: [], zones: [] }, { status: 200 });
  }
}

