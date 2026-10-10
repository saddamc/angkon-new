import { NextRequest, NextResponse } from "next/server";
import { mapWooProduct } from "@/services/products.service";
import REAL_PRODUCTS from "@/data/real-products.json";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = searchParams.get("page") ?? "1";
    const perPage = searchParams.get("perPage") ?? "12";
    const search = searchParams.get("search");

    const params = new URLSearchParams({
      page,
      per_page: perPage,
      status: "publish",
    });
    if (search) params.set("search", search);

    const auth = Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
    const response = await fetch(`${WC_BASE}/wp-json/wc/v3/products?${params}`, {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    if (!response.ok) {
      let list = (REAL_PRODUCTS as any[]);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
      }
      const pageNum = parseInt(page);
      const perPageNum = parseInt(perPage);
      return NextResponse.json(list.slice((pageNum - 1) * perPageNum, pageNum * perPageNum), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const data = await response.json();
    return NextResponse.json(Array.isArray(data) ? data.map(mapWooProduct) : [], {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("API /products proxy error, using catalog fallback");
    return NextResponse.json((REAL_PRODUCTS as any[]).slice(0, 12), { status: 200 });
  }
}
