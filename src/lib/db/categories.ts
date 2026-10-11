import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import type { WooCategory } from "@/types/product";
import REAL_CATEGORIES from "@/data/real-categories.json";

export async function getDbCategories(): Promise<WooCategory[]> {
  try {
    await connectToDatabase();
    const categories = await Category.find({})
      .sort({ parent: 1, name: 1 })
      .lean();

    if (categories && categories.length > 0) {
      return categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent: c.parent ?? 0,
        description: c.description ?? "",
        count: c.count ?? 0,
        image: c.image ? { id: c.image.id, src: c.image.src, alt: c.image.alt } : null,
      })) as WooCategory[];
    }
  } catch (error) {
    console.warn("MongoDB categories query failed, falling back to cached catalog:", error);
  }

  return REAL_CATEGORIES as unknown as WooCategory[];
}

export async function getDbCategoryBySlug(slug: string): Promise<WooCategory | null> {
  try {
    await connectToDatabase();
    const cat = await Category.findOne({
      slug: { $regex: new RegExp(`^${slug}$`, "i") },
    }).lean();

    if (cat) {
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parent: cat.parent ?? 0,
        description: cat.description ?? "",
        count: cat.count ?? 0,
        image: cat.image ? { id: cat.image.id, src: cat.image.src, alt: cat.image.alt } : null,
      } as WooCategory;
    }
  } catch (error) {
    console.warn("MongoDB category by slug failed, using fallback:", error);
  }

  const fallback = (REAL_CATEGORIES as unknown as WooCategory[]).find(
    (c) => c.slug.toLowerCase() === slug.toLowerCase()
  );
  return fallback ?? null;
}
