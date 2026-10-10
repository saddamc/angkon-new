import { NextRequest, NextResponse } from "next/server";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";
const wcAuth = () => Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
const headers = () => ({ Authorization: `Basic ${wcAuth()}`, "Content-Type": "application/json" });
const opts = () => ({ headers: headers(), cache: "no-store" as const });

// GET /api/admin/reports — fetch WooCommerce native reports data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "month"; // "week", "month", "last_month", "year"

  try {
    // Map period to WC date_min/date_max
    const now = new Date();
    let date_min = "";
    let date_max = now.toISOString().split("T")[0];

    if (period === "today") {
      date_min = date_max;
    } else if (period === "week") {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      date_min = w.toISOString().split("T")[0];
    } else if (period === "month") {
      date_min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (period === "last_month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      date_min = lm.toISOString().split("T")[0];
      const lme = new Date(now.getFullYear(), now.getMonth(), 0);
      date_max = lme.toISOString().split("T")[0];
    } else if (period === "year") {
      date_min = `${now.getFullYear()}-01-01`;
    }

    // Fetch WooCommerce native sales report
    const salesUrl = new URL(`${WC_BASE}/wp-json/wc/v3/reports/sales`);
    salesUrl.searchParams.set("date_min", date_min);
    salesUrl.searchParams.set("date_max", date_max);

    // Fetch order status totals
    const statusUrl = `${WC_BASE}/wp-json/wc/v3/reports/orders/totals`;

    // Fetch top sellers
    const topUrl = new URL(`${WC_BASE}/wp-json/wc/v3/reports/top_sellers`);
    topUrl.searchParams.set("date_min", date_min);
    topUrl.searchParams.set("date_max", date_max);
    topUrl.searchParams.set("per_page", "10");

    // Fetch customers totals
    const custUrl = `${WC_BASE}/wp-json/wc/v3/reports/customers/totals`;

    const [salesRes, statusRes, topRes, custRes] = await Promise.all([
      fetch(salesUrl.toString(), opts()),
      fetch(statusUrl, opts()),
      fetch(topUrl.toString(), opts()),
      fetch(custUrl, opts()),
    ]);

    const sales = salesRes.ok ? await salesRes.json() : [];
    const statusTotals = statusRes.ok ? await statusRes.json() : [];
    const topSellers = topRes.ok ? await topRes.json() : [];
    const customerTotals = custRes.ok ? await custRes.json() : [];

    // WC sales report returns an array with one item containing totals
    const report = Array.isArray(sales) && sales.length > 0 ? sales[0] : {};

    return NextResponse.json({
      sales: {
        total_sales: report.total_sales ?? "0.00",
        net_sales: report.net_sales ?? "0.00",
        average_sales: report.average_sales ?? "0.00",
        total_orders: report.total_orders ?? 0,
        total_items: report.total_items ?? 0,
        total_tax: report.total_tax ?? "0.00",
        total_shipping: report.total_shipping ?? "0.00",
        total_refunds: report.total_refunds ?? 0,
        total_discount: report.total_discount ?? "0.00",
        total_customers: report.total_customers ?? 0,
      },
      order_statuses: statusTotals,
      top_sellers: topSellers,
      customer_totals: customerTotals,
      period,
      date_min,
      date_max,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
