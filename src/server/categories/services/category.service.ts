import fs from "fs";
import path from "path";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import {
  deleteFromCloudinary,
  deleteCloudinaryFolder,
  deleteProductCloudinaryFolder,
  extractProductFolderFromUrl,
  createCloudinaryFolder,
  buildCategoryFolderPath,
} from "@/lib/cloudinary";
import { isCloudinaryUrl } from "@/lib/cloudinary-delivery";
import { getAllDbCategoriesIncludingInactive, invalidateCategoriesCache } from "@/lib/db/categories";
import { cleanCategoryInput, slugifyCategory } from "../category-input";
import { publishCatalogChange } from "@/lib/catalog-sync";
import { removeCategoryRefs } from "../category-sync";

export { slugifyCategory };

export function syncRealCategoriesFile(updater: (cats: Record<string, unknown>[]) => Record<string, unknown>[]) {
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

export async function getAdminCategories() {
  let categories: any[] = [];
  try {
    const dbCats = await Category.find({})
      .sort({ parent: 1, menu_order: 1, name: 1 })
      .lean();

    if (dbCats && dbCats.length > 0) {
      categories = dbCats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent: c.parent ?? 0,
        linked_parents: Array.isArray(c.linked_parents) ? c.linked_parents : [],
        menu_order: c.menu_order ?? 0,
        description: c.description ?? "",
        count: c.count ?? 0,
        is_active: c.is_active !== false,
        meta_data: Array.isArray(c.meta_data) ? c.meta_data.map((m: any) => ({ key: m.key, value: m.value })) : [],
        image: c.image ? { id: c.image.id, src: c.image.src, alt: c.image.alt } : null,
      }));
    }
  } catch (dbErr) {
    console.warn("Direct MongoDB categories fetch error, checking cache helper:", dbErr);
  }

  if (!categories || categories.length === 0) {
    categories = (await getAllDbCategoriesIncludingInactive()) || [];
  }

  if (categories && categories.length > 0) {
    const direct = new Map<number, number>();
    const subtree = new Map<number, Set<number>>();
    try {
      const prods = await Product.find({}).select("id categories.id").lean();
      const parentOf = new Map<number, number>(categories.map((c) => [c.id, c.parent || 0]));
      const linkedParentsOf = new Map<number, number[]>(categories.map((c) => [c.id, Array.isArray(c.linked_parents) ? c.linked_parents : []]));
      for (const p of prods) {
        for (const ref of p.categories || []) {
          direct.set(ref.id, (direct.get(ref.id) ?? 0) + 1);
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
      console.warn("Product count error:", countErr);
    }

    return categories.map((c) => ({
      ...c,
      direct_count: direct.get(c.id) ?? 0,
      count: subtree.get(c.id)?.size ?? direct.get(c.id) ?? 0,
    }));
  }

  return categories;
}

export async function createAdminCategory(body: any) {
  const cleaned = cleanCategoryInput(body);
  const name = cleaned.name || "Category";

  let baseSlug = cleaned.slug ? slugifyCategory(cleaned.slug) : slugifyCategory(name);
  if (!baseSlug) baseSlug = `category-${Date.now()}`;

  let slug = baseSlug;
  for (let n = 2; await Category.exists({ slug }); n++) {
    slug = `${baseSlug}-${n}`;
  }

  let newId = Number(body.id);
  if (!newId || isNaN(newId)) {
    const highest = await Category.findOne({}).sort({ id: -1 }).select("id").lean();
    newId = (highest?.id || 100) + 1;
  }

  const categoryDoc = await Category.create({
    id: newId,
    name,
    slug,
    parent: cleaned.parent || 0,
    linked_parents: cleaned.linked_parents || [],
    description: cleaned.description || "",
    menu_order: cleaned.menu_order ?? 0,
    count: 0,
    is_active: cleaned.is_active !== false,
    meta_data: cleaned.meta_data || [],
    image: cleaned.image || null,
  });

  try {
    const folderPath = buildCategoryFolderPath({ category: slug });
    await createCloudinaryFolder(folderPath);
  } catch (cloudErr) {
    console.warn("Could not create Cloudinary folder for category:", cloudErr);
  }

  syncRealCategoriesFile((cats) => {
    return [
      ...cats,
      {
        id: newId,
        name,
        slug,
        parent: cleaned.parent || 0,
        linked_parents: cleaned.linked_parents || [],
        description: cleaned.description || "",
        menu_order: cleaned.menu_order ?? 0,
        count: 0,
        is_active: cleaned.is_active !== false,
        image: cleaned.image || null,
      },
    ];
  });

  invalidateCategoriesCache();
  await publishCatalogChange();

  return categoryDoc;
}

export async function deleteAdminCategoryHierarchy(id: number, deleteProducts = false) {
  const targetCategory = await Category.findOne({ id }).lean();
  if (!targetCategory) return null;

  const allCategories = await Category.find({}).lean();
  const categoryIdsToDelete = [id];

  const findSubcategories = (parentId: number) => {
    const subcats = allCategories.filter((c) => c.parent === parentId);
    for (const sub of subcats) {
      categoryIdsToDelete.push(sub.id);
      findSubcategories(sub.id);
    }
  };
  findSubcategories(id);

  const categoriesToDelete = allCategories.filter((c) => categoryIdsToDelete.includes(c.id));

  for (const cat of categoriesToDelete) {
    if (cat.image?.src && isCloudinaryUrl(cat.image.src, process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN)) {
      try {
        await deleteFromCloudinary(cat.image.src);
      } catch (cloudErr) {
        console.warn(`Failed to delete Cloudinary image for category "${cat.name}":`, cloudErr);
      }
    }
  }

  let deletedProductsCount = 0;
  if (deleteProducts) {
    try {
      const productsToDelete = await Product.find({
        $or: [
          { "categories.id": { $in: categoryIdsToDelete } },
          { "categories.slug": { $in: categoriesToDelete.map((c) => c.slug) } },
        ],
      });

      const deletedProductIds = productsToDelete.map((p) => p._id);
      const candidateFolders = new Set<string>();
      const imageSrcs: string[] = [];

      for (const prod of productsToDelete) {
        const productIdentifiers = [
          prod.slug,
          prod.sku,
          prod.name,
          String(prod.id),
        ].filter(Boolean) as string[];

        if (Array.isArray(prod.images)) {
          for (const img of prod.images) {
            const src = typeof img === "string" ? img : img?.src;
            if (src && typeof src === "string" && isCloudinaryUrl(src, process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN)) {
              imageSrcs.push(src);
              const folder = extractProductFolderFromUrl(src, productIdentifiers);
              if (folder) candidateFolders.add(folder);
            }
          }
        }
      }

      const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const deletedFolders = new Set<string>();

      for (const folder of candidateFolders) {
        try {
          const isFolderUsedElsewhere = await Product.exists({
            _id: { $nin: deletedProductIds },
            "images.src": new RegExp(escapeRegex(folder)),
          });
          if (!isFolderUsedElsewhere) {
            await deleteProductCloudinaryFolder(folder);
            deletedFolders.add(folder);
          }
        } catch (fErr) {
          console.warn(`Failed to delete product Cloudinary folder "${folder}":`, fErr);
        }
      }

      for (const src of imageSrcs) {
        const wasFolderDeleted = Array.from(deletedFolders).some((f) => src.includes(f));
        if (!wasFolderDeleted) {
          try {
            const isUsedElsewhere = await Product.exists({
              _id: { $nin: deletedProductIds },
              "images.src": src,
            });
            if (!isUsedElsewhere) {
              await deleteFromCloudinary(src);
            }
          } catch (prodImgErr) {
            console.warn(`Failed to delete Cloudinary image:`, prodImgErr);
          }
        }
      }

      const prodDelRes = await Product.deleteMany({
        _id: { $in: deletedProductIds },
      });
      deletedProductsCount = prodDelRes.deletedCount || 0;
    } catch (prodErr) {
      console.warn("Failed to delete products associated with category:", prodErr);
    }
  }

  await Category.deleteMany({ id: { $in: categoryIdsToDelete } });
  await removeCategoryRefs(categoryIdsToDelete);

  syncRealCategoriesFile((cats) =>
    cats.filter((c) => !categoryIdsToDelete.includes(Number(c.id)))
  );

  const folderSlug = (targetCategory.slug || targetCategory.name)
    .toUpperCase()
    .replace(/[^A-Z0-9_\s-]/g, "")
    .replace(/[\s-]+/g, "_");
  try {
    await deleteCloudinaryFolder(`ANGKON/CATEGORIES/${folderSlug}`);
  } catch {
    // ignore
  }

  invalidateCategoriesCache();
  await publishCatalogChange();

  return {
    deletedCategoriesCount: categoryIdsToDelete.length,
    deletedProductsCount,
  };
}
