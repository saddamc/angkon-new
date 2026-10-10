import { NextRequest, NextResponse } from "next/server";
import { mapWooProduct } from "@/services/products.service";
import REAL_PRODUCTS from "@/data/real-products.json";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  let slug = "";
  try {
    const p = await params;
    slug = p.slug;
    const auth = Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
    const wcParams = new URLSearchParams({ slug, status: "publish" });
    const response = await fetch(`${WC_BASE}/wp-json/wc/v3/products?${wcParams}`, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const found = (REAL_PRODUCTS as any[]).find((p) => p.slug === slug);
      if (found) return NextResponse.json(found);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const data = await response.json();
    const arr = Array.isArray(data) ? data : [];
    if (arr.length === 0) {
      const found = (REAL_PRODUCTS as any[]).find((p) => p.slug === slug);
      if (found) return NextResponse.json(found);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(mapWooProduct(arr[0]));
  } catch (error) {
    const found = (REAL_PRODUCTS as any[]).find((p) => p.slug === slug);
    if (found) return NextResponse.json(found);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
