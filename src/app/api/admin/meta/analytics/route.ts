import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { MetaAdReport } from "@/models/MetaAdReport";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Period = "today" | "7d" | "30d" | "month" | "year";

function toUTCDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPeriodRange(period: Period): { start: Date; label: string } {
  const now = new Date();
  let start: Date;
  let label: string;

  switch (period) {
    case "today": {
      start = new Date(now);
      start.setUTCHours(0, 0, 0, 0);
      label = "Today";
      break;
    }
    case "7d": {
      start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 7);
      start.setUTCHours(0, 0, 0, 0);
      label = "Last 7 days";
      break;
    }
    case "month": {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      label = "This month";
      break;
    }
    case "year": {
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      label = "This year";
      break;
    }
    case "30d":
    default: {
      start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 30);
      start.setUTCHours(0, 0, 0, 0);
      label = "Last 30 days";
      break;
    }
  }

  return { start, label };
}

// Statuses that represent cancelled / failed / refunded orders
const INVALID_STATUSES = ["cancelled", "failed", "refunded", "trash"];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawPeriod = searchParams.get("period") ?? "30d";
    const period: Period = (["today", "7d", "30d", "month", "year"] as const).includes(rawPeriod as Period)
      ? (rawPeriod as Period)
      : "30d";

    const { start, label } = getPeriodRange(period);

    await connectToDatabase();

    // ── Fetch orders in the period ──────────────────────────────────────────
    const periodOrders = await Order.find({ createdAt: { $gte: start } })
      .select("total shippingFee paymentStatus orderStatus customer createdAt")
      .lean();

    // Separate valid vs cancelled
    const validOrders = periodOrders.filter(
      (o) => !INVALID_STATUSES.includes(o.orderStatus as string)
    );
    const cancelledOrders = periodOrders.filter((o) =>
      INVALID_STATUSES.includes(o.orderStatus as string)
    );

    // Revenue aggregations
    const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    const totalOrders = validOrders.length;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const paidRevenue = validOrders
      .filter((o) => o.paymentStatus === "paid" || o.orderStatus === "completed")
      .reduce((sum, o) => sum + (o.total ?? 0), 0);

    const pendingRevenue = totalRevenue - paidRevenue;

    const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);

    const completedCount = validOrders.filter((o) => o.orderStatus === "completed").length;
    const pendingCount = validOrders.filter(
      (o) => o.orderStatus === "pending" || o.orderStatus === "processing"
    ).length;

    const shippingTotal = validOrders.reduce((sum, o) => sum + (o.shippingFee ?? 0), 0);

    // ── Customer approximation ─────────────────────────────────────────────
    // Unique phone/email in the period
    const periodIdentifiers = new Set<string>();
    for (const o of validOrders) {
      const phone = (o.customer as { phone?: string })?.phone;
      const email = (o.customer as { email?: string })?.email;
      if (phone) periodIdentifiers.add(`ph:${phone}`);
      if (email) periodIdentifiers.add(`em:${email}`);
    }

    // All-time unique (for total customers)
    const allOrders = await Order.find({})
      .select("customer")
      .lean();

    const allIdentifiers = new Set<string>();
    const preStartIdentifiers = new Set<string>(); // identifiers seen before the period
    for (const o of allOrders) {
      const phone = (o.customer as { phone?: string })?.phone;
      const email = (o.customer as { email?: string })?.email;
      const createdAt = (o as { createdAt?: Date }).createdAt;
      const isBeforePeriod = createdAt && createdAt < start;
      if (phone) {
        allIdentifiers.add(`ph:${phone}`);
        if (isBeforePeriod) preStartIdentifiers.add(`ph:${phone}`);
      }
      if (email) {
        allIdentifiers.add(`em:${email}`);
        if (isBeforePeriod) preStartIdentifiers.add(`em:${email}`);
      }
    }

    const totalCustomers = allIdentifiers.size;
    let newCustomers = 0;
    for (const id of periodIdentifiers) {
      if (!preStartIdentifiers.has(id)) newCustomers++;
    }

    // ── Products ───────────────────────────────────────────────────────────
    const totalProducts = await Product.countDocuments();

    // ── Meta Marketing Ad Telemetry (Spend & Blended ROAS) ─────────────────
    let totalAdSpend = 0;
    let totalAdClicks = 0;
    let totalAdImpressions = 0;
    let adCurrency = "BDT";

    try {
      const startStr = toUTCDateString(start);
      const adReports = await MetaAdReport.find({
        tenantId: auth.tenantId,
        level: "campaign",
        date: { $gte: startStr },
      })
        .select("spend impressions clicks currency")
        .lean();

      for (const r of adReports) {
        totalAdSpend += r.spend || 0;
        totalAdClicks += r.clicks || 0;
        totalAdImpressions += r.impressions || 0;
        if (r.currency) adCurrency = r.currency;
      }
    } catch {
      // Non-fatal if ad report collection empty
    }

    // Currency conversion: In Bangladesh, Meta Ad accounts commonly bill in USD ($)
    // while the storefront collects payments in BDT (৳).
    // Use official commercial benchmark (1 USD ≈ 120 BDT) to reconcile.
    const USD_TO_BDT_RATE = 120;
    const spendInBdt = adCurrency === "USD" ? totalAdSpend * USD_TO_BDT_RATE : totalAdSpend;

    const blendedRoas =
      spendInBdt > 0 ? Math.round((totalRevenue / spendInBdt) * 100) / 100 : 0;

    return NextResponse.json({
      period,
      periodLabel: label,
      generatedAt: new Date().toISOString(),
      revenue: {
        total: Math.round(totalRevenue * 100) / 100,
        paid: Math.round(paidRevenue * 100) / 100,
        pending: Math.round(pendingRevenue * 100) / 100,
        cancelled: Math.round(cancelledRevenue * 100) / 100,
        net: Math.round((totalRevenue - cancelledRevenue) * 100) / 100,
        aov: Math.round(aov * 100) / 100,
        shipping: Math.round(shippingTotal * 100) / 100,
      },
      adSpend: {
        total: Math.round(totalAdSpend * 100) / 100,
        currency: adCurrency,
        currencySymbol: adCurrency === "USD" ? "$" : "৳",
        totalInBdt: Math.round(spendInBdt * 100) / 100,
        exchangeRate: adCurrency === "USD" ? USD_TO_BDT_RATE : 1,
        clicks: totalAdClicks,
        impressions: totalAdImpressions,
        blendedRoas,
      },
      orders: {
        total: totalOrders,
        cancelled: cancelledOrders.length,
        pending: pendingCount,
        completed: completedCount,
      },
      customers: {
        total: totalCustomers,
        new: newCustomers,
      },
      products: {
        total: totalProducts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error computing analytics";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
