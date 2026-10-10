import { NextRequest, NextResponse } from "next/server";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";
const wcAuth = () => Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
const WC_HEADERS = () => ({ Authorization: `Basic ${wcAuth()}`, "Content-Type": "application/json" });

// GET /api/admin/orders — list orders (newest first)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") ?? "1";
  const perPage = searchParams.get("per_page") ?? "20";
  const status = searchParams.get("status") ?? "any";

  const url = new URL(`${WC_BASE}/wp-json/wc/v3/orders`);
  url.searchParams.set("page", page);
  url.searchParams.set("per_page", perPage);
  url.searchParams.set("status", status);
  url.searchParams.set("orderby", "date");
  url.searchParams.set("order", "desc");

  const res = await fetch(url.toString(), { headers: WC_HEADERS(), cache: "no-store" });
  const data = await res.json();
  const total = res.headers.get("X-WP-Total") ?? "0";
  const totalPages = res.headers.get("X-WP-TotalPages") ?? "1";

  return NextResponse.json(
    { orders: data, total: Number(total), totalPages: Number(totalPages) },
    { status: res.status, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}
