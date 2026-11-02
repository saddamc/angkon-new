import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Statuses that represent cancelled / failed / refunded / trash orders
const INVALID_STATUSES = ["cancelled", "failed", "refunded", "trash"];

function toUTCDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawDays = parseInt(searchParams.get("days") ?? "30", 10);
    const days = isNaN(rawDays) || rawDays < 1 ? 30 : Math.min(rawDays, 90);

    const now = new Date();
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - days);
    start.setUTCHours(0, 0, 0, 0);

    await connectToDatabase();

    const orders = await Order.find({
      createdAt: { $gte: start },
    })
      .select("total orderStatus createdAt")
      .lean();

    // Build a map: date string → { revenue, orders }
    const byDate = new Map<string, { revenue: number; orders: number }>();

    for (const o of orders) {
      // Skip invalid / cancelled statuses
      if (INVALID_STATUSES.includes(o.orderStatus as string)) continue;

      const createdAt = (o as { createdAt?: Date }).createdAt;
      if (!createdAt) continue;

      const dateStr = toUTCDateString(createdAt);
      const existing = byDate.get(dateStr) ?? { revenue: 0, orders: 0 };
      existing.revenue += o.total ?? 0;
      existing.orders += 1;
      byDate.set(dateStr, existing);
    }

    // Build the full series filling missing dates with 0
    const series: Array<{ date: string; revenue: number; orders: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      const dateStr = toUTCDateString(d);
      const entry = byDate.get(dateStr) ?? { revenue: 0, orders: 0 };
      series.push({
        date: dateStr,
        revenue: Math.round(entry.revenue * 100) / 100,
        orders: entry.orders,
      });
    }

    return NextResponse.json({ days, series });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error computing timeseries";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
