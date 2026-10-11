import { NextRequest, NextResponse } from "next/server";
import { getDbProducts } from "@/lib/db/products";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const perPage = parseInt(searchParams.get("perPage") ?? "12", 10);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const onSale = searchParams.get("onSale") === "true";

    const products = await getDbProducts({
      page,
      perPage,
      search,
      category,
      onSale,
    });

    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("API /products error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
