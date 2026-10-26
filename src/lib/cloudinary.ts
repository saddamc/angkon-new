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
 * Project Name (ANGKON) -> Category (e.g. MEN/WOMEN) -> Subcategory (e.g. ETHNIC) -> Product (e.g. product-slug)
 */
export function buildCloudinaryFolderPath({
  category,
  subcategory,
  product,
}: CloudinaryFolderOptions = {}): string {
  const parts: string[] = ["ANGKON"];

  if (category && category.trim()) {
    // Sanitize category to clean uppercase identifier e.g. "MEN", "WOMEN"
    const catClean = category
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_\s-]/g, "")
      .replace(/[\s-]+/g, "_");
    parts.push(catClean);
  }

  if (subcategory && subcategory.trim()) {
    // Sanitize subcategory to clean uppercase identifier e.g. "ETHNIC", "POLO"
    const subClean = subcategory
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_\s-]/g, "")
      .replace(/[\s-]+/g, "_");
    parts.push(subClean);
  }

  if (product && product.trim()) {
    // Sanitize product folder to clean slug
    const prodClean = product
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_\s-]/g, "")
      .replace(/\s+/g, "-");
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
  const uploadOptions: Record<string, unknown> = {
    folder: options.folder || "ANGKON",
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
 * Delete an entire folder and all assets under it in Cloudinary.
 */
export async function deleteCloudinaryFolder(
  folderPath: string
): Promise<{ resourcesDeleted: number; folderDeleted: boolean }> {
  try {
    // 1. Delete all assets with this prefix
    const delRes = await cloudinary.api.delete_resources_by_prefix(folderPath);
    // 2. Delete the empty folder
    await cloudinary.api.delete_folder(folderPath).catch(() => {});
    return {
      resourcesDeleted: Object.keys(delRes.deleted || {}).length,
      folderDeleted: true,
    };
  } catch (error) {
    console.error("Error deleting Cloudinary folder:", error);
    throw error;
  }
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
    const parentCat = categories.find((c) => c.id === subCat.parent);
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

    const newPublicId = `${targetFolder}/${fileName}`;
    try {
      const renameRes = await cloudinary.uploader.rename(currentPublicId, newPublicId, {
        overwrite: true,
        invalidate: true,
      });
      updatedImages.push({
        ...img,
        src: renameRes.secure_url,
      });
    } catch (err: any) {
      // If image doesn't exist on Cloudinary or failed to rename, preserve original img
      console.warn(`Could not relocate image "${currentPublicId}" to "${newPublicId}":`, err?.message || err);
      updatedImages.push(img);
    }
  }

  return updatedImages;
}
