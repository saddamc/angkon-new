import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { MetaEventLog } from "@/models/MetaEventLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type AnalyticsPeriod = "today" | "7d" | "30d" | "month" | "year" | "all";

export type ProductQuadrant =
  | "HERO_WINNER"
  | "EMERGING_SIGNAL"
  | "HIDDEN_GEM"
  | "HIGH_ABANDONMENT"
  | "SLOW_MOVER";

export interface ProductPerformanceItem {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: number;
  regularPrice: number;
  salePrice: number;
  onSale: boolean;
  stockStatus: "instock" | "outofstock" | "onbackorder" | string;
  stockQuantity: number | null;
  image: string;
  views: number;
  cartAdds: number;
  orders: number;
  unitsSold: number;
  revenue: number;
  conversionRate: number; // percentage e.g. 4.2
  cartDropoffRate: number; // percentage e.g. 58.3
  quadrant: ProductQuadrant;
  quadrantLabel: string;
  actionRecommendation: string;
}

function getPeriodStartDate(period: AnalyticsPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case "7d": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 7);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case "30d": {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 30);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }
    case "year": {
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }
    case "all":
    default:
      return null;
  }
}

const INVALID_STATUSES = ["cancelled", "failed", "refunded", "trash"];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodParam = (searchParams.get("period") || "30d").toLowerCase() as AnalyticsPeriod;
    const period: AnalyticsPeriod = (["today", "7d", "30d", "month", "year", "all"] as const).includes(periodParam)
      ? periodParam
      : "30d";

    const startDate = getPeriodStartDate(period);

    await connectToDatabase();

    // 1. Fetch catalog products
    const rawProducts = await Product.find({})
      .select("id name slug price regular_price sale_price on_sale stock_status stock_quantity sku images categories")
      .lean();

    // 2. Query Orders within period
    const orderQuery: Record<string, unknown> = {};
    if (startDate) {
      orderQuery.createdAt = { $gte: startDate };
    }

    const rawOrders = await Order.find(orderQuery)
      .select("items total orderStatus paymentStatus createdAt")
      .lean();

    // Filter valid (non-cancelled) orders
    const validOrders = rawOrders.filter((o) => !INVALID_STATUSES.includes(o.orderStatus as string));

    // Aggregate orders by product ID
    const orderStatsByProduct: Record<
      number,
      { ordersCount: number; unitsSold: number; revenue: number }
    > = {};

    for (const ord of validOrders) {
      if (Array.isArray(ord.items)) {
        for (const item of ord.items) {
          const pid = Number(item.productId);
          if (!Number.isFinite(pid)) continue;
          if (!orderStatsByProduct[pid]) {
            orderStatsByProduct[pid] = { ordersCount: 0, unitsSold: 0, revenue: 0 };
          }
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price) || 0;
          orderStatsByProduct[pid].ordersCount += 1;
          orderStatsByProduct[pid].unitsSold += qty;
          orderStatsByProduct[pid].revenue += price * qty;
        }
      }
    }

    // 3. Query Meta Telemetry Events (ViewContent and AddToCart)
    const telemetryQuery: Record<string, unknown> = {
      eventName: { $in: ["ViewContent", "AddToCart"] },
    };
    if (startDate) {
      telemetryQuery.createdAt = { $gte: startDate };
    }

    const rawTelemetry = await MetaEventLog.find(telemetryQuery)
      .select("eventName parameters")
      .lean();

    const telemetryByProduct: Record<number, { views: number; cartAdds: number }> = {};

    for (const log of rawTelemetry) {
      const params = (log.parameters || {}) as Record<string, unknown>;
      const contentIds = Array.isArray(params.content_ids)
        ? params.content_ids
        : typeof params.content_id === "string" || typeof params.content_id === "number"
        ? [params.content_id]
        : [];

      for (const rawId of contentIds) {
        const pid = Number(String(rawId).replace(/^wc_post_/, ""));
        if (!Number.isFinite(pid)) continue;
        if (!telemetryByProduct[pid]) {
          telemetryByProduct[pid] = { views: 0, cartAdds: 0 };
        }
        if (log.eventName === "ViewContent") {
          telemetryByProduct[pid].views += 1;
        } else if (log.eventName === "AddToCart") {
          telemetryByProduct[pid].cartAdds += 1;
        }
      }
    }

    // 4. Map Catalog Products with Metrics
    const productItems: ProductPerformanceItem[] = rawProducts.map((p) => {
      const pid = Number(p.id);
      const ordersData = orderStatsByProduct[pid] || { ordersCount: 0, unitsSold: 0, revenue: 0 };
      const telemetryData = telemetryByProduct[pid] || { views: 0, cartAdds: 0 };

      // Telemetry base (graceful fallback if viewCount < ordersCount)
      const views = Math.max(telemetryData.views, ordersData.ordersCount);
      const cartAdds = Math.max(telemetryData.cartAdds, ordersData.ordersCount);
      const orders = ordersData.ordersCount;
      const unitsSold = ordersData.unitsSold;
      const revenue = ordersData.revenue;

      const conversionRate = views > 0 ? Number(((orders / views) * 100).toFixed(1)) : 0;
      const cartDropoffRate =
        cartAdds > 0
          ? Number((Math.max(0, (cartAdds - orders) / cartAdds) * 100).toFixed(1))
          : 0;

      // Primary image extraction
      const primaryImage =
        Array.isArray(p.images) && p.images.length > 0 && typeof p.images[0].src === "string"
          ? p.images[0].src
          : "";

      // Primary category extraction
      const categoryName =
        Array.isArray(p.categories) && p.categories.length > 0 && typeof p.categories[0].name === "string"
          ? p.categories[0].name
          : "Saree";

      const numericPrice = Number(p.price) || Number(p.regular_price) || 0;
      const regularPrice = Number(p.regular_price) || numericPrice;
      const salePrice = Number(p.sale_price) || numericPrice;

      return {
        id: pid,
        name: p.name || `Saree #${pid}`,
        slug: p.slug || String(pid),
        sku: p.sku || `ANK-${pid}`,
        category: categoryName,
        price: numericPrice,
        regularPrice,
        salePrice,
        onSale: Boolean(p.on_sale),
        stockStatus: p.stock_status || "instock",
        stockQuantity: typeof p.stock_quantity === "number" ? p.stock_quantity : null,
        image: primaryImage,
        views,
        cartAdds,
        orders,
        unitsSold,
        revenue,
        conversionRate,
        cartDropoffRate,
        quadrant: "SLOW_MOVER", // Placeholder, calculated below
        quadrantLabel: "Slow Mover",
        actionRecommendation: "",
      };
    });

    // 5. Quadrant Classification with Statistical Rigor
    // Minimum verified order sample size of 5 required before declaring a "Hero Winner"
    productItems.sort((a, b) => b.revenue - a.revenue || b.orders - a.orders || b.views - a.views);

    for (const item of productItems) {
      if (item.orders >= 5 && item.conversionRate >= 1.5) {
        // True statistically validated winners
        item.quadrant = "HERO_WINNER";
        item.quadrantLabel = "Hero Winner (Proven N≥5)";
        item.actionRecommendation = "Statistically validated winner (≥5 orders). Scale budget in Meta Advantage+ Dynamic Ads and homepage features.";
      } else if (item.orders >= 1 && item.orders < 5) {
        // Early initial sales, but sample size is insufficient to guarantee repeat performance
        item.quadrant = "EMERGING_SIGNAL";
        item.quadrantLabel = "Early Signal (Sample N<5)";
        item.actionRecommendation = `Early customer interest (${item.orders} verified order${item.orders > 1 ? "s" : ""}, ৳${item.revenue.toLocaleString()}). Requires minimum 5 orders before declaring a winner in Advantage+. Test with modest budget ($5–$10/day).`;
      } else if (item.cartAdds >= 3 && item.orders === 0) {
        item.quadrant = "HIGH_ABANDONMENT";
        item.quadrantLabel = "High Cart Abandonment";
        item.actionRecommendation = "Shoppers add this to cart but abandon checkout. Audit shipping fees, payment gateway trust badges, or test dynamic discount retargeting.";
      } else if (item.views >= 30 && item.orders === 0) {
        item.quadrant = "HIGH_ABANDONMENT";
        item.quadrantLabel = "High Drop-Off";
        item.actionRecommendation = "Healthy browsing traffic (≥30 views) but zero purchases. Audit product imagery, sizing details, or compare competitor pricing.";
      } else if (item.orders === 0 && item.views < 20) {
        item.quadrant = "SLOW_MOVER";
        item.quadrantLabel = "Testing / Low Traffic";
        item.actionRecommendation = "Low exposure (<20 views). Do not spend dedicated ad budget yet; drive initial organic traffic via social posts or bundles.";
      } else {
        item.quadrant = "SLOW_MOVER";
        item.quadrantLabel = "Unproven Saree";
        item.actionRecommendation = "Awaiting sufficient visitor telemetry and conversion signals.";
      }
    }

    // Summary counts
    const heroWinnersCount = productItems.filter((p) => p.quadrant === "HERO_WINNER").length;
    const emergingSignalsCount = productItems.filter((p) => p.quadrant === "EMERGING_SIGNAL").length;
    const hiddenGemsCount = emergingSignalsCount; // preserved for backward-compatibility with UI tabs
    const highAbandonmentCount = productItems.filter((p) => p.quadrant === "HIGH_ABANDONMENT").length;
    const slowMoversCount = productItems.filter((p) => p.quadrant === "SLOW_MOVER").length;
    const totalCatalogRevenue = productItems.reduce((acc, p) => acc + p.revenue, 0);
    const avgConversion =
      productItems.reduce((acc, p) => acc + p.conversionRate, 0) / (productItems.length || 1);

    return NextResponse.json({
      ok: true,
      period,
      summary: {
        totalCatalogProducts: productItems.length,
        heroWinnersCount,
        emergingSignalsCount,
        hiddenGemsCount,
        highAbandonmentCount,
        slowMoversCount,
        totalCatalogRevenue,
        averageConversionRate: Number(avgConversion.toFixed(1)),
      },
      products: productItems,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error analyzing product performance";
    console.error("Product Analytics API Error:", error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
