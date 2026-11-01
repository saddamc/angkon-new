import fs from "node:fs";
import path from "node:path";
import { connectToDatabase } from "../src/lib/mongodb.ts";
import { Product } from "../src/models/Product.ts";

const UPDATES = [
  {
    slug: "tawakkal-wada-deep-raspberry-magenta",
    sku: "TW-WD-07",
    newShortDescription:
      "<p>Discover timeless elegance with the Tawakkal Wada 3-Piece Collection, featuring a vibrant Deep Raspberry Magenta ensemble with delicate soft ivory embroidery and striking monochrome patterns.</p>",
    newDescription:
      "<p>Discover timeless elegance with the Tawakkal Wada 3-Piece Collection, featuring a vibrant Deep Raspberry Magenta ensemble with delicate soft ivory embroidery and striking monochrome patterns.</p><h3>Product Details</h3><ul><li><strong>Brand:</strong> Tawakkal</li><li><strong>Collection:</strong> Wada</li><li><strong>Color:</strong> Deep Raspberry Magenta &amp; Soft Ivory</li><li><strong>Outfit:</strong> 3-Piece Suit</li><li><strong>Kameez:</strong> Deep raspberry magenta long kameez featuring intricate soft ivory floral embroidery along the front and sleeves</li><li><strong>Trouser:</strong> Coordinated black-and-white geometric printed wide-leg trousers</li><li><strong>Dupatta:</strong> Soft ivory coordinated dupatta with delicate floral and geometric motifs</li><li><strong>Style:</strong> Elegant Ethnic / Semi-Formal Wear</li><li><strong>Occasion:</strong> Festive Gatherings, Parties &amp; Special Occasions</li></ul><p>A graceful combination of vibrant raspberry tones, delicate embroidery, and contemporary monochrome prints.</p>",
  },
  {
    slug: "tawakkal-wada-royal-navy-blue",
    sku: "TW-WD-04",
    // Fix typo: "sksjwith" -> "with"
    fixTypoOnly: true,
  },
  {
    slug: "alita-garara-lavender-embroidered-suit",
    sku: "SD-WD-13",
    newShortDescription:
      "<p>Discover timeless elegance with this beautiful ensemble by Aiman, featuring a soothing lavender shade, intricate floral embroidery, delicate embellished details, and a statement garara silhouette.</p>",
    newDescription:
      "<p>Discover timeless elegance with this beautiful ensemble by Aiman, featuring a soothing lavender shade, intricate floral embroidery, delicate embellished details, and a statement garara silhouette.</p><h3>Product Details</h3><ul><li><strong>Brand:</strong> Aiman</li><li><strong>Color:</strong> Lavender with Floral Embroidery Accents</li><li><strong>Outfit:</strong> 3-Piece Garara Suit</li><li><strong>Shirt:</strong> Lavender shirt featuring intricate floral embroidery, embellished neckline, and decorative borders.</li><li><strong>Trouser:</strong> Coordinated flared garara trousers with complementary border detailing.</li><li><strong>Dupatta:</strong> Matching lightweight dupatta with delicate decorative borders.</li><li><strong>Style:</strong> Luxury Festive / Semi-Formal Ethnic Wear</li><li><strong>Occasion:</strong> Weddings, Eid, Festive Celebrations &amp; Special Occasions</li></ul><p>A graceful blend of calming lavender tones and classic garara tailoring, designed for an elegant festive look.</p>",
  },
];

async function run() {
  await connectToDatabase();
  console.log("Connected to MongoDB.");

  // 1. Fetch current documents
  const slugs = UPDATES.map((u) => u.slug);
  const existingDocs = await Product.find({ slug: { $in: slugs } }).lean();

  if (existingDocs.length !== 3) {
    throw new Error(`Expected 3 target documents, found ${existingDocs.length}`);
  }

  // 2. Create backup directory & snapshot file
  const backupDir = path.resolve(process.cwd(), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.resolve(backupDir, `products-pre-update-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(existingDocs, null, 2), "utf-8");
  console.log(`[BACKUP CREATED] Saved ${existingDocs.length} pre-update documents to:\n  ${backupFile}\n`);

  const results = [];

  // 3. Execute surgical updates
  for (const updateConfig of UPDATES) {
    const doc = existingDocs.find((d) => d.slug === updateConfig.slug);
    if (!doc) {
      throw new Error(`Document not found for slug: ${updateConfig.slug}`);
    }

    let finalDesc = updateConfig.newDescription;
    let finalShortDesc = updateConfig.newShortDescription;

    if (updateConfig.fixTypoOnly) {
      finalShortDesc = doc.short_description || "";
      finalDesc = (doc.description || "").replace("sksjwith", "with");
      if (finalDesc === doc.description) {
        console.warn(`[WARN] Typo 'sksjwith' not found in ${doc.slug}, skipping replace`);
      }
    }

    const beforeState = {
      _id: doc._id.toString(),
      slug: doc.slug,
      price: doc.price,
      stock_status: doc.stock_status,
      imagesCount: doc.images?.length || 0,
      short_description: doc.short_description,
      description: doc.description,
    };

    // Update ONLY short_description and description
    await Product.updateOne(
      { _id: doc._id },
      {
        $set: {
          short_description: finalShortDesc,
          description: finalDesc,
        },
      }
    );

    // 4. Verify post-update state
    const afterDoc = await Product.findById(doc._id).lean();

    results.push({
      _id: doc._id.toString(),
      slug: doc.slug,
      before: beforeState,
      after: {
        _id: afterDoc._id.toString(),
        slug: afterDoc.slug,
        price: afterDoc.price,
        stock_status: afterDoc.stock_status,
        imagesCount: afterDoc.images?.length || 0,
        short_description: afterDoc.short_description,
        description: afterDoc.description,
      },
    });

    console.log(`[SUCCESS] Updated ${doc.slug} (ID: ${doc._id})`);
  }

  console.log("\n=== POST-UPDATE VERIFICATION ===");
  for (const r of results) {
    console.log(`\nDocument: ${r.slug} (${r._id})`);
    console.log(`- Price preserved: ${r.before.price} === ${r.after.price} -> ${r.before.price === r.after.price}`);
    console.log(`- Images preserved: ${r.before.imagesCount} === ${r.after.imagesCount} -> ${r.before.imagesCount === r.after.imagesCount}`);
    console.log(`- Stock status preserved: ${r.before.stock_status} === ${r.after.stock_status} -> ${r.before.stock_status === r.after.stock_status}`);
    console.log(`- Description updated: ${r.before.description !== r.after.description}`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
