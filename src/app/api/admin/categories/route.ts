import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { deleteFromCloudinary, deleteCloudinaryFolder } from "@/lib/cloudinary";
import { getDbCategories, invalidateCategoriesCache } from "@/lib/db/categories";
import REAL_CATEGORIES from "@/data/real-categories.json";

export const dynamic = "force-dynamic";

function syncRealCategoriesFile(updater: (cats: any[]) => any[]) {
  try {
    const jsonPath = path.resolve(process.cwd(), "src/data/real-categories.json");
    if (fs.existsSync(jsonPath)) {
      const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const updated = updater(raw);
      fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("Failed to sync src/data/real-categories.json:", err);
  }
}

export async function GET() {
  try {
    const categories = await getDbCategories();
    if (categories && categories.length > 0) {
      return NextResponse.json(categories, {
        headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=30" },
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

    const imageObj = body.image && body.image.src
      ? {
          id: body.image.id ? Number(body.image.id) : 300000 + catId,
          src: String(body.image.src),
          alt: String(body.image.alt || name),
        }
      : null;

    const menuOrder = Number(body.menu_order ?? body.sortOrder ?? 0);

    const newCategory = await Category.create({
      id: catId,
      name,
      slug,
      description: body.description ?? "",
      parent: Number(body.parent ?? 0),
      menu_order: menuOrder,
      count: Number(body.count ?? 0),
      image: imageObj,
    });

    // Synchronize to real-categories.json
    syncRealCategoriesFile((cats) => {
      const existsIndex = cats.findIndex((c) => c.id === catId || c.slug === slug);
      const catData = {
        id: catId,
        name,
        slug,
        parent: Number(body.parent ?? 0),
        menu_order: menuOrder,
        description: body.description ?? "",
        count: Number(body.count ?? 0),
        image: imageObj,
      };
      if (existsIndex >= 0) {
        cats[existsIndex] = catData;
      } else {
        cats.push(catData);
      }
      return cats;
    });

    invalidateCategoriesCache();

    return NextResponse.json(newCategory, { status: 201 });
  } catch (err) {
    console.error("Create category failed:", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const urlParams = new URL(request.url);
  const id = urlParams.searchParams.get("id");
  const deleteProducts = urlParams.searchParams.get("delete_products") === "true";
  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

  try {
    await connectToDatabase();
    const numericId = parseInt(id, 10);
    const query = isNaN(numericId) ? { slug: id } : { id: numericId };

    const targetCategory = await Category.findOne(query);
    if (!targetCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // 1. Collect target category and all descendant subcategories
    const allCategories = await Category.find({}).lean();
    const targetId = targetCategory.id;

    function getDescendantIds(parentId: number): number[] {
      const children = allCategories.filter((c) => c.parent === parentId);
      let ids: number[] = [];
      for (const child of children) {
        ids.push(child.id);
        ids = ids.concat(getDescendantIds(child.id));
      }
      return ids;
    }

    const categoryIdsToDelete = [targetId, ...getDescendantIds(targetId)];
    const categoriesToDelete = allCategories.filter((c) => categoryIdsToDelete.includes(c.id));

    // 2. Remove Category & Subcategory Images from Cloudinary
    for (const cat of categoriesToDelete) {
      if (cat.image?.src && cat.image.src.includes("res.cloudinary.com")) {
        try {
          await deleteFromCloudinary(cat.image.src);
        } catch (cloudErr) {
          console.warn(`Failed to delete Cloudinary image for category "${cat.name}":`, cloudErr);
        }
      }
    }

    // 3. If delete_products=true, delete products and their Cloudinary images
    let deletedProductsCount = 0;
    if (deleteProducts) {
      try {
        const Product = (await import("@/models/Product")).default;
        const productsToDelete = await Product.find({
          $or: [
            { "categories.id": { $in: categoryIdsToDelete } },
            { "categories.slug": { $in: categoriesToDelete.map((c) => c.slug) } },
          ],
        });

        for (const prod of productsToDelete) {
          if (Array.isArray(prod.images)) {
            for (const img of prod.images) {
              if (img?.src && img.src.includes("res.cloudinary.com")) {
                try {
                  await deleteFromCloudinary(img.src);
                } catch (prodImgErr) {
                  console.warn(`Failed to delete Cloudinary image for product "${prod.name}":`, prodImgErr);
                }
              }
            }
          }
        }

        const prodDelRes = await Product.deleteMany({
          _id: { $in: productsToDelete.map((p) => p._id) },
        });
        deletedProductsCount = prodDelRes.deletedCount || 0;
      } catch (prodErr) {
        console.warn("Failed to delete products associated with category:", prodErr);
      }
    }

    // 4. Delete the categories from MongoDB
    await Category.deleteMany({ id: { $in: categoryIdsToDelete } });

    // 5. Synchronize local real-categories.json
    syncRealCategoriesFile((cats) =>
      cats.filter((c) => !categoryIdsToDelete.includes(c.id))
    );

    // 6. Attempt cleaning category Cloudinary folder
    const folderSlug = (targetCategory.slug || targetCategory.name)
      .toUpperCase()
      .replace(/[^A-Z0-9_\s-]/g, "")
      .replace(/[\s-]+/g, "_");
    try {
      await deleteCloudinaryFolder(`ANGKON/CATEGORIES/${folderSlug}`);
    } catch {
      // ignore folder deletion if already empty or not a folder
    }

    invalidateCategoriesCache();

    return NextResponse.json(
      {
        message: "Category and all associated images deleted successfully",
        deletedCategories: categoryIdsToDelete.length,
        deletedProducts: deletedProductsCount,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Delete category failed:", err);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
