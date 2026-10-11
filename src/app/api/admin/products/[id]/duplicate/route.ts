import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";

function uniqueSku(sku: string | undefined): string {
  const base = (sku || "").trim();
  if (!base) return "";
  const stamp = Date.now().toString(36).slice(-5).toUpperCase();
  return `${base}-COPY-${stamp}`.slice(0, 64);
}

function uniqueSlug(slug: string | undefined, name: string): string {
  const base = (slug || name || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return `${base}-copy-${Date.now().toString(36)}`;
}

/** POST /api/admin/products/[id]/duplicate — clone product in MongoDB Atlas */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    await connectToDatabase();

    const query = isNaN(numericId) ? { slug: id } : { id: numericId };
    const source = await Product.findOne(query).lean();

    if (!source) {
      return NextResponse.json({ error: "Source product not found" }, { status: 404 });
    }

    // Determine highest product ID to assign next unique integer ID
    const highest = await Product.findOne({}).sort({ id: -1 }).select("id").lean();
    const newId = (highest?.id || 228000) + 1;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, __v, createdAt, updatedAt, ...sourceData } = (source as unknown) as Record<string, unknown>;

    const clonedProduct = await Product.create({
      ...sourceData,
      id: newId,
      name: `${source.name} (Copy)`,
      slug: uniqueSlug(source.slug, source.name),
      sku: uniqueSku(source.sku),
      stock_status: source.stock_status || "instock",
    });

    return NextResponse.json(
      {
        ok: true,
        product: clonedProduct,
        id: clonedProduct.id,
        message: `Duplicated successfully: ${clonedProduct.name}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Duplicate product error:", error);
    return NextResponse.json({ error: "Failed to duplicate product" }, { status: 500 });
  }
}
