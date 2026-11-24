import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import { getAppEnvironment } from "@/server/env/app-environment";
import { isCloudinaryUrl } from "./cloudinary-delivery";

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
  ancestors?: string[];
  product?: string;
  productId?: number | string;
}

export interface CategoryFolderOptions {
  category?: string;
  subcategory?: string;
  ancestors?: string[];
  categoryId?: number;
}

/**
 * Normalizes any Cloudinary folder or public_id to the single canonical `ANGKON/` root.
 * Rejects environment-specific roots such as ANGKON_DEV, ANGKON_PREVIEW, or ANGKON_TEST.
 */
export function normalizeToSingleCloudinaryRoot(folderOrId: string): string {
  const cleaned = (folderOrId || "").trim().replace(/^\/+|\/+$/g, "");
  if (!cleaned) return "ANGKON";
  const withoutEnvPrefix = cleaned.replace(/^ANGKON_(?:DEV|PREVIEW|TEST)(?:\/|$)/i, "ANGKON/");
  if (withoutEnvPrefix === "ANGKON/" || withoutEnvPrefix === "ANGKON") return "ANGKON";
  if (withoutEnvPrefix.startsWith("ANGKON/")) return withoutEnvPrefix.replace(/\/+$/, "");
  return `ANGKON/${withoutEnvPrefix}`.replace(/\/+$/, "");
}

/**
 * Builds standard hierarchical Cloudinary folder path for categories under the single `ANGKON/` root.
 */
export function buildCategoryFolderPath({
  category,
  subcategory,
  ancestors = [],
  categoryId,
}: CategoryFolderOptions = {}): string {
  if (categoryId && Number.isFinite(Number(categoryId)) && !category && !subcategory && ancestors.length === 0) {
    return `ANGKON/Categories/category-${Number(categoryId)}`;
  }

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
  ancestors,
  product,
}: CloudinaryFolderOptions = {}): string {
  const parts: string[] = ["ANGKON"];

  const categoryParts = ancestors?.length
    ? ancestors
    : [category, subcategory].filter((value): value is string => Boolean(value && value.trim()));

  for (const categoryPart of categoryParts) {
    if (!categoryPart || !categoryPart.trim()) continue;
    // Sanitize category to clean uppercase identifier e.g. "MEN", "WOMEN", "ETHNIC_WEAR"
    const catClean = categoryPart
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_\s-]/g, "")
      .replace(/[\s-]+/g, "_");
    if (catClean && catClean !== "PRODUCTS") {
      parts.push(catClean);
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
  const appEnv = getAppEnvironment();
  const uploadFolder = normalizeToSingleCloudinaryRoot(options.folder || "ANGKON");
  const targetPublicId = options.publicId
    ? normalizeToSingleCloudinaryRoot(options.publicId)
    : undefined;

  if (appEnv === "test") {
    const mockPublicId = targetPublicId || `${uploadFolder}/test_mock_${Date.now()}`;
    return {
      public_id: mockPublicId,
      version: 1,
      format: options.format || "webp",
      resource_type: "image",
      created_at: new Date().toISOString(),
      bytes: 1024,
      width: 800,
      height: 800,
      url: `https://res.cloudinary.com/mock/image/upload/${mockPublicId}.webp`,
      secure_url: `https://res.cloudinary.com/mock/image/upload/${mockPublicId}.webp`,
    } as UploadApiResponse;
  }

  const uploadOptions: Record<string, unknown> = {
    folder: uploadFolder,
    asset_folder: uploadFolder,
    resource_type: "image",
    overwrite: options.overwrite ?? true,
    unique_filename: !targetPublicId,
    use_filename: true,
  };

  if (targetPublicId) {
    uploadOptions.public_id = targetPublicId;
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
  try {
    const isUrl = /^https?:\/\//i.test(urlOrId);
    if (isUrl && !isCloudinaryUrl(urlOrId, process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN)) {
      // Never interpret an arbitrary remote URL as a Cloudinary public_id.
      return "";
    }

    if (!isUrl) return urlOrId.replace(/\.[^/.]+$/, "");

    const parsed = new URL(urlOrId);
    const markerIndex = parsed.pathname.search(/\/image\/upload\//i);
    const genericMarkerIndex = markerIndex >= 0 ? markerIndex : parsed.pathname.search(/\/upload\//i);
    if (genericMarkerIndex < 0) return "";

    const marker = parsed.pathname.slice(genericMarkerIndex).replace(/^\//, "");
    let pathPart = marker.replace(/^image\/upload\//i, "").replace(/^upload\//i, "");

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
    return "";
  }
}

export interface DeleteCloudinaryOptions {
  /**
   * Set true only for explicit admin-confirmed destructive UI actions so local dev
   * can delete unreferenced assets from the shared ANGKON/ Cloudinary library.
   * Automated tests and unconfirmed non-prod calls remain safely mocked.
   */
  forceConfirmed?: boolean;
}

/**
 * Resolves the live Cloudinary `asset_folder` for a URL or public_id in Dynamic Folder Mode.
 * Returns null if missing or running in test environment.
 */
export async function getCloudinaryAssetFolder(publicIdOrUrl: string): Promise<string | null> {
  if (!publicIdOrUrl || getAppEnvironment() === "test") return null;
  const publicId = extractDecodedPublicId(publicIdOrUrl);
  if (!publicId) return null;

  try {
    const resource = (await cloudinary.api.resource(publicId, {
      resource_type: "image",
    })) as { asset_folder?: string };
    const folder = resource?.asset_folder?.trim().replace(/^\/+|\/+$/g, "");
    return folder || null;
  } catch {
    return null;
  }
}

/**
 * Delete an image permanently from Cloudinary by public_id or full URL.
 */
export async function deleteFromCloudinary(
  publicIdOrUrl: string,
  options: DeleteCloudinaryOptions = {}
): Promise<{ result: string }> {
  if (!publicIdOrUrl) {
    throw new Error("No public_id or image URL provided for deletion");
  }

  const publicId = extractDecodedPublicId(publicIdOrUrl);
  if (!publicId) {
    throw new Error("The value is not a valid Cloudinary URL or public_id");
  }

  const appEnv = getAppEnvironment();
  const isMockedNonProd =
    appEnv === "test" ||
    (appEnv !== "production" &&
      process.env.ALLOW_PROD_CLOUDINARY_MUTATIONS !== "true" &&
      options.forceConfirmed !== true);

  if (isMockedNonProd) {
    console.info(`[Cloudinary Mock (${appEnv})] Non-production deletion of "${publicId}" safely mocked.`);
    return { result: "ok" };
  }

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
  folderPath: string,
  options: DeleteCloudinaryOptions = {}
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

  const appEnv = getAppEnvironment();
  const isMockedNonProd =
    appEnv === "test" ||
    (appEnv !== "production" &&
      process.env.ALLOW_PROD_CLOUDINARY_MUTATIONS !== "true" &&
      options.forceConfirmed !== true);

  if (isMockedNonProd) {
    console.info(`[Cloudinary Mock (${appEnv})] Non-production folder deletion of "${cleanPath}" safely mocked.`);
    return { resourcesDeleted: 0, folderDeleted: true };
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
      } catch (err: unknown) {
        const errObj = err as { message?: string } | undefined;
        console.warn(`Could not delete folder "${cleanPath}" (may already be deleted or non-empty):`, errObj?.message || err);
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
  folderPath: string,
  options: DeleteCloudinaryOptions = {}
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

  return deleteCloudinaryFolder(cleanPath, options);
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
    if (getAppEnvironment() === "test") {
      return { success: true, path: cleanPath };
    }
    await cloudinary.api.create_folder(cleanPath);
    return { success: true, path: cleanPath };
  } catch (error) {
    // If folder already exists or network issue, log warning and gracefully continue
    console.warn(`Could not pre-create Cloudinary folder "${folderPath}":`, error);
    return { success: false, path: folderPath };
  }
}

export interface MoveAssetResult {
  moved: boolean;
  publicId: string;
  previousFolder?: string;
  targetFolder: string;
  skippedReason?: string;
  error?: string;
}

export interface MoveAssetOptions {
  api?: typeof cloudinary.api;
}

export interface DeleteEmptyFolderResult {
  deletedFolders: string[];
  skippedReason?: string;
}

export interface DeleteEmptyFolderOptions {
  walkUp?: boolean;
  minDepth?: number;
  api?: typeof cloudinary.api;
}

const CORE_PROTECTED_FOLDERS = new Set([
  "",
  "ANGKON",
  "ANGKON/PRODUCTS",
  "ANGKON/CATEGORIES",
  "ANGKON/MARKETING",
  "ANGKON/BANNERS",
  "ANGKON/ETHNIC_WEAR",
  "ANGKON/WOMEN",
  "ANGKON/MEN",
  "ANGKON/ACCESSORIES",
  "ANGKON/TEST",
]);

function extractDecodedPublicId(publicIdOrUrl: string): string {
  const raw = extractPublicIdFromUrl(publicIdOrUrl);
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getCloudinaryErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const errObj = error as { http_code?: number; error?: { http_code?: number } };
  return errObj.http_code ?? errObj.error?.http_code;
}

function getCloudinaryErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const errObj = error as { message?: string; error?: { message?: string } };
    return errObj.error?.message || errObj.message || JSON.stringify(error);
  }
  return String(error);
}

/**
 * Moves a verified Cloudinary asset to a target Media Library folder (`asset_folder`)
 * in Dynamic Folder Mode without changing its `public_id` or delivery URL.
 * Dev and production image URLs remain identical and zero 404s are introduced.
 */
export async function moveAssetToFolder(
  publicIdOrUrl: string,
  targetFolder: string,
  options: MoveAssetOptions = {}
): Promise<MoveAssetResult> {
  const publicId = extractDecodedPublicId(publicIdOrUrl);
  const normalizedTarget = normalizeToSingleCloudinaryRoot(targetFolder);

  if (!publicId) {
    return {
      moved: false,
      publicId: "",
      targetFolder: normalizedTarget,
      skippedReason: "invalid-public-id",
    };
  }

  if (!options.api && getAppEnvironment() === "test") {
    return {
      moved: false,
      publicId,
      targetFolder: normalizedTarget,
      skippedReason: "test-env-mocked",
    };
  }

  const apiClient = options.api || cloudinary.api;

  try {
    const resource = (await apiClient.resource(publicId, {
      resource_type: "image",
    })) as { asset_folder?: string; public_id?: string };

    const canonicalPublicId = resource?.public_id || publicId;
    const previousFolder = resource?.asset_folder
      ? resource.asset_folder.trim().replace(/^\/+|\/+$/g, "")
      : "";

    if (previousFolder === normalizedTarget) {
      return {
        moved: false,
        publicId: canonicalPublicId,
        previousFolder,
        targetFolder: normalizedTarget,
        skippedReason: "already-in-target",
      };
    }

    try {
      await apiClient.create_folder(normalizedTarget);
    } catch {
      // Ignore error when target folder already exists in Media Library
    }

    await apiClient.update(canonicalPublicId, {
      asset_folder: normalizedTarget,
    });

    return {
      moved: true,
      publicId: canonicalPublicId,
      previousFolder,
      targetFolder: normalizedTarget,
    };
  } catch (error) {
    if (getCloudinaryErrorCode(error) === 404) {
      return {
        moved: false,
        publicId,
        targetFolder: normalizedTarget,
        skippedReason: "not-found",
      };
    }

    return {
      moved: false,
      publicId,
      targetFolder: normalizedTarget,
      error: getCloudinaryErrorMessage(error),
    };
  }
}

/**
 * Deletes an empty Cloudinary folder ONLY after confirming 0 assets and 0 subfolders exist.
 * Never deletes any asset (`delete_resources*` is never called) and protects top-level roots.
 * Walks up empty leaf ancestors strictly deeper than depth 2 (`ANGKON/<CAT>/...`).
 */
export async function deleteCloudinaryFolderIfEmpty(
  folderPath: string,
  options: DeleteEmptyFolderOptions = {}
): Promise<DeleteEmptyFolderResult> {
  const { walkUp = true, minDepth = 3 } = options;
  const cleanInitial = (folderPath || "").trim().replace(/^\/+|\/+$/g, "");

  if (!cleanInitial) {
    return { deletedFolders: [], skippedReason: "empty-path" };
  }

  if (!options.api && getAppEnvironment() === "test") {
    return { deletedFolders: [], skippedReason: "test-env-mocked" };
  }

  const apiClient = options.api || cloudinary.api;
  const deletedFolders: string[] = [];
  let current = cleanInitial;
  let isInitial = true;

  while (current) {
    const segments = current.split("/").filter(Boolean);
    const depthLimit = isInitial ? Math.max(2, minDepth) : Math.max(3, minDepth);

    if (
      segments[0] !== "ANGKON" ||
      segments.length < depthLimit ||
      CORE_PROTECTED_FOLDERS.has(current)
    ) {
      if (isInitial) {
        return { deletedFolders, skippedReason: "protected-path" };
      }
      break;
    }

    try {
      const [resourcesRes, subFoldersRes] = await Promise.all([
        apiClient.resources_by_asset_folder(current, { max_results: 1 }),
        apiClient.sub_folders(current),
      ]);

      const hasResources = (resourcesRes?.resources?.length ?? 0) > 0;
      const hasSubFolders = (subFoldersRes?.folders?.length ?? 0) > 0;

      if (hasResources || hasSubFolders) {
        if (isInitial) {
          return {
            deletedFolders,
            skippedReason: hasResources ? "folder-has-resources" : "folder-has-subfolders",
          };
        }
        break;
      }

      await apiClient.delete_folder(current);
      deletedFolders.push(current);
    } catch (error) {
      if (getCloudinaryErrorCode(error) === 404) {
        if (isInitial) {
          return { deletedFolders, skippedReason: "folder-not-found" };
        }
        // Already absent; continue walking parent leaf if empty
      } else {
        if (isInitial) {
          return { deletedFolders, skippedReason: getCloudinaryErrorMessage(error) };
        }
        break;
      }
    }

    if (!walkUp) break;
    isInitial = false;
    segments.pop();
    current = segments.join("/");
  }

  return { deletedFolders };
}
