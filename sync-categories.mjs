import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL || "").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY || "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET || "";

const wcAuth = () => Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
const WC_HEADERS = {
  Authorization: `Basic ${wcAuth()}`,
  "Content-Type": "application/json",
};

async function wcFetch(endpoint, options = {}) {
  const url = `${WC_BASE}/wp-json/wc/v3/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...WC_HEADERS, ...(options.headers || {}) },
  });
  if (!res.ok) {
    console.error(`Error ${res.status} on ${endpoint}`);
    const text = await res.text();
    console.error(text);
    throw new Error(`WC API Error: ${res.statusText}`);
  }
  return res.json();
}

const CATEGORIES = [
  {
    name: "Men",
    slug: "men",
    sub: [
      { name: "T-Shirts", slug: "men-t-shirts" },
      { name: "Shirts", slug: "men-shirts" },
      { name: "Polos", slug: "men-polos" },
      { name: "Jeans", slug: "men-jeans" },
      { name: "Pants", slug: "men-pants" },
      { name: "Hoodies & Sweatshirts", slug: "men-hoodies-sweatshirts" },
      { name: "Jackets", slug: "men-jackets" },
    ],
  },
  {
    name: "Women",
    slug: "women",
    sub: [
      { name: "Dresses", slug: "women-dresses" },
      { name: "Tops", slug: "women-tops" },
      { name: "T-Shirts", slug: "women-t-shirts" },
      { name: "Shirts", slug: "women-shirts" },
      { name: "Jeans", slug: "women-jeans" },
      { name: "Pants", slug: "women-pants" },
      { name: "Skirts", slug: "women-skirts" },
      { name: "Hoodies & Sweatshirts", slug: "women-hoodies-sweatshirts" },
      { name: "Jackets", slug: "women-jackets" },
    ],
  },
  {
    name: "Kids",
    slug: "kids",
    sub: [
      { name: "Boys", slug: "kids-boys" },
      { name: "Girls", slug: "kids-girls" },
      { name: "Baby", slug: "kids-baby" },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    sub: [
      { name: "Bags", slug: "accessories-bags" },
      { name: "Wallets", slug: "accessories-wallets" },
      { name: "Belts", slug: "accessories-belts" },
      { name: "Caps & Hats", slug: "accessories-caps-hats" },
      { name: "Sunglasses", slug: "accessories-sunglasses" },
      { name: "Watches", slug: "accessories-watches" },
    ],
  },
  {
    name: "Shoes",
    slug: "shoes",
    sub: [
      { name: "Sneakers", slug: "shoes-sneakers" },
      { name: "Formal", slug: "shoes-formal" },
      { name: "Boots", slug: "shoes-boots" },
      { name: "Heels", slug: "shoes-heels" },
    ],
  },
  {
    name: "Beauty",
    slug: "beauty",
    sub: [
      { name: "Makeup", slug: "beauty-makeup" },
      { name: "Skincare", slug: "beauty-skincare" },
      { name: "Fragrance", slug: "beauty-fragrance" },
    ],
  },
  {
    name: "New Arrivals",
    slug: "new-arrivals",
    sub: [],
  },
  {
    name: "Sale",
    slug: "sale",
    sub: [],
  },
];

async function syncCategories() {
  console.log("Fetching existing categories...");
  let existing = [];
  let page = 1;
  while (true) {
    const batch = await wcFetch(`products/categories?per_page=100&page=${page}`);
    if (batch.length === 0) break;
    existing = existing.concat(batch);
    page++;
  }

  console.log(`Found ${existing.length} existing categories.`);

  // Find categories to delete (everything except the "Uncategorized" category which is usually ID 15 or 1, we can delete it or just delete ones not in our target list)
  const targetSlugs = new Set();
  CATEGORIES.forEach(c => {
    targetSlugs.add(c.slug);
    c.sub.forEach(s => targetSlugs.add(s.slug));
  });

  const toDelete = existing.filter(c => !targetSlugs.has(c.slug) && c.slug !== "uncategorized");
  
  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} old categories...`);
    // Delete in batches of 100
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      await wcFetch("products/categories/batch", {
        method: "POST",
        body: JSON.stringify({ delete: batch.map(c => c.id) })
      });
      console.log(`Deleted batch of ${batch.length}`);
    }
  } else {
    console.log("No old categories to delete.");
  }

  // Reload existing after deletion
  existing = await wcFetch(`products/categories?per_page=100`);

  console.log("Creating new categories...");
  
  // Create Main categories
  for (const mainCat of CATEGORIES) {
    let wpMain = existing.find(c => c.slug === mainCat.slug);
    if (!wpMain) {
      console.log(`Creating main category: ${mainCat.name}`);
      wpMain = await wcFetch("products/categories", {
        method: "POST",
        body: JSON.stringify({ name: mainCat.name, slug: mainCat.slug })
      });
    } else {
      console.log(`Main category exists: ${mainCat.name}`);
    }

    // Create Subcategories
    for (const subCat of mainCat.sub) {
      const wpSub = existing.find(c => c.slug === subCat.slug);
      if (!wpSub) {
        console.log(`  Creating sub category: ${subCat.name} (parent: ${wpMain.id})`);
        await wcFetch("products/categories", {
          method: "POST",
          body: JSON.stringify({ name: subCat.name, slug: subCat.slug, parent: wpMain.id })
        });
      } else if (wpSub.parent !== wpMain.id) {
        console.log(`  Updating sub category parent: ${subCat.name}`);
        await wcFetch(`products/categories/${wpSub.id}`, {
          method: "PUT",
          body: JSON.stringify({ parent: wpMain.id })
        });
      }
    }
  }

  console.log("Sync complete!");
}

syncCategories().catch(console.error);
