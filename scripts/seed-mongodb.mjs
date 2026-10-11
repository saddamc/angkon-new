import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load environment variables from .env
dotenv.config({ path: path.join(rootDir, ".env") });

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!mongoUri) {
  console.error("❌ MONGODB_URI or DATABASE_URL not found in .env");
  process.exit(1);
}

// Read JSON catalog files
const rawProductsPath = path.join(rootDir, "src", "data", "real-products.json");
const rawCategoriesPath = path.join(rootDir, "src", "data", "real-categories.json");

const rawProducts = JSON.parse(fs.readFileSync(rawProductsPath, "utf-8"));
const rawCategories = JSON.parse(fs.readFileSync(rawCategoriesPath, "utf-8"));

console.log(`📦 Loaded ${rawProducts.length} raw products and ${rawCategories.length} raw categories.`);

async function runSeed() {
  console.log("🔌 Connecting to MongoDB Atlas...");
  await mongoose.connect(mongoUri, { bufferCommands: false });
  console.log("✅ Connected to MongoDB Atlas successfully!");

  const db = mongoose.connection.db;

  // 1. Calculate actual product count per category
  const categoryCounts = new Map();
  for (const prod of rawProducts) {
    if (Array.isArray(prod.categories)) {
      for (const cat of prod.categories) {
        if (cat.id) {
          categoryCounts.set(cat.id, (categoryCounts.get(cat.id) || 0) + 1);
        }
        if (cat.slug) {
          categoryCounts.set(cat.slug, (categoryCounts.get(cat.slug) || 0) + 1);
        }
      }
    }
  }

  // 2. Prepare and seed Categories
  console.log("🚀 Perfecting Categories Data...");
  const categoriesCollection = db.collection("categories");

  // Create indexes on categories
  await categoriesCollection.createIndex({ id: 1 }, { unique: true });
  await categoriesCollection.createIndex({ slug: 1 }, { unique: true });
  await categoriesCollection.createIndex({ parent: 1 });

  const categoryOps = rawCategories.map((c) => {
    const computedCount = categoryCounts.get(c.id) || categoryCounts.get(c.slug) || c.count || 0;
    const perfectedCategory = {
      id: Number(c.id),
      name: String(c.name || "").trim(),
      slug: String(c.slug || "").trim(),
      parent: Number(c.parent || 0),
      description: String(c.description || "").trim(),
      count: computedCount,
      image: c.image
        ? {
            id: c.image.id ? Number(c.image.id) : 0,
            src: String(c.image.src || ""),
            alt: String(c.image.alt || c.name || ""),
          }
        : null,
      updatedAt: new Date(),
    };

    return {
      updateOne: {
        filter: { id: perfectedCategory.id },
        update: {
          $set: perfectedCategory,
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    };
  });

  const catResult = await categoriesCollection.bulkWrite(categoryOps);
  console.log(
    `✅ Categories perfected: ${catResult.upsertedCount} inserted, ${catResult.modifiedCount} updated (Total: ${rawCategories.length})`
  );

  // 3. Prepare and seed Products
  console.log("🚀 Perfecting Products Data...");
  const productsCollection = db.collection("products");

  // Create indexes on products
  await productsCollection.createIndex({ id: 1 }, { unique: true });
  await productsCollection.createIndex({ slug: 1 }, { unique: true });
  await productsCollection.createIndex({ "categories.slug": 1 });
  await productsCollection.createIndex({ "categories.id": 1 });
  await productsCollection.createIndex({ on_sale: 1 });
  await productsCollection.createIndex({ price: 1 });
  await productsCollection.createIndex({ name: "text", description: "text" });

  const productOps = rawProducts.map((p) => {
    // Determine sizes
    let sizes = Array.isArray(p.sizes) ? p.sizes : [];
    if (sizes.length === 0 && Array.isArray(p.attributes)) {
      const sizeAttr = p.attributes.find((a) => a.name?.toLowerCase() === "size");
      if (sizeAttr && Array.isArray(sizeAttr.options)) {
        sizes = sizeAttr.options;
      }
    }

    // Determine prices and on_sale accurately
    const regularPrice = p.regular_price ? String(p.regular_price).trim() : "";
    const salePrice = p.sale_price ? String(p.sale_price).trim() : "";
    let activePrice = p.price ? String(p.price).trim() : "";
    if (!activePrice && salePrice) activePrice = salePrice;
    if (!activePrice && regularPrice) activePrice = regularPrice;

    let isOnSale = Boolean(p.on_sale);
    if (regularPrice && salePrice) {
      const reg = parseFloat(regularPrice);
      const sal = parseFloat(salePrice);
      if (!isNaN(reg) && !isNaN(sal) && sal < reg) {
        isOnSale = true;
      }
    } else if (regularPrice && activePrice) {
      const reg = parseFloat(regularPrice);
      const act = parseFloat(activePrice);
      if (!isNaN(reg) && !isNaN(act) && act < reg) {
        isOnSale = true;
      }
    }

    // Stock status
    let stockStatus = p.stock_status || "instock";
    if (!["instock", "outofstock", "onbackorder"].includes(stockStatus)) {
      stockStatus = "instock";
    }

    const perfectedProduct = {
      id: Number(p.id),
      name: String(p.name || "").trim(),
      slug: String(p.slug || "").trim(),
      permalink: String(p.permalink || ""),
      description: String(p.description || "").trim(),
      short_description: String(p.short_description || "").trim(),
      price: activePrice,
      regular_price: regularPrice,
      sale_price: salePrice,
      on_sale: isOnSale,
      stock_status: stockStatus,
      sizes: sizes.map((s) => String(s).trim()),
      images: Array.isArray(p.images)
        ? p.images.map((img) => ({
            id: img.id ? Number(img.id) : 0,
            src: String(img.src || ""),
            name: String(img.name || ""),
            alt: String(img.alt || p.name || ""),
          }))
        : [],
      categories: Array.isArray(p.categories)
        ? p.categories.map((c) => ({
            id: Number(c.id),
            name: String(c.name || "").trim(),
            slug: String(c.slug || "").trim(),
            parent: Number(c.parent || 0),
          }))
        : [],
      tags: Array.isArray(p.tags)
        ? p.tags.map((t) => ({
            id: Number(t.id),
            name: String(t.name || "").trim(),
            slug: String(t.slug || "").trim(),
          }))
        : [],
      attributes: Array.isArray(p.attributes)
        ? p.attributes.map((a) => ({
            id: Number(a.id || 0),
            name: String(a.name || "").trim(),
            options: Array.isArray(a.options) ? a.options.map((o) => String(o).trim()) : [],
            visible: a.visible !== false,
          }))
        : [],
      sku: String(p.sku || "").trim(),
      weight: String(p.weight || "").trim(),
      shipping_class_id: Number(p.shipping_class_id || 0),
      stock_quantity: typeof p.stock_quantity === "number" ? p.stock_quantity : null,
      meta_data: Array.isArray(p.meta_data)
        ? p.meta_data.map((m) => ({
            id: Number(m.id || 0),
            key: String(m.key || "").trim(),
            value: typeof m.value === "object" ? JSON.stringify(m.value) : String(m.value || ""),
          }))
        : [],
      updatedAt: new Date(),
    };

    return {
      updateOne: {
        filter: { id: perfectedProduct.id },
        update: {
          $set: perfectedProduct,
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    };
  });

  const prodResult = await productsCollection.bulkWrite(productOps);
  console.log(
    `✅ Products perfected: ${prodResult.upsertedCount} inserted, ${prodResult.modifiedCount} updated (Total: ${rawProducts.length})`
  );

  // 4. Verification Check
  const totalInDb = await productsCollection.countDocuments();
  const totalCatsInDb = await categoriesCollection.countDocuments();
  const onSaleInDb = await productsCollection.countDocuments({ on_sale: true });

  console.log("\n================ MONGODB DATA AUDIT ================");
  console.log(`📊 Total Products in MongoDB Atlas:   ${totalInDb}`);
  console.log(`📊 Total Categories in MongoDB Atlas: ${totalCatsInDb}`);
  console.log(`🔥 On-Sale Products in MongoDB Atlas: ${onSaleInDb}`);
  console.log("====================================================\n");

  await mongoose.disconnect();
  console.log("🏁 Migration & Data Perfection Completed Successfully!");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed with error:", err);
  process.exit(1);
});
