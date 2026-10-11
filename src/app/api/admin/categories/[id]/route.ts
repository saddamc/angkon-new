import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { invalidateCategoriesCache } from "@/lib/db/categories";

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

    const updated = await Category.findOneAndUpdate(
      query,
      { $set: body },
      { new: true }
    );

    // Synchronize to src/data/real-categories.json
    try {
      const jsonPath = path.resolve(process.cwd(), "src/data/real-categories.json");
      if (fs.existsSync(jsonPath)) {
        const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        const idx = raw.findIndex((c: any) => c.id === oldCategory.id || c.slug === oldCategory.slug);
        if (idx >= 0) {
          raw[idx] = {
            ...raw[idx],
            ...body,
            id: oldCategory.id,
          };
          fs.writeFileSync(jsonPath, JSON.stringify(raw, null, 2), "utf-8");
        }
      }
    } catch (syncErr) {
      console.warn("Failed to sync category update to real-categories.json:", syncErr);
    }

    invalidateCategoriesCache();

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Update category failed:", err);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export const PUT = PATCH;
