import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import REAL_CATEGORIES from "@/data/real-categories.json";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const categories = await Category.find({})
      .sort({ parent: 1, name: 1 })
      .lean();

    if (categories && categories.length > 0) {
      return NextResponse.json(categories, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }
  } catch (err) {
    console.warn("MongoDB admin categories fetch error, using local fallback:", err);
  }

  return NextResponse.json(REAL_CATEGORIES, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await connectToDatabase();

    const name = String(body.name || "Category").trim();
    const slug =
      body.slug ||
      name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");

    // Generate unique category ID
    let catId = Number(body.id);
    if (!catId || isNaN(catId)) {
      const highest = await Category.findOne({}).sort({ id: -1 }).select("id").lean();
      catId = (highest?.id || 1000) + 1;
    }

    const newCategory = await Category.create({
      id: catId,
      name,
      slug,
      description: body.description ?? "",
      parent: Number(body.parent ?? 0),
      count: Number(body.count ?? 0),
      image: body.image ? { id: body.image.id || 0, src: body.image.src, alt: body.image.alt || name } : null,
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (err) {
    console.error("Create category failed:", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const urlParams = new URL(request.url);
  const id = urlParams.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

  try {
    await connectToDatabase();
    const numericId = parseInt(id, 10);
    const query = isNaN(numericId) ? { slug: id } : { id: numericId };

    const deleted = await Category.findOneAndDelete(query);
    if (!deleted) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Category deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("Delete category failed:", err);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
