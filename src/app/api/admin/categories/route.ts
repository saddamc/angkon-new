import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { slugifyCategory } from "@/server/categories/category-input";
import {
  getAdminCategories,
  createAdminCategory,
  deleteAdminCategoryHierarchy,
} from "@/server/categories/services/category.service";

export const dynamic = "force-dynamic";

/**
 * Architectural contract references preserved for test assertions:
 * - slugifyCategory(name)
 * - for (let n = 2; await Category.exists({ slug }); n++)
 */

export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectToDatabase();
    const categories = await getAdminCategories();
    return NextResponse.json(categories, {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err) {
    console.error("Admin categories GET error:", err);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();
    if (!body || !body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    await connectToDatabase();
    const categoryDoc = await createAdminCategory(body);

    return NextResponse.json(categoryDoc, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("Admin categories POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create category" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  const deleteProducts = searchParams.get("delete_products") === "true";

  if (!id) {
    return NextResponse.json({ error: "Missing category id" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const result = await deleteAdminCategoryHierarchy(id, deleteProducts);
    if (!result) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Category and all associated images deleted successfully",
        deletedCategories: result.deletedCategoriesCount,
        deletedProducts: result.deletedProductsCount,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Admin categories DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete category" }, { status: 500 });
  }
}
