import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { publishCatalogChange } from "@/lib/catalog-sync";
import { syncProductCategoryRefs } from "@/server/category-sync";
import { cleanCategoryInput } from "@/server/category-input";

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

    const oldCategory = await Category.findOne(query);
    if (!oldCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // If category image changed or was cleared, delete old Cloudinary image
    if (oldCategory.image?.src && oldCategory.image.src.includes("res.cloudinary.com")) {
      const newImgSrc = body.image?.src;
      if (!newImgSrc || newImgSrc !== oldCategory.image.src) {
        try {
          await deleteFromCloudinary(oldCategory.image.src);
        } catch (cloudErr) {
          console.warn("Failed to delete previous category image from Cloudinary:", cloudErr);
        }
      }
    }

    const input = cleanCategoryInput(body);
    if (input.linked_parents) {
      input.linked_parents = input.linked_parents.filter((pid) => pid !== oldCategory.id);
    }

    if (input.name === "") {
      return NextResponse.json({ error: "Category name cannot be empty." }, { status: 400 });
    }
    if (input.slug && input.slug !== oldCategory.slug && (await Category.exists({ slug: input.slug, id: { $ne: oldCategory.id } }))) {
      return NextResponse.json({ error: `The slug "${input.slug}" is already used by another category.` }, { status: 409 });
    }
    if (input.parent !== undefined && input.parent !== oldCategory.parent) {
      // A category can't be moved under itself or one of its own sub-categories.
      const all = await Category.find({}).select("id parent").lean();
      let cursor: number | undefined = input.parent;
      const seen = new Set<number>();
      while (cursor && !seen.has(cursor)) {
        if (cursor === oldCategory.id) {
          return NextResponse.json({ error: "A category cannot be placed inside itself or its own sub-category." }, { status: 400 });
        }
        seen.add(cursor);
        cursor = all.find((c) => c.id === cursor)?.parent;
      }
    }

    const updated = await Category.findOneAndUpdate(
      query,
      { $set: input },
      { new: true }
    );

    // Synchronize to src/data/real-categories.json
    try {
      const jsonPath = path.resolve(process.cwd(), "src/data/real-categories.json");
      if (fs.existsSync(jsonPath)) {
        const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        const idx = raw.findIndex((c: { id?: number; slug?: string }) => c.id === oldCategory.id || c.slug === oldCategory.slug);
        if (idx >= 0) {
          raw[idx] = {
            ...raw[idx],
            ...body,
            id: oldCategory.id,
            ...(input.linked_parents !== undefined ? { linked_parents: input.linked_parents } : {}),
          };
          fs.writeFileSync(jsonPath, JSON.stringify(raw, null, 2), "utf-8");
        }
      }
    } catch (syncErr) {
      console.warn("Failed to sync category update to real-categories.json:", syncErr);
    }

    const refIds = Array.from(new Set([
      oldCategory.id,
      ...(oldCategory.linked_parents || []),
      ...(input.linked_parents || []),
    ]));
    await syncProductCategoryRefs(refIds);
    await publishCatalogChange();

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Update category failed:", err);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export const PUT = PATCH;
