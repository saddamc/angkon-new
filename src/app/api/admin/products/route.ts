import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import REAL_PRODUCTS from "@/data/real-products.json";

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

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / perPage) || 1;
    const skip = (page - 1) * perPage;

    const products = await Product.find(filter)
      .sort({ id: -1 })
      .skip(skip)
      .limit(perPage)
      .lean();

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

    const newProduct = await Product.create({
      ...body,
      id: productId,
      name,
      slug,
      price: String(body.price || "0"),
      regular_price: body.regular_price ? String(body.regular_price) : "",
      sale_price: body.sale_price ? String(body.sale_price) : "",
      on_sale: Boolean(body.on_sale || (body.sale_price && parseFloat(body.sale_price) < parseFloat(body.regular_price))),
      stock_status: body.stock_status || "instock",
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (err) {
    console.error("Create product failed:", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
