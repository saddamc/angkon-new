import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { invalidateProductsCache } from "@/lib/db/products";
import REAL_PRODUCTS from "@/data/real-products.json";
import REAL_CATEGORIES from "@/data/real-categories.json";

// GET /api/admin/products — list all products from MongoDB Atlas
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);
  const search = searchParams.get("search") ?? "";

  try {
    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * perPage;

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .select("-description -short_description")
        .sort({ id: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / perPage) || 1;

    return NextResponse.json(
      { products, total, totalPages },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    console.warn("MongoDB admin products query warning, using local catalog fallback:", err);

    // Instant local catalog response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let list = [...(REAL_PRODUCTS as any[])];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q));
    }
    const total = list.length;
    const totalPages = Math.ceil(total / perPage);
    const paginated = list.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json(
      { products: paginated, total, totalPages },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}

// POST /api/admin/products — create product in MongoDB Atlas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await connectToDatabase();

    // Generate unique ID if not provided
    let productId = Number(body.id);
    if (!productId || isNaN(productId)) {
      const highest = await Product.findOne({}).sort({ id: -1 }).select("id").lean();
      productId = (highest?.id || 228000) + 1;
    }

    // Generate slug if not provided
    const name = String(body.name || "Product").trim();
    const slug =
      body.slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Resolve categories so name, slug, and parent are always populated
    let resolvedCategories = body.categories || [];
    if (Array.isArray(resolvedCategories) && resolvedCategories.length > 0) {
      resolvedCategories = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolvedCategories.map(async (c: any) => {
          if (c.name && c.slug) return c;
          const found = await Category.findOne({ id: c.id }).lean();
          if (found) {
            return { id: found.id, name: found.name, slug: found.slug, parent: found.parent || 0 };
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fromLocal = REAL_CATEGORIES.find((rc: any) => rc.id === c.id);
          if (fromLocal) {
            return { id: fromLocal.id, name: fromLocal.name, slug: fromLocal.slug, parent: fromLocal.parent || 0 };
          }
          return { id: c.id, name: c.name || "Category", slug: c.slug || "category", parent: c.parent || 0 };
        })
      );
    }

    const regularPrice = body.regular_price ? String(body.regular_price) : "";
    const salePrice = body.sale_price ? String(body.sale_price) : "";
    const buyPrice = body.buy_price ? String(body.buy_price) : "";
    const price = String(body.price || salePrice || regularPrice || "0");

    const newProduct = await Product.create({
      ...body,
      id: productId,
      name,
      slug,
      categories: resolvedCategories,
      price,
      regular_price: regularPrice,
      sale_price: salePrice,
      buy_price: buyPrice,
      on_sale: Boolean(body.on_sale || (salePrice && parseFloat(salePrice) < parseFloat(regularPrice))),
      stock_status: body.stock_status || "instock",
      manage_stock: Boolean(body.manage_stock),
      sizes: Array.isArray(body.sizes) ? body.sizes : [],
    });

    invalidateProductsCache();
    return NextResponse.json(newProduct, { status: 201 });
  } catch (err) {
    console.error("Create product failed:", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
