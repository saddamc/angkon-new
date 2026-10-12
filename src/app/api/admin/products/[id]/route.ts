import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { publishCatalogChange } from "@/lib/catalog-sync";

import REAL_PRODUCTS from "@/data/real-products.json";
import REAL_CATEGORIES from "@/data/real-categories.json";
import { resolveProductCategories } from "@/server/category-sync";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localCategory = (id: number) => (REAL_CATEGORIES as any[]).find((rc) => rc.id === id);

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
    const hasSalePrice = Boolean(
      salePrice && parseFloat(salePrice) > 0 && parseFloat(salePrice) < parseFloat(regularPrice || "99999999")
    );
    body.on_sale = Boolean(body.on_sale !== undefined ? body.on_sale : hasSalePrice);
    body.updatedAt = new Date();

    if (body.buy_price !== undefined) {
      body.buy_price = String(body.buy_price);
    }
    if (body.sizes && Array.isArray(body.sizes)) {
      body.sizes = body.sizes;
    }

    if (body.stock_quantity !== undefined) {
      if (body.stock_quantity === null || body.stock_quantity === "" || isNaN(Number(body.stock_quantity))) {
        body.stock_quantity = null;
      } else {
        body.stock_quantity = Number(body.stock_quantity);
        if (body.manage_stock === undefined) {
          body.manage_stock = true;
        }
      }
    }
    if (body.manage_stock !== undefined) {
      body.manage_stock = Boolean(body.manage_stock);
    }
    if (body.manage_stock && body.stock_quantity === 0 && (!body.stock_status || body.stock_status === "instock")) {
      body.stock_status = "outofstock";
    }

    // Categories are re-read from the categories collection so name / slug / parent are always
    // correct and de-duplicated (an empty list clears the product's categories).
    if (Array.isArray(body.categories)) {
      body.categories = await resolveProductCategories(body.categories, localCategory);
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

    await publishCatalogChange();
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

    await publishCatalogChange();

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
