import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

// Initialize Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export interface CloudinaryFolderOptions {
  category?: string;
  subcategory?: string;
  product?: string;
}

export interface CategoryFolderOptions {
  category?: string;
  subcategory?: string;
  ancestors?: string[];
}

/**
 * Builds standard hierarchical Cloudinary folder path for categories:
 * ANGKON / CATEGORIES / [PARENT_CATEGORY] / <CATEGORY_NAME_OR_SLUG>
 */
export function buildCategoryFolderPath({
  category,
  subcategory,
  ancestors = [],
}: CategoryFolderOptions = {}): string {
  const parts: string[] = ["ANGKON", "CATEGORIES"];

  if (ancestors && ancestors.length > 0) {
    for (const a of ancestors) {
      if (!a) continue;
      const cleanA = a
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_\s-]/g, "")
        .replace(/[\s-]+/g, "_");
      if (cleanA && !parts.includes(cleanA)) {
        parts.push(cleanA);
      }
    }
  } else if (category && category.trim()) {
    const catClean = category
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_\s-]/g, "")
      .replace(/[\s-]+/g, "_");
    if (catClean && !parts.includes(catClean)) {
      parts.push(catClean);
    }
  }

  if (subcategory && subcategory.trim()) {
    const subClean = subcategory
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_\s-]/g, "")
      .replace(/[\s-]+/g, "_");
    if (subClean && !parts.includes(subClean)) {
      parts.push(subClean);
    }
  }

  return parts.join("/");
}

/**
 * Builds standard Cloudinary folder path adhering to:
 * Project Name (ANGKON) -> Category (e.g. WOMEN/ETHNIC_WEAR) -> Subcategory (e.g. AIMAN_AISHA/GUZEL) -> Product (e.g. product-slug)
 * All products in the same category go into the exact same category folder hierarchy.
 */
export function buildCloudinaryFolderPath({
  category,
  subcategory,
  product,
}: CloudinaryFolderOptions = {}): string {
  const parts: string[] = ["ANGKON"];

  if (category && category.trim()) {
    // Sanitize category to clean uppercase identifier e.g. "MEN", "WOMEN", "ETHNIC_WEAR"
    const catClean = category
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_\s-]/g, "")
      .replace(/[\s-]+/g, "_");
    if (catClean && catClean !== "PRODUCTS") {
      parts.push(catClean);
    }
  }

  if (subcategory && subcategory.trim()) {
    // Sanitize subcategory to clean uppercase identifier e.g. "AIMAN_AISHA", "GUZEL"
    const subClean = subcategory
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_\s-]/g, "")
      .replace(/[\s-]+/g, "_");
    if (subClean && !parts.includes(subClean)) {
      parts.push(subClean);
    }
  }

  if (product && product.trim()) {
    // Sanitize product folder to clean slug
    const prodClean = product
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_\s-]/g, "")
      .replace(/\s+/g, "-");

    // If no category or subcategory was provided, place under PRODUCTS/ fallback
    if (parts.length === 1) {
      parts.push("PRODUCTS");
    }
    parts.push(prodClean);
  }

  return parts.join("/");
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  overwrite?: boolean;
  /** Convert the stored asset to this format (e.g. "webp"). */
  format?: string;
}

/**
 * Upload an image buffer or file path to Cloudinary.
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  options: UploadOptions = {}
): Promise<UploadApiResponse> {
  const uploadFolder = options.folder || "ANGKON";
  const uploadOptions: Record<string, unknown> = {
    folder: uploadFolder,
    asset_folder: uploadFolder,
    resource_type: "image",
    overwrite: options.overwrite ?? true,
    unique_filename: !options.publicId,
    use_filename: true,
  };

  if (options.publicId) {
    uploadOptions.public_id = options.publicId;
  }

  if (options.format) {
    uploadOptions.format = options.format;
    uploadOptions.transformation = [{ quality: "auto:good" }];
  }

  if (options.tags && options.tags.length > 0) {
    uploadOptions.tags = options.tags;
  }

  if (Buffer.isBuffer(file)) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(error || new Error("Cloudinary upload failed with no result"));
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(file);
    });
  }

  // File path or data URI
  return cloudinary.uploader.upload(file, uploadOptions);
}

/**
 * Extracts public_id from Cloudinary URL if a full URL is provided.
 * Handles formats like:
 * https://res.cloudinary.com/drtzgyetn/image/upload/v1234567890/ANGKON/WOMEN/ETHNIC/product/1.jpg
 * -> ANGKON/WOMEN/ETHNIC/product/1
 */
export function extractPublicIdFromUrl(urlOrId: string): string {
  if (!urlOrId) return "";
  if (!urlOrId.includes("res.cloudinary.com")) {
    return urlOrId.replace(/\.[^/.]+$/, ""); // strip extension if standalone id
  }

  try {
    const parts = urlOrId.split("/upload/");
    if (parts.length < 2) return urlOrId;
    let pathPart = parts[1];

    // If path contains ANGKON/, extract starting from ANGKON/
    const angkonIndex = pathPart.indexOf("ANGKON/");
    if (angkonIndex !== -1) {
      pathPart = pathPart.substring(angkonIndex);
    } else {
      // Strip any transformation params (e.g. c_scale,w_500/v123456/)
      pathPart = pathPart.replace(/^(?:[a-z]_[^/]+\/)*v\d+\//, "");
      pathPart = pathPart.replace(/^v\d+\//, "");
    }

    // Strip file extension (.jpg, .png, .webp, etc.)
    return pathPart.replace(/\.[^/.]+$/, "");
  } catch {
    return urlOrId;
  }
}

/**
 * Delete an image permanently from Cloudinary by public_id or full URL.
 */
export async function deleteFromCloudinary(
  publicIdOrUrl: string
): Promise<{ result: string }> {
  if (!publicIdOrUrl) {
    throw new Error("No public_id or image URL provided for deletion");
  }

  const publicId = extractPublicIdFromUrl(publicIdOrUrl);
  return cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}

/**
 * Safely extracts the dedicated product folder from a Cloudinary image URL or public_id.
 * E.g.:
 * "https://res.cloudinary.com/.../ANGKON/PRODUCTS/WOMEN/ETHNIC_WEAR/product-slug/file_xxx.webp"
 * -> "ANGKON/PRODUCTS/WOMEN/ETHNIC_WEAR/product-slug"
 *
 * If productIdentifiers is provided (e.g. slug, sku, name), verifies that the last folder
 * segment belongs to this product, preventing accidental deletion of category folders.
 */
export function extractProductFolderFromUrl(
  urlOrId: string,
  productIdentifiers?: string | string[]
): string | null {
  const publicId = extractPublicIdFromUrl(urlOrId);
  if (!publicId || !publicId.includes("/")) return null;

  const folder = publicId.substring(0, publicId.lastIndexOf("/"));
  const segments = folder.split("/").filter(Boolean);

  // Safety rules:
  // 1. Must be inside ANGKON
  if (segments[0] !== "ANGKON") return null;
  // 2. Must never delete root or top-level containers
  if (segments.length <= 1) return null; // "ANGKON"
  const topProtected = ["PRODUCTS", "CATEGORIES", "ETHNIC_WEAR", "WOMEN", "MEN", "TEST"];
  if (segments.length === 2 && topProtected.includes(segments[1])) return null;
  // 3. Must have at least 3 segments (e.g. ANGKON/<CAT>/<PROD> or ANGKON/<CAT>/<SUB>/<PROD>)
  if (segments.length < 3) return null;
  // 4. Must not be inside CATEGORIES
  if (segments[1] === "CATEGORIES") return null;

  // 5. If product identifiers are provided, verify that the last folder segment matches
  if (productIdentifiers) {
    const list = (Array.isArray(productIdentifiers) ? productIdentifiers : [productIdentifiers])
      .filter(Boolean)
      .map((s) => String(s).trim().toLowerCase());

    if (list.length > 0) {
      const lastSegment = segments[segments.length - 1].toLowerCase();
      const isMatch = list.some((item) => {
        const cleanItem = item.replace(/[^a-z0-9_\s-]/g, "").replace(/\s+/g, "-");
        return (
          lastSegment === item ||
          lastSegment === cleanItem ||
          (cleanItem.length > 3 && (lastSegment.includes(cleanItem) || cleanItem.includes(lastSegment)))
        );
      });

      if (!isMatch) {
        return null;
      }
    }
  }

  return folder;
}

/**
 * Delete an entire folder and all assets under it in Cloudinary with safety guards.
 */
export async function deleteCloudinaryFolder(
  folderPath: string
): Promise<{ resourcesDeleted: number; folderDeleted: boolean }> {
  const cleanPath = (folderPath || "").trim().replace(/\/+$/, "");
  const protectedPaths = [
    "",
    "ANGKON",
    "ANGKON/PRODUCTS",
    "ANGKON/CATEGORIES",
    "ANGKON/ETHNIC_WEAR",
    "ANGKON/WOMEN",
    "ANGKON/MEN",
    "ANGKON/TEST",
  ];
  if (protectedPaths.includes(cleanPath)) {
    throw new Error(`Refusing to delete protected Cloudinary root/category path: "${folderPath}"`);
  }

  try {
    // 1. Delete all assets with this prefix
    const delRes = await cloudinary.api.delete_resources_by_prefix(cleanPath + "/", {
      resource_type: "image",
      invalidate: true,
    });
    const resourcesDeleted = Object.keys(delRes?.deleted || {}).length;

    // 2. Delete the empty folder (with retry if indexing has a short propagation delay)
    let folderDeleted = false;
    try {
      await cloudinary.api.delete_folder(cleanPath);
      folderDeleted = true;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
      try {
        await cloudinary.api.delete_folder(cleanPath);
        folderDeleted = true;
      } catch (err: any) {
        console.warn(`Could not delete folder "${cleanPath}" (may already be deleted or non-empty):`, err?.message || err);
      }
    }

    return {
      resourcesDeleted,
      folderDeleted,
    };
  } catch (error) {
    console.error("Error deleting Cloudinary folder:", error);
    throw error;
  }
}

/**
 * Safely deletes a product's dedicated Cloudinary folder and all image assets inside it.
 */
export async function deleteProductCloudinaryFolder(
  folderPath: string
): Promise<{ resourcesDeleted: number; folderDeleted: boolean }> {
  const cleanPath = (folderPath || "").trim().replace(/\/+$/, "");
  const segments = cleanPath.split("/").filter(Boolean);

  if (segments.length < 3) {
    console.warn(`Skipping product folder deletion: "${folderPath}" is too broad.`);
    return { resourcesDeleted: 0, folderDeleted: false };
  }

  if (segments[0] !== "ANGKON") {
    console.warn(`Skipping product folder deletion: "${folderPath}" is outside ANGKON.`);
    return { resourcesDeleted: 0, folderDeleted: false };
  }

  return deleteCloudinaryFolder(cleanPath);
}

/**
 * Pre-creates a folder in Cloudinary so it immediately appears in the Media Library.
 * Safe no-op / warning if the folder already exists or creation fails.
 */
export async function createCloudinaryFolder(
  folderPath: string
): Promise<{ success: boolean; path: string }> {
  try {
    if (!folderPath || !folderPath.trim()) return { success: false, path: "" };
    const cleanPath = folderPath.trim().replace(/^\/+|\/+$/g, "");
    await cloudinary.api.create_folder(cleanPath);
    return { success: true, path: cleanPath };
  } catch (error) {
    // If folder already exists or network issue, log warning and gracefully continue
    console.warn(`Could not pre-create Cloudinary folder "${folderPath}":`, error);
    return { success: false, path: folderPath };
  }
}

/**
 * Automatically ensures all product images are located inside the matching
 * Cloudinary category folder: ANGKON / <CATEGORY> / [SUBCATEGORY] / <PRODUCT_SLUG>
 * If an image is located elsewhere (e.g. in root ANGKON/ or a previous category),
 * it renames/relocates the image in Cloudinary and updates its URL.
 */
export async function syncProductImagesToCategoryFolder({
  images,
  categories,
  productSlug,
}: {
  images: Array<{ id?: number | string; src: string; alt?: string; name?: string }>;
  categories: Array<{ id?: number; name?: string; slug?: string; parent?: number }>;
  productSlug: string;
}): Promise<Array<{ id?: number | string; src: string; alt?: string; name?: string }>> {
  if (!images || !Array.isArray(images) || images.length === 0) return images;

  let catSlug = "";
  let subSlug = "";

  const subCat = categories.find((c) => c.parent && Number(c.parent) > 0);
  if (subCat) {
    subSlug = subCat.slug || subCat.name || "";
    let parentCat = categories.find((c) => c.id === subCat.parent);
    if (!parentCat && subCat.parent) {
      try {
        const { default: CategoryModel } = await import("@/models/Category");
        const found = await CategoryModel.findOne({ id: subCat.parent }).lean();
        if (found) {
          parentCat = { id: found.id, name: found.name, slug: found.slug, parent: found.parent };
        }
      } catch {
        /* ignore */
      }
    }
    if (parentCat) {
      catSlug = parentCat.slug || parentCat.name || "";
    }
  } else if (categories.length > 0) {
    catSlug = categories[0].slug || categories[0].name || "";
  }

  const cleanProdSlug = (productSlug || "").trim();
  if (!cleanProdSlug) return images;

  const targetFolder = buildCloudinaryFolderPath({
    category: catSlug || undefined,
    subcategory: subSlug || undefined,
    product: cleanProdSlug,
  });

  const updatedImages = [];
  const foldersToClean = new Set<string>();

  for (const img of images) {
    if (!img?.src || typeof img.src !== "string" || !img.src.includes("res.cloudinary.com")) {
      updatedImages.push(img);
      continue;
    }

    const currentPublicId = extractPublicIdFromUrl(img.src);
    if (!currentPublicId) {
      updatedImages.push(img);
      continue;
    }

    // Already in correct folder
    if (currentPublicId.startsWith(targetFolder + "/")) {
      updatedImages.push(img);
      continue;
    }

    const fileName = currentPublicId.split("/").pop();
    if (!fileName) {
      updatedImages.push(img);
      continue;
    }

    const oldFolder = currentPublicId.substring(0, currentPublicId.lastIndexOf("/"));
    const newPublicId = `${targetFolder}/${fileName}`;
    try {
      const renameRes = await cloudinary.uploader.rename(currentPublicId, newPublicId, {
        overwrite: true,
        invalidate: true,
      });

      // Synchronize asset_folder in Cloudinary's dynamic Media Library so old folder is emptied
      try {
        await cloudinary.api.update(newPublicId, { asset_folder: targetFolder });
      } catch (assetFolderErr) {
        console.warn(`Could not update asset_folder for "${newPublicId}":`, assetFolderErr);
      }

      updatedImages.push({
        ...img,
        src: renameRes.secure_url,
      });
      if (oldFolder && oldFolder !== targetFolder) {
        foldersToClean.add(oldFolder);
      }
    } catch (err: any) {
      // If image doesn't exist on Cloudinary or failed to rename, preserve original img
      console.warn(`Could not relocate image "${currentPublicId}" to "${newPublicId}":`, err?.message || err);
      updatedImages.push(img);
    }
  }

  // Safely clean up and remove any leftover emptied old product folders
  for (const oldF of foldersToClean) {
    const protectedFolders = [
      "",
      "ANGKON",
      "ANGKON/CATEGORIES",
      "ANGKON/PRODUCTS",
      "ANGKON/ETHNIC_WEAR",
      "ANGKON/WOMEN",
      "ANGKON/MEN",
      "ANGKON/TEST",
    ];
    if (!protectedFolders.includes(oldF)) {
      try {
        await deleteProductCloudinaryFolder(oldF);
      } catch (fErr) {
        console.warn(`Could not delete old product folder "${oldF}":`, fErr);
      }
    }
  }

  return updatedImages;
}
