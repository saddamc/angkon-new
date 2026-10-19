import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { deleteFromCloudinary, deleteCloudinaryFolder } from "@/lib/cloudinary";
import { getAllDbCategoriesIncludingInactive } from "@/lib/db/categories";
import { Product } from "@/models/Product";
import { cleanCategoryInput, slugifyCategory } from "@/server/category-input";
import { publishCatalogChange } from "@/lib/catalog-sync";
import { removeCategoryRefs } from "@/server/category-sync";
import REAL_CATEGORIES from "@/data/real-categories.json";

export const dynamic = "force-dynamic";

function syncRealCategoriesFile(updater: (cats: Record<string, unknown>[]) => Record<string, unknown>[]) {
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
    const categories = await getAllDbCategoriesIncludingInactive();
    if (categories && categories.length > 0) {
      // Live product counts. `direct_count` = products listed in this category itself;
      // `count` = distinct products shown on its storefront page (itself + all sub-categories).
      const direct = new Map<number, number>();
      const subtree = new Map<number, Set<number>>();
      try {
        await connectToDatabase();
        const prods = await Product.find({}).select("id categories.id").lean();
        const parentOf = new Map<number, number>(categories.map((c) => [c.id, c.parent || 0]));
        const linkedParentsOf = new Map<number, number[]>(categories.map((c) => [c.id, Array.isArray(c.linked_parents) ? c.linked_parents : []]));
        for (const p of prods) {
          for (const ref of p.categories || []) {
            direct.set(ref.id, (direct.get(ref.id) ?? 0) + 1);
            // Walk up ancestors and cross-listed parents
            const queue: number[] = [ref.id];
            const seen = new Set<number>();
            while (queue.length > 0) {
              const cur = queue.shift()!;
              if (seen.has(cur)) continue;
              seen.add(cur);
              if (!subtree.has(cur)) subtree.set(cur, new Set());
              subtree.get(cur)!.add(p.id);

              const pId = parentOf.get(cur);
              if (pId && !seen.has(pId)) queue.push(pId);
              const lParents = linkedParentsOf.get(cur) || [];
              for (const lp of lParents) {
                if (lp && !seen.has(lp)) queue.push(lp);
              }
            }
          }
        }
      } catch (countErr) {
        console.warn("Category product counts unavailable:", countErr);
      }
      const withCounts = categories.map((c) => ({
        ...c,
        count: subtree.get(c.id)?.size ?? 0,
        direct_count: direct.get(c.id) ?? 0,
      }));
      return NextResponse.json(withCounts, {
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

    const input = cleanCategoryInput(body);
    const name = input.name || "Category";
    const rawSlug = input.slug || slugifyCategory(name) || "category";
    const baseSlug = rawSlug.replace(/^-+|-+$/g, "") || "category";

    // Unique slug: "kurti", "kurti-2", "kurti-3"...
    let slug = baseSlug;
    for (let n = 2; await Category.exists({ slug }); n++) {
      slug = `${baseSlug}-${n}`;
    }

    // Generate guaranteed unique numeric category ID
    let catId = Number(body.id);
    if (!catId || isNaN(catId) || (await Category.exists({ id: catId }))) {
      const highest = await Category.findOne({}).sort({ id: -1 }).select("id").lean();
      catId = (highest?.id ? Number(highest.id) : 1000) + 1;
    }
    // Strict uniqueness check against database to avoid duplicate key errors on id_1
    while (await Category.exists({ id: catId })) {
      catId++;
    }

    const imageObj =
      input.image && typeof input.image === "object" && input.image.src && typeof input.image.src === "string" && input.image.src.trim()
        ? {
            id: input.image.id && Number.isFinite(Number(input.image.id)) && Number(input.image.id) > 0 ? Number(input.image.id) : 300000 + catId,
            src: input.image.src.trim(),
            alt: input.image.alt?.trim() || name,
          }
        : null;

    const newCategory = await Category.create({
      id: catId,
      name,
      slug,
      description: input.description ?? "",
      parent: input.parent ?? 0,
      linked_parents: input.linked_parents ?? [],
      menu_order: input.menu_order ?? 0,
      count: 0,
      is_active: input.is_active ?? true,
      meta_data: input.meta_data ?? [],
      image: imageObj,
    });

    // Synchronize to real-categories.json (local development convenience; no-op on read-only hosts)
    try {
      syncRealCategoriesFile((cats) => {
        const catData = {
          id: catId,
          name,
          slug,
          parent: input.parent ?? 0,
          linked_parents: input.linked_parents ?? [],
          menu_order: input.menu_order ?? 0,
          description: input.description ?? "",
          count: 0,
          image: imageObj,
        };
        const existsIndex = cats.findIndex((c) => c.id === catId || c.slug === slug);
        if (existsIndex >= 0) cats[existsIndex] = catData;
        else cats.push(catData);
        return cats;
      });
    } catch (syncErr) {
      console.warn("Failed to sync category to real-categories.json:", syncErr);
    }

    try {
      await publishCatalogChange();
    } catch (pubErr) {
      console.warn("Failed to publish catalog change:", pubErr);
    }

    return NextResponse.json(newCategory, { status: 201 });
  } catch (err: any) {
    console.error("Create category failed:", err);
    const message = err?.message || "Failed to create category";
    return NextResponse.json(
      {
        error: message,
        details: err?.code === 11000 ? "A category with this ID or slug already exists." : String(err?.message || err),
      },
      { status: 500 }
    );
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

    // 4. Delete the categories from MongoDB (and drop them from products that still list them)
    await Category.deleteMany({ id: { $in: categoryIdsToDelete } });
    await removeCategoryRefs(categoryIdsToDelete);

    // 5. Synchronize local real-categories.json
    syncRealCategoriesFile((cats) =>
      cats.filter((c) => !categoryIdsToDelete.includes(Number(c.id)))
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

    await publishCatalogChange();

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
