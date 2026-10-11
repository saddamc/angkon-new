import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { invalidateCategoriesCache } from "@/lib/db/categories";

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
        raw.forEach((cat: any) => {
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
    invalidateCategoriesCache();

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
