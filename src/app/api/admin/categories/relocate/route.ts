import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";

export async function POST(request: NextRequest) {
  try {
    const { id, parent, index } = await request.json();

    if (!id || parent === undefined) {
      return NextResponse.json({ error: "id and parent are required" }, { status: 400 });
    }

    if (id === parent) {
      return NextResponse.json({ error: "Cannot make category a child of itself" }, { status: 400 });
    }

    await connectToDatabase();

    const updated = await Category.findOneAndUpdate(
      { id: Number(id) },
      { $set: { parent: Number(parent), menu_order: Number(index || 0) } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    try {
      const fs = await import("fs");
      const path = await import("path");
      const jsonPath = path.resolve(process.cwd(), "src/data/real-categories.json");
      if (fs.existsSync(jsonPath)) {
        const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        const idx = raw.findIndex((c: any) => c.id === Number(id));
        if (idx >= 0) {
          raw[idx].parent = Number(parent);
          fs.writeFileSync(jsonPath, JSON.stringify(raw, null, 2), "utf-8");
        }
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, category: updated });
  } catch (error) {
    console.error("Category relocate error:", error);
    return NextResponse.json({ error: "Failed to relocate category" }, { status: 500 });
  }
}
