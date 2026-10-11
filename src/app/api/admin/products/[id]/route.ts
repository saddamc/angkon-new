import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { deleteFromCloudinary } from "@/lib/cloudinary";

// GET /api/admin/products/[id] — single product by numeric ID or slug from MongoDB
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
    const product = await Product.findOne(query).lean();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product, {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("GET product failed:", error);
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
    const numericId = parseInt(id, 10);
    const body = await request.json();
    await connectToDatabase();

    const query = isNaN(numericId) ? { slug: id } : { id: numericId };

    if (body.price) body.price = String(body.price);
    if (body.regular_price) body.regular_price = String(body.regular_price);
    if (body.sale_price) body.sale_price = String(body.sale_price);

    const updated = await Product.findOneAndUpdate(
      query,
      { $set: body },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

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
