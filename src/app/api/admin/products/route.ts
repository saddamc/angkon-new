import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  listAdminProducts,
  createAdminProduct,
  bulkDeleteAdminProducts,
} from "@/server/products/services/product.service";

// GET /api/admin/products — list all products from MongoDB Atlas
export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);
  const search = searchParams.get("search") ?? "";

  try {
    await connectToDatabase();
    const result = await listAdminProducts({ page, perPage, search });
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("Admin products GET error:", err);
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 });
  }
}

// POST /api/admin/products — create product in MongoDB Atlas
export async function POST(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    if (!body || !body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "Product name is required." }, { status: 400 });
    }

    await connectToDatabase();
    const result = await createAdminProduct(body);

    return NextResponse.json(result.payload, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("Admin products POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create product" }, { status: 500 });
  }
}

// DELETE /api/admin/products — bulk delete products
export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const ids: number[] = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "No product IDs provided" }, { status: 400 });
    }

    await connectToDatabase();
    const result = await bulkDeleteAdminProducts(ids);

    return NextResponse.json({
      ok: true,
      deletedCount: result.deletedCount,
      deletedIds: result.deletedIds,
    });
  } catch (err) {
    console.error("Bulk delete products failed:", err);
    return NextResponse.json({ error: "Failed to delete products" }, { status: 500 });
  }
}
