import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { publishCatalogChange } from "@/lib/catalog-sync";
import {
  syncCloudinaryAssetFoldersForCategories,
  syncProductCategoryRefs,
} from "@/server/categories/category-sync";
import { invalidateCategoriesCache } from "@/lib/db/categories";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) return auth.response;

  try {
    const { id, parent, index } = await request.json();

    if (!id || parent === undefined) {
      return NextResponse.json({ error: "id and parent are required" }, { status: 400 });
    }

    const numId = Number(id);
    const numParent = Number(parent);

    if (numId === numParent) {
      return NextResponse.json({ error: "Cannot make category a child of itself" }, { status: 400 });
    }

    await connectToDatabase();

    // Prevent circular hierarchy
    if (numParent !== 0) {
      const allCategories = await Category.find({}).select("id parent").lean();
      const parentMap = new Map<number, number>(allCategories.map((c) => [c.id, c.parent || 0]));
      let cursor = numParent;
      const seen = new Set<number>();
      while (cursor && cursor !== 0) {
        if (cursor === numId) {
          return NextResponse.json(
            { error: "A category cannot be placed inside itself or its own sub-category." },
            { status: 400 }
          );
        }
        if (seen.has(cursor)) break;
        seen.add(cursor);
        cursor = parentMap.get(cursor) || 0;
      }
    }

    const existingCat = await Category.findOne({ id: numId }).select("id parent slug").lean();
    if (!existingCat) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const updated = await Category.findOneAndUpdate(
      { id: numId },
      {
        $set: { parent: numParent, menu_order: Number(index || 0) },
        $pull: { linked_parents: { $in: [numParent, 0, numId] } },
      },
      { returnDocument: "after" }
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
        const idx = raw.findIndex((c: { id?: number }) => c.id === numId);
        if (idx >= 0) {
          raw[idx].parent = numParent;
          raw[idx].menu_order = Number(index || 0);
          if (Array.isArray(raw[idx].linked_parents)) {
            raw[idx].linked_parents = raw[idx].linked_parents.filter(
              (pid: number) => pid !== numParent && pid !== 0 && pid !== numId
            );
          }
          fs.writeFileSync(jsonPath, JSON.stringify(raw, null, 2), "utf-8");
        }
      }
    } catch {
      // ignore
    }

    // Update category metadata snapshots in MongoDB and reconcile Cloudinary Media Library folders (`asset_folder`) without altering URLs
    await syncProductCategoryRefs([numId]);
    const previousParentById = new Map<number, number>();
    if (Number(existingCat.parent || 0) !== numParent) {
      previousParentById.set(numId, Number(existingCat.parent || 0));
    }
    const cloudinarySync = await syncCloudinaryAssetFoldersForCategories([numId], {
      previousParentById,
    });
    invalidateCategoriesCache();
    await publishCatalogChange();

    return NextResponse.json({ ok: true, category: updated, cloudinarySync });
  } catch (error) {
    console.error("Category relocate error:", error);
    return NextResponse.json({ error: "Failed to relocate category" }, { status: 500 });
  }
}
