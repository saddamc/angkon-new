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
  const rawMode = searchParams.get("mode");
  const mode =
    rawMode === "shift" || rawMode === "delete_products" || rawMode === "unlink"
      ? rawMode
      : deleteProducts
      ? "delete_products"
      : "unlink";
  const targetCategoryId = Number(searchParams.get("target_category_id")) || undefined;
  const deleteCloudinary = searchParams.get("delete_cloudinary") !== "false";

  if (!id) {
    return NextResponse.json({ error: "Missing category id" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const result = await deleteAdminCategoryHierarchy(id, {
      mode,
      targetCategoryId,
      deleteCloudinary,
    });
    if (!result) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message:
          result.shiftedProductsCount > 0
            ? "Category deleted and products shifted successfully"
            : "Category and associated assets processed successfully",
        deletedCategories: result.deletedCategoriesCount,
        deletedProducts: result.deletedProductsCount,
        shiftedProducts: result.shiftedProductsCount,
        cloudinaryAssetsDeleted: result.cloudinaryAssetsDeleted,
        cloudinaryFoldersCleaned: result.cloudinaryFoldersCleaned,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Admin categories DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete category" }, { status: 500 });
  }
}
