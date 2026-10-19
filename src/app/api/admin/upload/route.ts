import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteCloudinaryFolder,
  buildCloudinaryFolderPath,
  buildCategoryFolderPath,
  extractPublicIdFromUrl,
} from "@/lib/cloudinary";

/**
 * POST /api/admin/upload
 * Industry-level Cloudinary upload with hierarchical folder architecture.
 * Product Folder: ANGKON / <CATEGORY> / [SUBCATEGORY] / <PRODUCT_SLUG>
 * Category Folder: ANGKON / CATEGORIES / [PARENT_CATEGORY] / <CATEGORY_NAME_OR_SLUG>
 */
export async function POST(request: NextRequest) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json(
      { error: "Cloudinary credentials not configured in environment" },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const category = (formData.get("category") as string) || undefined;
    const subcategory = (formData.get("subcategory") as string) || undefined;
    const product = (formData.get("product") as string) || (formData.get("productSlug") as string) || undefined;
    const uploadType = (formData.get("uploadType") as string) || (formData.get("type") as string) || undefined;
    const customFolder = (formData.get("folder") as string) || undefined;

    let folder = customFolder;
    if (!folder) {
      if (uploadType === "category") {
        folder = buildCategoryFolderPath({ category, subcategory });
      } else {
        folder = buildCloudinaryFolderPath({ category, subcategory, product });
      }
    }

    const filename = (file as File).name ?? "upload.jpg";
    const buffer = Buffer.from(await file.arrayBuffer());

    // Category and product images are converted to WebP (preserve SVG vector and animated GIF)
    const isSvg = file.type === "image/svg+xml" || filename.toLowerCase().endsWith(".svg");
    const isGif = file.type === "image/gif" || filename.toLowerCase().endsWith(".gif");
    const shouldConvertToWebP = !isSvg && !isGif;

    let uploadBuffer = buffer;
    if (shouldConvertToWebP) {
      try {
        const sharpInstance = sharp(buffer).rotate();
        const meta = await sharpInstance.metadata();
        const maxSide = 1800;
        let pipeline = sharpInstance;
        if (meta.width && meta.height && (meta.width > maxSide || meta.height > maxSide)) {
          pipeline = pipeline.resize({
            width: meta.width >= meta.height ? maxSide : undefined,
            height: meta.height > meta.width ? maxSide : undefined,
            fit: "inside",
            withoutEnlargement: true,
          });
        }
        uploadBuffer = await pipeline.webp({ quality: 88, effort: 4 }).toBuffer();
      } catch (sharpErr) {
        console.warn("Sharp WebP conversion failed/skipped, using original buffer:", sharpErr);
        uploadBuffer = buffer;
      }
    }

    const result = await uploadToCloudinary(uploadBuffer, {
      folder,
      overwrite: true,
      format: shouldConvertToWebP ? "webp" : undefined,
    });

    // Ensure id is always a numeric timestamp (not Cloudinary's hex asset_id string)
    // so Mongoose and frontend Number schemas never encounter NaN casting errors.
    const numericId = Date.now();

    return NextResponse.json({
      url: result.secure_url,
      public_id: result.public_id,
      id: numericId,
      asset_id: result.asset_id,
      alt: (formData.get("alt") as string) || filename.replace(/\.[^.]+$/, ""),
      width: result.width,
      height: result.height,
      format: result.format || (shouldConvertToWebP ? "webp" : undefined),
      folder,
    });
  } catch (err: unknown) {
    console.error("Cloudinary upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/upload
 * Permanently destroys image(s) or folder in Cloudinary by public_id, URL, items array, or folder path.
 */
export async function DELETE(request: NextRequest) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json(
      { error: "Cloudinary credentials not configured in environment" },
      { status: 503 }
    );
  }

  const itemsToDelete: string[] = [];
  let folderToDelete: string | undefined;

  // Accept JSON body { public_id, url, id, items, urls, folder }
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as {
        public_id?: string;
        url?: string;
        id?: string | number;
        folder?: string;
        items?: Array<{ id?: string | number; url?: string; public_id?: string }>;
        urls?: string[];
        public_ids?: string[];
      };

      if (body.folder) folderToDelete = body.folder;
      if (body.public_id) itemsToDelete.push(body.public_id);
      if (body.url) itemsToDelete.push(body.url);
      if (body.id) itemsToDelete.push(String(body.id));

      if (Array.isArray(body.items)) {
        for (const item of body.items) {
          if (item?.public_id) itemsToDelete.push(item.public_id);
          else if (item?.url) itemsToDelete.push(item.url);
          else if (item?.id) itemsToDelete.push(String(item.id));
        }
      }
      if (Array.isArray(body.urls)) {
        itemsToDelete.push(...body.urls);
      }
      if (Array.isArray(body.public_ids)) {
        itemsToDelete.push(...body.public_ids);
      }
    } catch {
      // fall through to search params
    }
  }

  // Accept query params ?public_id= or ?url= or ?id= or ?folder=
  if (itemsToDelete.length === 0 && !folderToDelete) {
    const { searchParams } = new URL(request.url);
    const pubId = searchParams.get("public_id");
    const url = searchParams.get("url");
    const id = searchParams.get("id");
    const folder = searchParams.get("folder");

    if (pubId) itemsToDelete.push(pubId);
    if (url) itemsToDelete.push(url);
    if (id) itemsToDelete.push(id);
    if (folder) folderToDelete = folder;
  }

  if (itemsToDelete.length === 0 && !folderToDelete) {
    return NextResponse.json(
      { error: "Missing public_id, image URL, items, or folder for deletion" },
      { status: 400 }
    );
  }

  try {
    const results: Array<{ id: string; result: string }> = [];

    // Delete individual assets
    for (const item of itemsToDelete) {
      if (!item) continue;
      const cleanPublicId = extractPublicIdFromUrl(item);
      if (cleanPublicId) {
        try {
          const delResult = await deleteFromCloudinary(cleanPublicId);
          results.push({ id: cleanPublicId, result: delResult.result });
        } catch (delErr) {
          console.warn(`Failed to destroy Cloudinary item ${cleanPublicId}:`, delErr);
        }
      }
    }

    // Delete folder if requested
    let folderResult = null;
    if (folderToDelete) {
      folderResult = await deleteCloudinaryFolder(folderToDelete).catch((err) => {
        console.warn(`Failed to destroy Cloudinary folder ${folderToDelete}:`, err);
        return null;
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount: results.length,
      results,
      folderResult,
    });
  } catch (err: unknown) {
    console.error("Cloudinary delete error:", err);
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
