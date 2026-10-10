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
      .replace(/\s+/g, "_");
    parts.push(catClean);
  }

  if (subcategory && subcategory.trim()) {
    // Sanitize subcategory to clean uppercase identifier e.g. "ETHNIC", "POLO"
    const subClean = subcategory
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_\s-]/g, "")
      .replace(/\s+/g, "_");
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
    // Strip version prefix if present e.g. "v1234567890/"
    pathPart = pathPart.replace(/^v\d+\//, "");
    // Strip file extension
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
