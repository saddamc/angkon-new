import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { invalidateProductsCache } from "@/lib/db/products";
import REAL_PRODUCTS from "@/data/real-products.json";
import REAL_CATEGORIES from "@/data/real-categories.json";

// GET /api/admin/products/[id] — single product by numeric ID or slug from MongoDB (with fallback)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const decoded = decodeURIComponent(id);
    const numericId = parseInt(decoded, 10);
    await connectToDatabase();

    const query = !isNaN(numericId) && /^\d+$/.test(decoded) ? { id: numericId } : { slug: decoded };
    let product = await Product.findOne(query).lean();

    // Fallback to local catalog if not yet stored in MongoDB
    if (!product) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const local = (REAL_PRODUCTS as any[]).find(
        (p) => (!isNaN(numericId) && p.id === numericId) || p.slug === decoded
      );
      if (local) {
        product = local;
      }
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product, {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("GET product failed:", error);
    // Even if database has a connection issue, serve from local catalog fallback
    try {
      const { id } = await params;
      const decoded = decodeURIComponent(id);
      const numericId = parseInt(decoded, 10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const local = (REAL_PRODUCTS as any[]).find(
        (p) => (!isNaN(numericId) && p.id === numericId) || p.slug === decoded
      );
      if (local) {
        return NextResponse.json(local, { status: 200 });
      }
    } catch {
      /* ignore */
    }
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

// PUT /api/admin/products/[id] — update product in MongoDB Atlas
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const decoded = decodeURIComponent(id);
    const numericId = parseInt(decoded, 10);
    const body = await request.json();
    await connectToDatabase();

    const query = !isNaN(numericId) && /^\d+$/.test(decoded) ? { id: numericId } : { slug: decoded };

    const regularPrice = body.regular_price ? String(body.regular_price) : "";
    const salePrice = body.sale_price ? String(body.sale_price) : "";
    body.regular_price = regularPrice;
    body.sale_price = salePrice;
    body.price = String(body.price || salePrice || regularPrice || "0");
    if (body.buy_price !== undefined) {
      body.buy_price = String(body.buy_price);
    }
    if (body.sizes && Array.isArray(body.sizes)) {
      body.sizes = body.sizes;
    }

    // Resolve categories so name, slug, and parent are always complete
    if (Array.isArray(body.categories) && body.categories.length > 0) {
      body.categories = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body.categories.map(async (c: any) => {
          if (c.name && c.slug) return c;
          const found = await Category.findOne({ id: c.id }).lean();
          if (found) {
            return { id: found.id, name: found.name, slug: found.slug, parent: found.parent || 0 };
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fromLocal = (REAL_CATEGORIES as any[]).find((rc) => rc.id === c.id);
          if (fromLocal) {
            return { id: fromLocal.id, name: fromLocal.name, slug: fromLocal.slug, parent: fromLocal.parent || 0 };
          }
          return { id: c.id, name: c.name || "Category", slug: c.slug || "category", parent: c.parent || 0 };
        })
      );
    }

    let updated = await Product.findOneAndUpdate(
      query,
      { $set: body },
      { new: true }
    );

    // If product wasn't in MongoDB yet (it was in static REAL_PRODUCTS), create it now!
    if (!updated) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const local = (REAL_PRODUCTS as any[]).find(
        (p) => (!isNaN(numericId) && p.id === numericId) || p.slug === decoded
      );
      if (local) {
        updated = await Product.create({
          ...local,
          ...body,
          id: local.id,
          slug: body.slug || local.slug,
        });
      }
    }

    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    invalidateProductsCache();
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Update product failed:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id] — delete product from MongoDB Atlas
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    await connectToDatabase();

    const query = isNaN(numericId) ? { slug: id } : { id: numericId };
    const product = await Product.findOneAndDelete(query);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    invalidateProductsCache();

    // Clean up Cloudinary images if present
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        const src = typeof img === "string" ? img : img?.src;
        if (src && src.includes("res.cloudinary.com")) {
          try {
            await deleteFromCloudinary(src);
          } catch (e) {
            console.warn("Cloudinary cleanup error on product deletion:", e);
          }
        }
      }
    }

    return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete product failed:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
