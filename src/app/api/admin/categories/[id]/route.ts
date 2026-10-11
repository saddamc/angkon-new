import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    const body = await request.json();
    await connectToDatabase();

    const numericId = parseInt(id, 10);
    const query = isNaN(numericId) ? { slug: id } : { id: numericId };

    const updated = await Category.findOneAndUpdate(
      query,
      { $set: body },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Update category failed:", err);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}
