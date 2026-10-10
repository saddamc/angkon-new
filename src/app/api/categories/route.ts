import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/woocommerce/categories";

// Public, read-only, cached mirror of WooCommerce categories — used by the
// storefront (navbar, homepage, products page). Backed by getAllCategories(),
// which is revalidated every 5 minutes and on-demand after admin category CRUD.
export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("API /categories proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
