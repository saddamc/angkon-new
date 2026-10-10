import { NextRequest, NextResponse } from "next/server";
import REAL_PRODUCTS from "@/data/real-products.json";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";
const wcAuth = () => Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
const WC_HEADERS = () => ({ Authorization: `Basic ${wcAuth()}`, "Content-Type": "application/json" });

const isWcLive = Boolean(
  process.env.NEXT_PUBLIC_WC_API_URL &&
  !process.env.NEXT_PUBLIC_WC_API_URL.includes("netbazarbd.net") &&
  WC_CK &&
  WC_CS
);

// GET /api/admin/products — list all products (with pagination)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);
  const search = searchParams.get("search") ?? "";

  if (isWcLive) {
    try {
      const url = new URL(`${WC_BASE}/wp-json/wc/v3/products`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", String(perPage));
      url.searchParams.set("status", "any");
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString(), {
        headers: WC_HEADERS(),
        cache: "no-store",
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = await res.json();
        const total = res.headers.get("X-WP-Total") ?? String(data.length);
        const totalPages = res.headers.get("X-WP-TotalPages") ?? "1";

        return NextResponse.json(
          { products: data, total: Number(total), totalPages: Number(totalPages) },
          { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
        );
      }
    } catch (err) {
      console.warn("WooCommerce products fetch failed, using local fallback:", err);
    }
  }

  // Instant local catalog response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let list = [...(REAL_PRODUCTS as any[])];
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q));
  }
  const total = list.length;
  const totalPages = Math.ceil(total / perPage);
  const paginated = list.slice((page - 1) * perPage, page * perPage);

  return NextResponse.json(
    { products: paginated, total, totalPages },
    { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}

// POST /api/admin/products — create product
export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const res = await fetch(`${WC_BASE}/wp-json/wc/v3/products`, {
      method: "POST",
      headers: WC_HEADERS(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Create product failed:", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
