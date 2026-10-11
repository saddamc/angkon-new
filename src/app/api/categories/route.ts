import { NextResponse } from "next/server";
import { getDbCategories } from "@/lib/db/categories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getDbCategories();
    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("API /categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
