import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import type { WooProduct, WooCategory } from "@/types/product";
import REAL_PRODUCTS from "@/data/real-products.json";
import REAL_CATEGORIES from "@/data/real-categories.json";

export interface DbProductQuery {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
  onSale?: boolean;
  orderby?: "date" | "price" | "popularity" | "title";
  order?: "asc" | "desc";
}

// Convert Mongoose Product doc or lean object into typed WooProduct
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toWooProduct(doc: any): WooProduct {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    permalink: doc.permalink || "",
    description: doc.description || "",
    short_description: doc.short_description || "",
    price: doc.price || "0",
    regular_price: doc.regular_price || "",
    sale_price: doc.sale_price || "",
    on_sale: Boolean(doc.on_sale),
    stock_status: doc.stock_status || "instock",
    sizes: Array.isArray(doc.sizes) ? doc.sizes : [],
    images: Array.isArray(doc.images)
      ? doc.images.map((img: { id?: number; src: string; name?: string; alt?: string }) => ({
          id: img.id || 0,
          src: img.src,
          name: img.name || "",
          alt: img.alt || doc.name || "",
        }))
      : [],
    categories: Array.isArray(doc.categories)
      ? doc.categories.map((c: { id: number; name: string; slug: string; parent?: number }) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parent: c.parent || 0,
        }))
      : [],
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    attributes: Array.isArray(doc.attributes) ? doc.attributes : [],
    sku: doc.sku || undefined,
    weight: doc.weight || undefined,
    shipping_class_id: doc.shipping_class_id || 0,
    stock_quantity: doc.stock_quantity ?? null,
    meta_data: Array.isArray(doc.meta_data) ? doc.meta_data : [],
  };
}

export async function getDbProducts(query: DbProductQuery = {}): Promise<WooProduct[]> {
  const { page = 1, perPage = 12, search, category, onSale } = query;

  try {
    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (onSale) {
      filter.on_sale = true;
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    if (category) {
      // Find category and its descendants using in-memory cached category tree
      const { getDbCategories, getDbCategoryBySlug } = await import("@/lib/db/categories");
      const matchedCat = await getDbCategoryBySlug(category);

      if (matchedCat) {
        const allCats = await getDbCategories();
        const descendantIds = new Set<number>([matchedCat.id]);

        let added = true;
        while (added) {
          added = false;
          for (const c of allCats) {
            if (c.parent && descendantIds.has(c.parent) && !descendantIds.has(c.id)) {
              descendantIds.add(c.id);
              added = true;
            }
          }
        }

        const catSlugRegex = new RegExp(`^${category}$`, "i");
        filter.$or = [
          { "categories.id": { $in: Array.from(descendantIds) } },
          { "categories.slug": catSlugRegex },
        ];
      } else {
        filter["categories.slug"] = new RegExp(`^${category}$`, "i");
      }
    }

    const skip = (page - 1) * perPage;
    const docs = await Product.find(filter)
      .sort({ id: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();

    if (docs && docs.length > 0) {
      return docs.map(toWooProduct);
    }
  } catch (error) {
    console.warn("MongoDB products query failed, using static catalog fallback:", error);
  }

  // Static fallback if MongoDB is unreachable or empty
  let list = (REAL_PRODUCTS as unknown as WooProduct[]);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  if (category) {
    const catLower = category.toLowerCase();
    list = list.filter((p) =>
      p.categories.some((c) => c.slug.toLowerCase() === catLower || c.name.toLowerCase() === catLower)
    );
  }
  if (onSale) {
    list = list.filter((p) => p.on_sale);
  }
  return list.slice((page - 1) * perPage, page * perPage);
}

export async function getDbProductBySlug(slug: string): Promise<WooProduct | null> {
  try {
    await connectToDatabase();
    const doc = await Product.findOne({
      slug: { $regex: new RegExp(`^${slug}$`, "i") },
    }).lean();

    if (doc) {
      return toWooProduct(doc);
    }
  } catch (error) {
    console.warn("MongoDB product by slug query failed, using fallback:", error);
  }

  const fallback = (REAL_PRODUCTS as unknown as WooProduct[]).find(
    (p) => p.slug.toLowerCase() === slug.toLowerCase()
  );
  return fallback ?? null;
}

export async function getDbProductsByCategorySlug(
  slug: string,
  query: DbProductQuery = {}
): Promise<{ products: WooProduct[]; total: number; totalPages: number; category: WooCategory | null }> {
  const { page = 1, perPage = 24, orderby = "date", order = "desc" } = query;

  try {
    await connectToDatabase();

    const { getDbCategories, getDbCategoryBySlug } = await import("@/lib/db/categories");
    const category = await getDbCategoryBySlug(slug);

    if (!category) {
      return { products: [], total: 0, totalPages: 0, category: null };
    }

    // Collect all descendant category IDs from in-memory cache
    const allCats = await getDbCategories();
    const descendantIds = new Set<number>([category.id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of allCats) {
        if (c.parent && descendantIds.has(c.parent) && !descendantIds.has(c.id)) {
          descendantIds.add(c.id);
          added = true;
        }
      }
    }

    const catSlugRegex = new RegExp(`^${slug}$`, "i");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      $or: [
        { "categories.id": { $in: Array.from(descendantIds) } },
        { "categories.slug": catSlugRegex },
      ],
    };

    // Sort definition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sortObj: Record<string, any> = { id: order === "asc" ? 1 : -1 };
    if (orderby === "price") {
      sortObj = { price: order === "asc" ? 1 : -1 };
    } else if (orderby === "title") {
      sortObj = { name: order === "asc" ? 1 : -1 };
    } else if (orderby === "date") {
      sortObj = { createdAt: order === "asc" ? 1 : -1, id: order === "asc" ? 1 : -1 };
    }

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / perPage);
    const skip = (page - 1) * perPage;

    const docs = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(perPage)
      .lean();

    return {
      products: docs.map(toWooProduct),
      total,
      totalPages,
      category,
    };
  } catch (error) {
    console.warn("MongoDB getDbProductsByCategorySlug failed, falling back:", error);
  }

  // Fallback
  const fallbackCat = (REAL_CATEGORIES as unknown as WooCategory[]).find(
    (c) => c.slug.toLowerCase() === slug.toLowerCase()
  );
  if (!fallbackCat) return { products: [], total: 0, totalPages: 0, category: null };

  const filtered = (REAL_PRODUCTS as unknown as WooProduct[]).filter((p) =>
    p.categories.some((c) => c.slug.toLowerCase() === slug.toLowerCase() || c.id === fallbackCat.id)
  );
  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return {
    products: paginated,
    total,
    totalPages,
    category: fallbackCat,
  };
}
