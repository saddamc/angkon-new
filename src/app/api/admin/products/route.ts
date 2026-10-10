import { NextRequest, NextResponse } from "next/server";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";
const wcAuth = () => Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
const WC_HEADERS = () => ({ Authorization: `Basic ${wcAuth()}`, "Content-Type": "application/json" });

// GET /api/admin/products — list all products (with pagination)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") ?? "1";
  const perPage = searchParams.get("per_page") ?? "20";
  const search = searchParams.get("search") ?? "";

  const url = new URL(`${WC_BASE}/wp-json/wc/v3/products`);
  url.searchParams.set("page", page);
  url.searchParams.set("per_page", perPage);
  url.searchParams.set("status", "any");
  if (search) url.searchParams.set("search", search);

  const res = await fetch(url.toString(), { headers: WC_HEADERS(), cache: "no-store" });
  const data = await res.json();
  const total = res.headers.get("X-WP-Total") ?? "0";
  const totalPages = res.headers.get("X-WP-TotalPages") ?? "1";

  return NextResponse.json(
    { products: data, total: Number(total), totalPages: Number(totalPages) },
    { status: res.status, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}

// POST /api/admin/products — create product
export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${WC_BASE}/wp-json/wc/v3/products`, {
    method: "POST",
    headers: WC_HEADERS(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
