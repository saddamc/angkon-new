import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { publishCatalogChange } from "@/lib/catalog-sync";
import { syncProductCategoryRefs } from "@/server/category-sync";

export const dynamic = "force-dynamic";

interface ReorderItem {
  id: number;
  menu_order: number;
  parent?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: ReorderItem[] = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body)
      ? body
      : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "No items provided for reordering" }, { status: 400 });
    }

    await connectToDatabase();

    // Refuse any change that would create a loop (a category inside itself or its own descendant).
    const existing = await Category.find({}).select("id parent").lean();
    const parentOf = new Map<number, number>(existing.map((c) => [c.id, c.parent || 0]));
    for (const it of items) {
      if (it.parent !== undefined) parentOf.set(Number(it.id), Number(it.parent) || 0);
    }
    for (const it of items) {
      if (it.parent === undefined) continue;
      let cursor = Number(it.parent) || 0;
      const seen = new Set<number>([Number(it.id)]);
      while (cursor) {
        if (seen.has(cursor)) {
          return NextResponse.json({ error: "A category cannot be placed inside itself or its own sub-category." }, { status: 400 });
        }
        seen.add(cursor);
        cursor = parentOf.get(cursor) || 0;
      }
    }

    // 1. Bulk write to MongoDB for instant atomic update
    const bulkOps = items.map((item) => {
      const updateFields: Record<string, unknown> = {
        menu_order: Number(item.menu_order),
      };
      if (item.parent !== undefined) {
        updateFields.parent = Number(item.parent);
      }
      return {
        updateOne: {
          filter: { id: Number(item.id) },
          update: { $set: updateFields },
        },
      };
    });

    await Category.bulkWrite(bulkOps);

    // 2. Synchronize src/data/real-categories.json
    try {
      const jsonPath = path.resolve(process.cwd(), "src/data/real-categories.json");
      if (fs.existsSync(jsonPath)) {
        const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        const orderMap = new Map<number, ReorderItem>();
        items.forEach((it) => orderMap.set(Number(it.id), it));

        let updated = false;
        raw.forEach((cat: { id?: number; menu_order?: number; parent?: number }) => {
          const match = orderMap.get(Number(cat.id));
          if (match) {
            cat.menu_order = match.menu_order;
            if (match.parent !== undefined) cat.parent = match.parent;
            updated = true;
          }
        });

        if (updated) {
          fs.writeFileSync(jsonPath, JSON.stringify(raw, null, 2), "utf-8");
        }
      }
    } catch (err) {
      console.warn("Failed to update real-categories.json in bulk reorder:", err);
    }

    // 3. Clear memory cache
    await syncProductCategoryRefs(items.map((i: { id: number }) => Number(i.id)));
    await publishCatalogChange();

    return NextResponse.json(
      {
        success: true,
        message: `Successfully reordered ${items.length} categories`,
        count: items.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Bulk reorder categories error:", error);
    return NextResponse.json({ error: "Failed to reorder categories" }, { status: 500 });
  }
}
