import { Product } from "@/models/Product";
import { publishCatalogChange } from "@/lib/catalog-sync";
import {
  deleteFromCloudinary,
  syncProductImagesToCategoryFolder,
  extractProductFolderFromUrl,
  deleteProductCloudinaryFolder,
  buildCloudinaryFolderPath,
} from "@/lib/cloudinary";
import { isCloudinaryUrl } from "@/lib/cloudinary-delivery";
import REAL_PRODUCTS from "@/data/real-products.json";
import REAL_CATEGORIES from "@/data/real-categories.json";
import { resolveProductCategories } from "@/server/categories/category-sync";
import { cleanColorName } from "@/utils/color-swatches";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const localCategory = (id: number) => (REAL_CATEGORIES as any[]).find((rc) => rc.id === id);

export interface ListProductsQuery {
  page?: number;
  perPage?: number;
  search?: string;
}

export async function listAdminProducts({ page = 1, perPage = 20, search = "" }: ListProductsQuery) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * perPage;

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .select("-description -short_description")
        .sort({ id: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / perPage) || 1;

    return { products, total, totalPages };
  } catch (err) {
    console.warn("MongoDB admin products query warning, using local catalog fallback:", err);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let list = [...(REAL_PRODUCTS as any[])];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q));
    }
    const total = list.length;
    const totalPages = Math.ceil(total / perPage);
    const paginated = list.slice((page - 1) * perPage, page * perPage);

    return { products: paginated, total, totalPages };
  }
}

export async function createAdminProduct(body: any): Promise<{ status: number; payload: any }> {
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

  const slugClash = await Product.findOne({ slug }).select("id name slug").lean();
  if (slugClash) {
    return {
      status: 409,
      payload: {
        error: `The URL slug "${slug}" is already used by product #${slugClash.id} (${slugClash.name}). Choose a different slug, for example "${slug}-2".`,
        code: "SLUG_TAKEN",
        conflict: { id: slugClash.id, name: slugClash.name, slug: slugClash.slug },
      },
    };
  }

  const resolvedCategories = await resolveProductCategories(body.categories, localCategory);

  const regularPrice = body.regular_price ? String(body.regular_price) : "";
  const salePrice = body.sale_price ? String(body.sale_price) : "";
  const buyPrice = body.buy_price ? String(body.buy_price) : "";
  const price = String(body.price || salePrice || regularPrice || "0");

  const stockQtyRaw = body.stock_quantity;
  const stockQuantity =
    stockQtyRaw !== undefined && stockQtyRaw !== null && stockQtyRaw !== "" && !isNaN(Number(stockQtyRaw))
      ? Number(stockQtyRaw)
      : null;
  const manageStock = stockQuantity !== null ? true : Boolean(body.manage_stock);
  const stockStatus =
    manageStock && stockQuantity === 0 && (!body.stock_status || body.stock_status === "instock")
      ? "outofstock"
      : (body.stock_status || "instock");

  let productSizes: string[] = [];
  if (Array.isArray(body.sizes)) {
    productSizes = body.sizes.map(String).map((s: string) => s.trim()).filter(Boolean);
  } else if (Array.isArray(body.attributes)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sizeAttr = body.attributes.find((a: any) => {
      const n = String(a?.name || "").toLowerCase();
      return n === "size" || n === "sizes";
    });
    if (sizeAttr && Array.isArray(sizeAttr.options)) {
      productSizes = sizeAttr.options.map(String).map((s: string) => s.trim()).filter(Boolean);
    }
  }

  const attributes = Array.isArray(body.attributes) ? [...body.attributes] : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sizeAttrIdx = attributes.findIndex((a: any) => {
    const n = String(a?.name || "").toLowerCase();
    return n === "size" || n === "sizes";
  });
  if (sizeAttrIdx >= 0) {
    attributes[sizeAttrIdx].options = productSizes;
  } else if (productSizes.length > 0) {
    attributes.push({
      id: 0,
      name: "Size",
      visible: true,
      variation: false,
      options: productSizes,
    });
  }

  let productColors: string[] = [];
  if (Array.isArray(body.colors)) {
    productColors = body.colors
      .map(String)
      .map((s: string) => cleanColorName(s.trim()))
      .filter(Boolean);
  } else if (Array.isArray(body.attributes)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colorAttr = body.attributes.find((a: any) => {
      const n = String(a?.name || "").toLowerCase();
      return n === "color" || n === "colors" || n === "colour" || n === "colours";
    });
    if (colorAttr && Array.isArray(colorAttr.options)) {
      productColors = colorAttr.options
        .map(String)
        .map((s: string) => cleanColorName(s.trim()))
        .filter(Boolean);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colorAttrIdx = attributes.findIndex((a: any) => {
    const n = String(a?.name || "").toLowerCase();
    return n === "color" || n === "colors" || n === "colour" || n === "colours";
  });
  if (colorAttrIdx >= 0) {
    attributes[colorAttrIdx].options = productColors;
  } else if (productColors.length > 0) {
    attributes.push({
      id: 0,
      name: "Color",
      visible: true,
      variation: false,
      options: productColors,
    });
  }

  let productImages = Array.isArray(body.images) ? body.images : [];
  if (productImages.length > 0) {
    productImages = await syncProductImagesToCategoryFolder({
      images: productImages,
      categories: resolvedCategories,
      productSlug: slug,
    });
  }

  try {
    const newProduct = await Product.create({
      ...body,
      id: productId,
      name,
      slug,
      images: productImages,
      categories: resolvedCategories,
      price,
      regular_price: regularPrice,
      sale_price: salePrice,
      buy_price: buyPrice,
      on_sale: Boolean(body.on_sale || (salePrice && parseFloat(salePrice) < parseFloat(regularPrice))),
      stock_status: stockStatus,
      manage_stock: manageStock,
      stock_quantity: stockQuantity,
      sizes: productSizes,
      colors: productColors,
      attributes,
    });

    await publishCatalogChange();
    return { status: 201, payload: newProduct };
  } catch (err: any) {
    if (err && err.code === 11000) {
      return {
        status: 409,
        payload: {
          error: "That URL slug is already used by another product. Choose a different slug.",
          code: "SLUG_TAKEN",
        },
      };
    }
    throw err;
  }
}

export async function bulkDeleteAdminProducts(ids: number[]) {
  const products = await Product.find({ id: { $in: ids } });
  if (products.length === 0) {
    return { deletedCount: 0, deletedIds: [] };
  }

  const result = await Product.deleteMany({ id: { $in: ids } });

  const candidateFolders = new Set<string>();
  const imageSrcs: string[] = [];

  for (const prod of products) {
    const productIdentifiers = [
      prod.slug,
      prod.sku,
      prod.name,
      String(prod.id),
    ].filter(Boolean) as string[];

    if (Array.isArray(prod.images)) {
      for (const img of prod.images) {
        const src = typeof img === "string" ? img : img?.src;
        if (src && typeof src === "string" && isCloudinaryUrl(src, process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN)) {
          imageSrcs.push(src);
          const folder = extractProductFolderFromUrl(src, productIdentifiers);
          if (folder) {
            candidateFolders.add(folder);
          }
        }
      }
    }

    if (prod.slug) {
      let catSlug = "";
      let subSlug = "";
      if (Array.isArray(prod.categories) && prod.categories.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subCat = prod.categories.find((c: any) => c.parent && Number(c.parent) > 0);
        if (subCat) {
          subSlug = subCat.slug || subCat.name || "";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parentCat = prod.categories.find((c: any) => c.id === subCat.parent);
          if (parentCat) catSlug = parentCat.slug || parentCat.name || "";
        } else {
          catSlug = prod.categories[0].slug || prod.categories[0].name || "";
        }
      }

      const expectedFolder = buildCloudinaryFolderPath({
        category: catSlug || undefined,
        subcategory: subSlug || undefined,
        product: prod.slug,
      });

      if (expectedFolder && expectedFolder.split("/").length >= 3) {
        candidateFolders.add(expectedFolder);
      }
    }
  }

  const deletedFolders = new Set<string>();
  const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

  for (const folder of candidateFolders) {
    try {
      const isFolderUsedElsewhere = await Product.exists({
        id: { $nin: ids },
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

  for (const src of imageSrcs) {
    const wasFolderDeleted = Array.from(deletedFolders).some((f) => src.includes(f));
    if (!wasFolderDeleted) {
      try {
        const isUsedElsewhere = await Product.exists({
          id: { $nin: ids },
          "images.src": src,
        });
        if (!isUsedElsewhere) {
          await deleteFromCloudinary(src);
        }
      } catch (delErr) {
        console.warn("Cloudinary cleanup error on bulk product deletion:", delErr);
      }
    }
  }

  await publishCatalogChange();

  return {
    deletedCount: result.deletedCount,
    deletedIds: ids,
  };
}
