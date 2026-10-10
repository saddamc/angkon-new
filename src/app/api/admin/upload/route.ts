import { NextRequest, NextResponse } from "next/server";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  buildCloudinaryFolderPath,
  extractPublicIdFromUrl,
} from "@/lib/cloudinary";

/**
 * POST /api/admin/upload
 * Industry-level Cloudinary upload with hierarchical project/category/product folder architecture.
 * Folder Path: ANGKON / <CATEGORY> / [SUBCATEGORY] / <PRODUCT_SLUG>
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
    const customFolder = (formData.get("folder") as string) || undefined;

    const folder = customFolder || buildCloudinaryFolderPath({ category, subcategory, product });

    const filename = (file as File).name ?? "upload.jpg";
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadToCloudinary(buffer, {
      folder,
      overwrite: true,
    });

    return NextResponse.json({
      url: result.secure_url,
      public_id: result.public_id,
      id: result.asset_id || Date.now(),
      alt: (formData.get("alt") as string) || filename.replace(/\.[^.]+$/, ""),
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (err: unknown) {
    console.error("Cloudinary upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/upload
 * Permanently destroys an image in Cloudinary by public_id or image URL.
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

  let publicIdOrUrl: string | undefined;

  // Accept JSON body { public_id, url, id }
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as {
        public_id?: string;
        url?: string;
        id?: string | number;
      };
      publicIdOrUrl = body.public_id || body.url || (body.id ? String(body.id) : undefined);
    } catch {
      // fall through to search params
    }
  }

  // Accept query params ?public_id= or ?url= or ?id=
  if (!publicIdOrUrl) {
    const { searchParams } = new URL(request.url);
    publicIdOrUrl =
      searchParams.get("public_id") ||
      searchParams.get("url") ||
      searchParams.get("id") ||
      undefined;
  }

  if (!publicIdOrUrl) {
    return NextResponse.json(
      { error: "Missing public_id or image URL for deletion" },
      { status: 400 }
    );
  }

  try {
    const cleanPublicId = extractPublicIdFromUrl(publicIdOrUrl);
    const delResult = await deleteFromCloudinary(cleanPublicId);

    return NextResponse.json({
      success: true,
      public_id: cleanPublicId,
      result: delResult.result,
    });
  } catch (err: unknown) {
    console.error("Cloudinary delete error:", err);
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
