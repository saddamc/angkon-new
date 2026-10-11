import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL || "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY || "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET || "";
const wcAuth = Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");

const WP_USERNAME = process.env.WP_ADMIN_USERNAME || "";
const WP_APP_PASSWORD = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");
const wpMediaAuth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString("base64");

async function run() {
  try {
    const sourceImage = 'C:\\Users\\Saddam\\.gemini\\antigravity\\brain\\0aa1afeb-a133-4f5d-b2cb-8f918feac2c2\\smartphone_1000_1785872163008.jpg';
    
    // Resize images
    console.log("Resizing images...");
    const img1000Buffer = await sharp(sourceImage).resize(1000, 1000).jpeg().toBuffer();
    const img800Buffer = await sharp(sourceImage).resize(800, 800).jpeg().toBuffer();

    // Upload to WooCommerce media
    console.log("Uploading 1000x1000 image...");
    const res1 = await fetch(`${WC_BASE}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${wpMediaAuth}`,
        "Content-Disposition": `attachment; filename="smartphone_1000.jpg"`,
        "Content-Type": "image/jpeg",
      },
      body: img1000Buffer,
    });
    const media1 = await res1.json();
    console.log("Media 1 ID:", media1.id);

    console.log("Uploading 800x800 image...");
    const res2 = await fetch(`${WC_BASE}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${wpMediaAuth}`,
        "Content-Disposition": `attachment; filename="smartphone_800.jpg"`,
        "Content-Type": "image/jpeg",
      },
      body: img800Buffer,
    });
    const media2 = await res2.json();
    console.log("Media 2 ID:", media2.id);

    // Get categories to find 'smartphones'
    console.log("Fetching categories...");
    const catsRes = await fetch(`${WC_BASE}/wp-json/wc/v3/products/categories?per_page=100`, {
      headers: { Authorization: `Basic ${wcAuth}` }
    });
    const categories = await catsRes.json();
    const smartCat = categories.find(c => c.slug === 'smartphones');
    const catId = smartCat ? smartCat.id : 0;
    console.log("Smartphones category ID:", catId);

    // Create products
    console.log("Creating Product 1...");
    await fetch(`${WC_BASE}/wp-json/wc/v3/products`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${wcAuth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Premium Smartphone (1000x1000)",
        type: "simple",
        regular_price: "85000",
        description: "A premium smartphone with an edge-to-edge display.",
        short_description: "High-end smartphone",
        categories: [{ id: catId }],
        images: [{ id: media1.id }]
      })
    });

    console.log("Creating Product 2...");
    await fetch(`${WC_BASE}/wp-json/wc/v3/products`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${wcAuth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Modern Smartphone (800x800)",
        type: "simple",
        regular_price: "72000",
        description: "A sleek, powerful modern smartphone.",
        short_description: "Modern smartphone",
        categories: [{ id: catId }],
        images: [{ id: media2.id }]
      })
    });

    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
}

run();
