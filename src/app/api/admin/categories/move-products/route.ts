import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

export async function POST(request: NextRequest) {
  try {
    const { from, to } = await request.json();
    if (!from || !to) {
      return NextResponse.json({ error: "from and to category IDs are required" }, { status: 400 });
    }
    if (from === to) {
      return NextResponse.json({ ok: true, moved: 0 });
    }

    await connectToDatabase();

    const targetCategory = await Category.findOne({ id: Number(to) }).lean();
    if (!targetCategory) {
      return NextResponse.json({ error: "Target category not found" }, { status: 404 });
    }

    // Find all products in source category
    const products = await Product.find({ "categories.id": Number(from) });

    let moved = 0;
    for (const prod of products) {
      const filteredCategories = (prod.categories || []).filter((c) => c.id !== Number(from));
      const hasTarget = filteredCategories.some((c) => c.id === targetCategory.id);
      if (!hasTarget) {
        filteredCategories.push({
          id: targetCategory.id,
          name: targetCategory.name,
          slug: targetCategory.slug,
          parent: targetCategory.parent || 0,
        });
      }
      prod.categories = filteredCategories;
      await prod.save();
      moved++;
    }

    return NextResponse.json({ ok: true, moved, total: products.length });
  } catch (error) {
    console.error("Move products between categories error:", error);
    return NextResponse.json({ error: "Failed to move products" }, { status: 500 });
  }
}
