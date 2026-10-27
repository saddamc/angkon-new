import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { publishCatalogChange } from "@/lib/catalog-sync";
import { invalidateShippingSettingsCache } from "@/server/shipping";

// Product-specific delivery fees (`_delivery_inside` / `_delivery_outside`) REPLACE the store-wide
// rates for that product. This endpoint lets the admin see how many products do that and clear them
// so the store-wide rates from Admin -> Settings -> Shipping apply everywhere.
// Auth is enforced by src/proxy.ts for every /api/admin/* route.

const FEE_KEYS = ["_delivery_inside", "_delivery_outside"];

const hasOwnFee = {
  meta_data: {
    $elemMatch: { key: { $in: FEE_KEYS }, value: { $nin: ["", null] } },
  },
};

// GET — how many products carry their own delivery fee (and which)
export async function GET() {
  try {
    await connectToDatabase();
    const products = await Product.find(hasOwnFee).select("id name slug meta_data").lean();
    const read = (meta: { key: string; value: string }[] | undefined, key: string) => {
      const hit = [...(meta ?? [])].reverse().find((m) => m.key === key);
      return hit && String(hit.value).trim() !== "" ? Number(hit.value) : null;
    };
    return NextResponse.json(
      {
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          inside: read(p.meta_data, "_delivery_inside"),
          outside: read(p.meta_data, "_delivery_outside"),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET shipping overrides failed:", error);
    return NextResponse.json({ error: "Could not check product delivery fees." }, { status: 500 });
  }
}

// POST — clear every product-specific delivery fee so the store-wide rates apply
export async function POST() {
  try {
    await connectToDatabase();
    // timestamps:false keeps "last updated" (and therefore storefront ordering) unchanged.
    const result = await Product.updateMany(
      { "meta_data.key": { $in: FEE_KEYS } },
      { $pull: { meta_data: { key: { $in: FEE_KEYS } } } },
      { timestamps: false },
    );
    await publishCatalogChange();
    invalidateShippingSettingsCache();
    return NextResponse.json({ success: true, cleared: result.modifiedCount });
  } catch (error) {
    console.error("POST shipping overrides failed:", error);
    return NextResponse.json({ error: "Could not clear product delivery fees." }, { status: 500 });
  }
}
