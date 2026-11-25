/**
 * Dry-run by default: matches products in the active MongoDB database against
 * live assets currently stored in Cloudinary (`ANGKON/`) and optionally repairs
 * stale/404 image URLs.
 *
 * Usage:
 *   npx tsx scripts/sync-product-images-from-cloudinary.ts          # dry-run
 *   npx tsx scripts/sync-product-images-from-cloudinary.ts --apply  # write to active DB
 */
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { bumpCatalogVersion } from "@/lib/catalog-version";
import { extractPublicIdFromUrl } from "@/lib/cloudinary";

interface CloudinaryResourceItem {
  public_id: string;
  asset_folder?: string;
  secure_url: string;
  created_at?: string;
}

async function listAllCloudinaryAssets(): Promise<CloudinaryResourceItem[]> {
  const all: CloudinaryResourceItem[] = [];
  let nextCursor: string | undefined;

  do {
    const res = (await cloudinary.api.resources({
      type: "upload",
      max_results: 500,
      next_cursor: nextCursor,
    })) as { resources?: CloudinaryResourceItem[]; next_cursor?: string };

    if (Array.isArray(res.resources)) {
      all.push(...res.resources);
    }
    nextCursor = res.next_cursor;
  } while (nextCursor);

  return all;
}

function getSlugFromResource(r: CloudinaryResourceItem): string {
  const folder = (r.asset_folder || "").trim();
  if (folder) {
    const parts = folder.split("/").filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  const pidParts = r.public_id.split("/").filter(Boolean);
  return pidParts.length >= 2 ? pidParts[pidParts.length - 2] : "";
}

async function main() {
  const apply = process.argv.includes("--apply");

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Missing CLOUDINARY_* credentials in environment.");
    process.exit(1);
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  await connectToDatabase();
  const assets = await listAllCloudinaryAssets();

  const existingIds = new Set(assets.map((a) => a.public_id));
  const bySlug = new Map<string, CloudinaryResourceItem[]>();

  for (const asset of assets) {
    if (!asset.public_id.startsWith("ANGKON/") && !(asset.asset_folder || "").startsWith("ANGKON/")) {
      continue;
    }
    if ((asset.asset_folder || "").startsWith("ANGKON/CATEGORIES") || asset.public_id.startsWith("ANGKON/CATEGORIES")) {
      continue;
    }
    const slug = getSlugFromResource(asset).toLowerCase();
    if (!slug) continue;
    const list = bySlug.get(slug) || [];
    list.push(asset);
    bySlug.set(slug, list);
  }

  const products = await Product.find({}).sort({ id: 1 }).lean();
  let healthyCount = 0;
  let repairableCount = 0;
  let missingEverywhereCount = 0;
  let updatedCount = 0;

  for (const prod of products) {
    const images = Array.isArray(prod.images) ? prod.images : [];
    const validExisting = images.filter((img) => {
      const pid = extractPublicIdFromUrl(String(img?.src || ""));
      return pid ? existingIds.has(pid) : false;
    });

    if (validExisting.length > 0 && validExisting.length === images.length) {
      healthyCount += 1;
      console.log(`[OK]   ${prod.id} ${prod.slug} (${images.length} images valid)`);
      continue;
    }

    const candidates = (bySlug.get(String(prod.slug || "").toLowerCase()) || []).sort((a, b) =>
      String(a.created_at || "").localeCompare(String(b.created_at || ""))
    );

    if (candidates.length === 0) {
      missingEverywhereCount += 1;
      console.log(`[MISS] ${prod.id} ${prod.slug} — ${validExisting.length}/${images.length} in DB valid, 0 matches in Cloudinary`);
      continue;
    }

    repairableCount += 1;
    const newImages = candidates.map((c, idx) => ({
      id: idx + 1,
      src: c.secure_url,
      alt: String(prod.name || prod.slug),
    }));

    console.log(
      `[FIX]  ${prod.id} ${prod.slug} — DB had ${validExisting.length}/${images.length} valid; Cloudinary has ${newImages.length} (${newImages[0].src})`
    );

    if (apply) {
      await Product.updateOne(
        { _id: prod._id },
        { $set: { images: newImages } }
      );
      updatedCount += 1;
    }
  }

  if (apply && updatedCount > 0) {
    await bumpCatalogVersion();
  }

  console.log(
    `\nSummary (${apply ? "APPLIED" : "DRY-RUN"}): ${healthyCount} healthy, ${repairableCount} repairable (${updatedCount} updated), ${missingEverywhereCount} missing in Cloudinary.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
