import { NextResponse } from "next/server";
import { getDbCategories } from "@/lib/db/categories";

export async function GET() {
  try {
    const categories = await getDbCategories();
    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("API /categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
