import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import {
  deleteFromCloudinary,
  syncProductImagesToCategoryFolder,
  extractProductFolderFromUrl,
  extractPublicIdFromUrl,
  deleteProductCloudinaryFolder,
  buildCloudinaryFolderPath,
} from "@/lib/cloudinary";
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

    // Keep sizes array and attributes[Size] completely synchronized
    if (Array.isArray(body.sizes)) {
      body.sizes = body.sizes.map(String).map((s: string) => s.trim()).filter(Boolean);
      if (Array.isArray(body.attributes)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sizeAttrIdx = body.attributes.findIndex((a: any) => {
          const n = String(a?.name || "").toLowerCase();
          return n === "size" || n === "sizes";
        });
        if (sizeAttrIdx >= 0) {
          body.attributes[sizeAttrIdx].options = body.sizes;
        } else if (body.sizes.length > 0) {
          body.attributes.push({
            id: 0,
            name: "Size",
            visible: true,
            variation: false,
            options: body.sizes,
          });
        }
      }
    } else if (Array.isArray(body.attributes)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sizeAttr = body.attributes.find((a: any) => {
        const n = String(a?.name || "").toLowerCase();
        return n === "size" || n === "sizes";
      });
      if (sizeAttr && Array.isArray(sizeAttr.options)) {
        body.sizes = sizeAttr.options.map(String).map((s: string) => s.trim()).filter(Boolean);
      }
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

    // 1. Fetch existing product before update to detect category changes & removed images
    const existing = await Product.findOne(query).lean();

    // 2. Automatically ensure product images are organized in the matching category-wise Cloudinary folder
    if (Array.isArray(body.images) && body.images.length > 0) {
      body.images = await syncProductImagesToCategoryFolder({
        images: body.images,
        categories: body.categories || [],
        productSlug: body.slug || decoded,
      });
    }

    // 3. Track and cleanly delete any images removed from this product in Cloudinary
    if (existing && Array.isArray(existing.images) && Array.isArray(body.images)) {
      const newImages = body.images;
      // Extract file basenames from new images so relocated images are recognized and preserved
      const newBasenames = new Set(
        newImages.map((img: any) => {
          const src = typeof img === "string" ? img : img?.src;
          if (!src) return "";
          const pub = extractPublicIdFromUrl(src);
          return pub ? pub.split("/").pop() : "";
        }).filter(Boolean)
      );

      for (const oldImg of existing.images) {
        const oldSrc = typeof oldImg === "string" ? oldImg : oldImg?.src;
        if (oldSrc && typeof oldSrc === "string" && oldSrc.includes("res.cloudinary.com")) {
          const oldPub = extractPublicIdFromUrl(oldSrc);
          const oldBasename = oldPub ? oldPub.split("/").pop() : "";

          // Only delete if the asset was truly removed from the product (not just relocated)
          if (oldBasename && !newBasenames.has(oldBasename)) {
            try {
              const isUsedElsewhere = await Product.exists({
                _id: { $ne: existing._id },
                "images.src": oldSrc,
              });
              if (!isUsedElsewhere) {
                await deleteFromCloudinary(oldSrc);
                console.log(`Deleted removed single product image from Cloudinary: ${oldSrc}`);
              } else {
                console.warn(`Preserving removed image "${oldSrc}" as another product references it.`);
              }
            } catch (delErr) {
              console.warn(`Error deleting removed image "${oldSrc}":`, delErr);
            }
          }
        }
      }
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

    // 1. Gather all candidate product folders and image sources
    const productIdentifiers = [
      product.slug,
      product.sku,
      product.name,
      id,
    ].filter(Boolean) as string[];

    const candidateFolders = new Set<string>();
    const imageSrcs: string[] = [];

    if (Array.isArray(product.images)) {
      for (const img of product.images) {
        const src = typeof img === "string" ? img : img?.src;
        if (src && typeof src === "string" && src.includes("res.cloudinary.com")) {
          imageSrcs.push(src);
          const folder = extractProductFolderFromUrl(src, productIdentifiers);
          if (folder) {
            candidateFolders.add(folder);
          }
        }
      }
    }

    // Also check standard product folder structure: ANGKON/PRODUCTS/[CAT]/[SUB]/[SLUG]
    if (product.slug) {
      let catSlug = "";
      let subSlug = "";
      if (Array.isArray(product.categories) && product.categories.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subCat = product.categories.find((c: any) => c.parent && Number(c.parent) > 0);
        if (subCat) {
          subSlug = subCat.slug || subCat.name || "";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parentCat = product.categories.find((c: any) => c.id === subCat.parent);
          if (parentCat) catSlug = parentCat.slug || parentCat.name || "";
        } else {
          catSlug = product.categories[0].slug || product.categories[0].name || "";
        }
      }

      const expectedFolder = buildCloudinaryFolderPath({
        category: catSlug || undefined,
        subcategory: subSlug || undefined,
        product: product.slug,
      });

      if (expectedFolder && expectedFolder.split("/").length >= 3) {
        candidateFolders.add(expectedFolder);
      }
    }

    const deletedFolders = new Set<string>();
    const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

    // 2. Delete product-level Cloudinary folders ONLY IF no other product references them (e.g. duplicated products)
    for (const folder of candidateFolders) {
      try {
        const isFolderUsedElsewhere = await Product.exists({
          _id: { $ne: product._id },
          "images.src": new RegExp(escapeRegex(folder)),
        });

        if (!isFolderUsedElsewhere) {
          await deleteProductCloudinaryFolder(folder);
          deletedFolders.add(folder);
        } else {
          console.warn(`Preserving Cloudinary folder "${folder}" as another product references it.`);
        }
      } catch (fErr) {
        console.warn(`Error cleaning up Cloudinary folder "${folder}":`, fErr);
      }
    }

    // 3. For any images not inside a deleted folder, clean up individually if unreferenced
    for (const src of imageSrcs) {
      const wasFolderDeleted = Array.from(deletedFolders).some((f) => src.includes(f));
      if (!wasFolderDeleted) {
        try {
          const isUsedElsewhere = await Product.exists({
            _id: { $ne: product._id },
            "images.src": src,
          });
          if (!isUsedElsewhere) {
            await deleteFromCloudinary(src);
          }
        } catch (e) {
          console.warn("Cloudinary cleanup error on product deletion:", e);
        }
      }
    }

    return NextResponse.json({ message: "Product and associated assets deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete product failed:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
