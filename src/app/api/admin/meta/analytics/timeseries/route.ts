import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { MetaAdReport } from "@/models/MetaAdReport";
import { MetaEventLog } from "@/models/MetaEventLog";

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
    const periodParam = searchParams.get("period");
    const rawDays = parseInt(searchParams.get("days") ?? "30", 10);

    const now = new Date();
    let days = 30;
    let start: Date;
    const periodName = periodParam || "30d";
    const isToday = periodParam === "today";

    if (isToday) {
      days = 1;
      // Last 24 hours
      start = new Date(now.getTime() - 24 * 3600000);
    } else if (periodParam === "7d") {
      days = 7;
      start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 7);
      start.setUTCHours(0, 0, 0, 0);
    } else if (periodParam === "month") {
      // Month-to-date: from 1st of current month
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const diffTime = Math.abs(now.getTime() - start.getTime());
      days = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);
    } else if (periodParam === "year") {
      // Year-to-date: from Jan 1 of current year
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const diffTime = Math.abs(now.getTime() - start.getTime());
      days = Math.min(Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1), 365);
    } else {
      // Default to 30 days or explicit days parameter
      days = isNaN(rawDays) || rawDays < 1 ? 30 : Math.min(rawDays, 90);
      start = new Date(now);
      start.setUTCDate(start.getUTCDate() - days);
      start.setUTCHours(0, 0, 0, 0);
    }

    await connectToDatabase();

    // 1. Fetch Orders
    const orders = await Order.find({
      createdAt: { $gte: start },
    })
      .select("total orderStatus createdAt")
      .lean();

    // Map: key → { revenue, orders, spend, clicks, impressions, events, websiteEvents, serverEvents }
    const byKey = new Map<
      string,
      {
        revenue: number;
        orders: number;
        spend: number;
        clicks: number;
        impressions: number;
        events: number;
        websiteEvents: number;
        serverEvents: number;
      }
    >();

    for (const o of orders) {
      if (INVALID_STATUSES.includes(o.orderStatus as string)) continue;
      const createdAt = (o as { createdAt?: Date }).createdAt;
      if (!createdAt) continue;

      const keyStr = isToday
        ? `${createdAt.toISOString().slice(0, 13)}:00`
        : toUTCDateString(createdAt);

      const existing = byKey.get(keyStr) ?? {
        revenue: 0,
        orders: 0,
        spend: 0,
        clicks: 0,
        impressions: 0,
        events: 0,
        websiteEvents: 0,
        serverEvents: 0,
      };
      existing.revenue += o.total ?? 0;
      existing.orders += 1;
      byKey.set(keyStr, existing);
    }

    // 2. Fetch Ad Reports
    let adCurrency = "BDT";
    try {
      const startStr = toUTCDateString(start);
      const adReports = await MetaAdReport.find({
        tenantId: auth.tenantId,
        level: "campaign",
        date: { $gte: startStr },
      })
        .select("date spend impressions clicks currency")
        .lean();

      for (const r of adReports) {
        if (!r.date) continue;
        if (r.currency) adCurrency = r.currency;
        const existing = byKey.get(r.date) ?? {
          revenue: 0,
          orders: 0,
          spend: 0,
          clicks: 0,
          impressions: 0,
          events: 0,
          websiteEvents: 0,
          serverEvents: 0,
        };
        existing.spend += r.spend || 0;
        existing.clicks += r.clicks || 0;
        existing.impressions += r.impressions || 0;
        byKey.set(r.date, existing);
      }
    } catch {
      // Ignore if reports not available
    }

    // 3. Aggregate Meta Telemetry Event Logs (Website / Browser vs CAPI / Server)
    try {
      const groupFormat = isToday ? "%Y-%m-%d %H:00" : "%Y-%m-%d";
      const eventAgg = await MetaEventLog.aggregate([
        {
          $match: {
            tenantId: auth.tenantId,
            createdAt: { $gte: start },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
            total: { $sum: 1 },
            website: {
              $sum: {
                $cond: [{ $eq: ["$source", "browser"] }, 1, 0],
              },
            },
            server: {
              $sum: {
                $cond: [{ $ne: ["$source", "browser"] }, 1, 0],
              },
            },
          },
        },
      ]);

      for (const item of eventAgg) {
        if (!item._id) continue;
        const existing = byKey.get(item._id) ?? {
          revenue: 0,
          orders: 0,
          spend: 0,
          clicks: 0,
          impressions: 0,
          events: 0,
          websiteEvents: 0,
          serverEvents: 0,
        };
        existing.events += item.total || 0;
        existing.websiteEvents += item.website || 0;
        existing.serverEvents += item.server || 0;
        byKey.set(item._id, existing);
      }
    } catch (err) {
      console.warn("[Meta Timeseries] Event aggregation error:", err);
    }

    // 4. Build the sorted continuous series
    interface TimeseriesPoint {
      date: string;
      timeLabel: string;
      formattedDateTime: string;
      revenue: number;
      orders: number;
      spend: number;
      clicks: number;
      impressions: number;
      events: number;
      websiteEvents: number;
      serverEvents: number;
    }

    const series: TimeseriesPoint[] = [];

    if (isToday) {
      // Generate 24 hourly buckets ending at current hour
      const currentHour = new Date(now);
      currentHour.setMinutes(0, 0, 0);

      for (let i = 23; i >= 0; i--) {
        const bucketTime = new Date(currentHour.getTime() - i * 3600000);
        const isoKey = `${bucketTime.toISOString().slice(0, 13)}:00`;
        const entry = byKey.get(isoKey) ?? {
          revenue: 0,
          orders: 0,
          spend: 0,
          clicks: 0,
          impressions: 0,
          events: 0,
          websiteEvents: 0,
          serverEvents: 0,
        };

        const hours = bucketTime.getUTCHours();
        const ampm = hours >= 12 ? "PM" : "AM";
        const h12 = hours % 12 === 0 ? 12 : hours % 12;
        const timeLabel = `${h12}:00 ${ampm}`;

        const month = bucketTime.getUTCMonth() + 1;
        const day = bucketTime.getUTCDate();
        const year = String(bucketTime.getUTCFullYear()).slice(2);
        const formattedDateTime = `${month}/${day}/${year}, ${timeLabel}`;

        series.push({
          date: isoKey,
          timeLabel,
          formattedDateTime,
          revenue: Math.round(entry.revenue * 100) / 100,
          orders: entry.orders,
          spend: Math.round(entry.spend * 100) / 100,
          clicks: entry.clicks,
          impressions: entry.impressions,
          events: entry.events,
          websiteEvents: entry.websiteEvents,
          serverEvents: entry.serverEvents,
        });
      }
    } else {
      // Daily buckets
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i);
        d.setUTCHours(0, 0, 0, 0);
        const dateStr = toUTCDateString(d);
        const entry = byKey.get(dateStr) ?? {
          revenue: 0,
          orders: 0,
          spend: 0,
          clicks: 0,
          impressions: 0,
          events: 0,
          websiteEvents: 0,
          serverEvents: 0,
        };

        const month = d.getUTCMonth() + 1;
        const day = d.getUTCDate();
        const year = String(d.getUTCFullYear()).slice(2);
        const formattedDateTime = `${month}/${day}/${year}`;

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const timeLabel = `${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`;

        series.push({
          date: dateStr,
          timeLabel,
          formattedDateTime,
          revenue: Math.round(entry.revenue * 100) / 100,
          orders: entry.orders,
          spend: Math.round(entry.spend * 100) / 100,
          clicks: entry.clicks,
          impressions: entry.impressions,
          events: entry.events,
          websiteEvents: entry.websiteEvents,
          serverEvents: entry.serverEvents,
        });
      }
    }

    return NextResponse.json({
      days,
      period: periodName,
      currency: adCurrency,
      currencySymbol: adCurrency === "USD" ? "$" : "৳",
      series,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error computing timeseries";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
