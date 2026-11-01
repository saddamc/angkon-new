import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";
import { setProducts } from "./stubs/db-state.mjs";

// Redirect the database modules to in-memory stubs so the endpoint tests do
// not require a live MongoDB connection.
const DB_STUBS = {
  "@/lib/mongodb": "tests/stubs/mongodb-stub.mjs",
  "@/models/Product": "tests/stubs/product-stub.mjs",
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return nextResolve("next/server.js", context);
    }
    if (DB_STUBS[specifier]) {
      return nextResolve(pathToFileURL(path.resolve(process.cwd(), DB_STUBS[specifier])).href, context);
    }
    if (specifier.startsWith("@/")) {
      const subpath = specifier.slice(2);
      const target = path.resolve(process.cwd(), "src", subpath);
      let file = target;
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        file = target;
      } else if (fs.existsSync(`${target}.ts`)) {
        file = `${target}.ts`;
      } else if (fs.existsSync(`${target}.json`)) {
        file = `${target}.json`;
      } else {
        file = `${target}/index.ts`;
      }
      return nextResolve(pathToFileURL(file).href, context);
    }
    if (
      !context.parentURL?.includes("node_modules") &&
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[cm]?[jt]s$/.test(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.includes("node_modules") && url.endsWith(".json")) {
      const content = fs.readFileSync(new URL(url), "utf8");
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${content};`,
      };
    }
    return nextLoad(url, context);
  },
});

const meta = await import("../src/lib/integrations/meta/index.ts");
const realProducts = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "src/data/real-products.json"), "utf8")
);

const SAMPLE_BASE_URL = "https://www.angkon.net";

function sampleProduct(overrides = {}) {
  return {
    id: 228001,
    name: "Tawakkal Wada – Midnight Black 3-Piece",
    slug: "tawakkal-wada-midnight-black",
    short_description: "Luxury embroidered three-piece suit with pure organza dupatta.",
    description: "<p>Luxury embroidered three-piece suit crafted with intricate threadwork.</p>",
    price: "8500",
    regular_price: "8500",
    sale_price: "",
    sku: "TW-WD-01",
    stock_status: "instock",
    status: "publish",
    manage_stock: false,
    stock_quantity: null,
    sizes: ["S", "M", "L", "XL"],
    images: [
      {
        id: 1,
        src: "https://res.cloudinary.com/drtzgyetn/image/upload/v1/ANGKON/tawakkal-wada-midnight-black/1.webp",
        alt: "Front view",
      },
      {
        id: 2,
        src: "https://res.cloudinary.com/drtzgyetn/image/upload/v1/ANGKON/tawakkal-wada-midnight-black/2.webp",
        alt: "Back view",
      },
    ],
    categories: [
      { id: 914, name: "Women", slug: "women" },
      { id: 915, name: "Ethnic Wear", slug: "ethnic-wear" },
      { id: 990, name: "Tawakkal Wada", slug: "tawakkal-wada" },
    ],
    attributes: [
      { id: 1, name: "Brand", options: ["Tawakkal"], visible: true },
      { id: 2, name: "Color", options: ["Midnight Black"], visible: true },
      { id: 3, name: "Size", options: ["S", "M", "L", "XL"], visible: true },
    ],
    ...overrides,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * 1. Product Validation Service Tests
 * ────────────────────────────────────────────────────────────────────────── */

test("Validation: valid product returns isValid=true and status=valid", () => {
  const result = meta.validateProduct(sampleProduct(), { baseUrl: SAMPLE_BASE_URL });
  assert.equal(result.isValid, true);
  assert.equal(result.status, "valid");
  assert.equal(result.errors.length, 0);
  assert.equal(result.productId, "228001");
  assert.equal(result.sku, "TW-WD-01");
});

test("Validation: rejects product missing id or with invalid non-numeric id", () => {
  const resultNoId = meta.validateProduct(sampleProduct({ id: undefined }));
  assert.equal(resultNoId.isValid, false);
  assert.ok(resultNoId.errors.includes("missing_or_invalid_id"));

  const resultBadId = meta.validateProduct(sampleProduct({ id: "invalid_abc" }));
  assert.equal(resultBadId.isValid, false);
  assert.ok(resultBadId.errors.includes("missing_or_invalid_id"));
});

test("Validation: accepts wc_post_ prefixed legacy IDs and normalizes them", () => {
  const result = meta.validateProduct(sampleProduct({ id: "wc_post_228005" }));
  assert.equal(result.isValid, true);
  assert.equal(result.productId, "228005");
});

test("Validation: rejects product missing title, description, or slug", () => {
  const noTitle = meta.validateProduct(sampleProduct({ name: "" }));
  assert.equal(noTitle.isValid, false);
  assert.ok(noTitle.errors.includes("missing_title"));

  const noDesc = meta.validateProduct(sampleProduct({ short_description: "", description: "" }));
  assert.equal(noDesc.isValid, false);
  assert.ok(noDesc.errors.includes("missing_description"));

  const noSlug = meta.validateProduct(sampleProduct({ slug: "" }));
  assert.equal(noSlug.isValid, false);
  assert.ok(noSlug.errors.includes("missing_slug"));
});

test("Validation: rejects product missing images or with non-HTTPS image URLs", () => {
  const noImages = meta.validateProduct(sampleProduct({ images: [] }));
  assert.equal(noImages.isValid, false);
  assert.ok(noImages.errors.includes("missing_image"));

  const httpImages = meta.validateProduct(
    sampleProduct({ images: [{ src: "http://example.com/image.jpg" }] })
  );
  assert.equal(httpImages.isValid, false);
  assert.ok(httpImages.errors.includes("invalid_image_url"));
});

test("Validation: rejects product with zero or missing price", () => {
  const zeroPrice = meta.validateProduct(
    sampleProduct({ price: "0", regular_price: "0", sale_price: "" })
  );
  assert.equal(zeroPrice.isValid, false);
  assert.ok(zeroPrice.errors.includes("missing_or_invalid_price"));

  const noPrice = meta.validateProduct(
    sampleProduct({ price: "", regular_price: "", sale_price: "" })
  );
  assert.equal(noPrice.isValid, false);
  assert.ok(noPrice.errors.includes("missing_or_invalid_price"));
});

test("Validation: marks draft, unpublished, and deleted products as excluded", () => {
  const draft = meta.validateProduct(sampleProduct({ status: "draft" }));
  assert.equal(draft.isValid, false);
  assert.equal(draft.status, "excluded");
  assert.ok(draft.errors.includes("status_draft"));

  const deleted = meta.validateProduct(sampleProduct({ deleted: true }));
  assert.equal(deleted.isValid, false);
  assert.equal(deleted.status, "excluded");
  assert.ok(deleted.errors.includes("product_deleted"));

  const unpublished = meta.validateProduct(sampleProduct({ published: false }));
  assert.equal(unpublished.isValid, false);
  assert.equal(unpublished.status, "excluded");
  assert.ok(unpublished.errors.includes("product_unpublished"));
});

/* ──────────────────────────────────────────────────────────────────────────
 * 2. Mapper & Attribute Formatting Tests
 * ────────────────────────────────────────────────────────────────────────── */

test("Mapper: maps price and BDT currency correctly", () => {
  const item = meta.mapProductToMetaCatalogItem(
    sampleProduct({ regular_price: "8500", price: "8500" }),
    { baseUrl: SAMPLE_BASE_URL }
  );
  assert.ok(item);
  assert.equal(item.price, "8500 BDT");
  assert.equal(item.sale_price, undefined);
});

test("Mapper: emits sale_price only when strictly lower than regular price", () => {
  const withDiscount = meta.mapProductToMetaCatalogItem(
    sampleProduct({ regular_price: "10000", sale_price: "8500" }),
    { baseUrl: SAMPLE_BASE_URL }
  );
  assert.ok(withDiscount);
  assert.equal(withDiscount.price, "10000 BDT");
  assert.equal(withDiscount.sale_price, "8500 BDT");

  const invalidSale = meta.mapProductToMetaCatalogItem(
    sampleProduct({ regular_price: "8500", sale_price: "9000" }),
    { baseUrl: SAMPLE_BASE_URL }
  );
  assert.ok(invalidSale);
  assert.equal(invalidSale.price, "8500 BDT");
  assert.equal(invalidSale.sale_price, undefined);
});

test("Mapper: truthfully maps stock availability", () => {
  const inStock = meta.mapProductToMetaCatalogItem(
    sampleProduct({ stock_status: "instock" }),
    { baseUrl: SAMPLE_BASE_URL }
  );
  assert.equal(inStock?.availability, "in stock");

  const outOfStock = meta.mapProductToMetaCatalogItem(
    sampleProduct({ stock_status: "outofstock" }),
    { baseUrl: SAMPLE_BASE_URL }
  );
  assert.equal(outOfStock?.availability, "out of stock");

  const managedZeroStock = meta.mapProductToMetaCatalogItem(
    sampleProduct({ manage_stock: true, stock_quantity: 0, stock_status: "instock" }),
    { baseUrl: SAMPLE_BASE_URL }
  );
  assert.equal(managedZeroStock?.availability, "out of stock");

  const backorder = meta.mapProductToMetaCatalogItem(
    sampleProduct({ stock_status: "onbackorder" }),
    { baseUrl: SAMPLE_BASE_URL }
  );
  assert.equal(backorder?.availability, "available for order");
});

test("Mapper: resolves brand, color, size, gender, and category taxonomy", () => {
  const item = meta.mapProductToMetaCatalogItem(sampleProduct(), { baseUrl: SAMPLE_BASE_URL });
  assert.ok(item);
  assert.equal(item.brand, "Tawakkal");
  assert.equal(item.color, "Midnight Black");
  assert.equal(item.size, "S, M, L, XL");
  assert.equal(item.gender, "female");
  assert.equal(item.condition, "new");
  assert.equal(item.identifier_exists, "yes");
  assert.equal(item.mpn, "TW-WD-01");
  assert.equal(
    item.google_product_category,
    "Apparel & Accessories > Clothing > Traditional & Ceremonial Clothing"
  );
  assert.equal(item.product_type, "Women > Ethnic Wear > Tawakkal Wada");
});

test("Mapper: correctly builds canonical product link and image links", () => {
  const item = meta.mapProductToMetaCatalogItem(sampleProduct(), { baseUrl: SAMPLE_BASE_URL });
  assert.ok(item);
  assert.equal(item.link, "https://www.angkon.net/products/tawakkal-wada-midnight-black");
  assert.equal(
    item.image_link,
    "https://res.cloudinary.com/drtzgyetn/image/upload/v1/ANGKON/tawakkal-wada-midnight-black/1.webp"
  );
  assert.deepEqual(item.additional_image_link, [
    "https://res.cloudinary.com/drtzgyetn/image/upload/v1/ANGKON/tawakkal-wada-midnight-black/2.webp",
  ]);
});

test("Mapper: deduplicates repeated product IDs in batch mapping", () => {
  const products = [
    sampleProduct({ id: 228001 }),
    sampleProduct({ id: 228001, name: "Duplicate Item" }),
    sampleProduct({ id: 228002 }),
  ];

  const { items, duplicates } = meta.mapProductsToMetaCatalog(products, {
    baseUrl: SAMPLE_BASE_URL,
  });

  assert.equal(items.length, 2);
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0], "228001");
});

/* ──────────────────────────────────────────────────────────────────────────
 * 3. Feed Generator & XML Serialization Tests
 * ────────────────────────────────────────────────────────────────────────── */

test("XML Generator: escapes special characters & strips C0 control chars", () => {
  const specialChars = meta.escapeXml("Silk & Cotton <Pure> 'Gold' \"Luxury\"\u0000\u001F");
  assert.equal(specialChars, "Silk &amp; Cotton &lt;Pure&gt; &apos;Gold&apos; &quot;Luxury&quot;");
});

test("XML Generator: generates compliant RSS 2.0 structure with Google Merchant tags", () => {
  const result = meta.generateMetaCatalogFeed([sampleProduct()], {
    baseUrl: SAMPLE_BASE_URL,
  });

  assert.ok(result.xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(result.xml.includes('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"'));
  assert.ok(result.xml.includes("<title>ANGKON Product Catalog Feed</title>"));
  assert.ok(result.xml.includes("<link>https://www.angkon.net</link>"));
  assert.ok(result.xml.includes("<g:id>228001</g:id>"));
  assert.ok(result.xml.includes("<g:title>Tawakkal Wada – Midnight Black 3-Piece</g:title>"));
  assert.ok(result.xml.includes("<g:price>8500 BDT</g:price>"));
  assert.ok(result.xml.includes("<g:availability>in stock</g:availability>"));
  assert.ok(result.xml.includes("<g:brand>Tawakkal</g:brand>"));
  assert.ok(result.xml.includes("<g:condition>new</g:condition>"));
  assert.ok(result.xml.includes("<g:mpn>TW-WD-01</g:mpn>"));
  assert.ok(result.xml.includes("</rss>"));
});

test("Feed Generator: supports pagination correctly", () => {
  const products = [
    sampleProduct({ id: 228001 }),
    sampleProduct({ id: 228002 }),
    sampleProduct({ id: 228003 }),
    sampleProduct({ id: 228004 }),
    sampleProduct({ id: 228005 }),
  ];

  const page1 = meta.generateMetaCatalogFeed(products, {
    baseUrl: SAMPLE_BASE_URL,
    page: 1,
    perPage: 2,
  });

  assert.equal(page1.pagination.page, 1);
  assert.equal(page1.pagination.perPage, 2);
  assert.equal(page1.pagination.totalPages, 3);
  assert.equal(page1.pagination.totalVisible, 2);
  assert.equal(page1.items.length, 2);
  assert.equal(page1.items[0].id, "228001");
  assert.equal(page1.items[1].id, "228002");

  const page3 = meta.generateMetaCatalogFeed(products, {
    baseUrl: SAMPLE_BASE_URL,
    page: 3,
    perPage: 2,
  });

  assert.equal(page3.pagination.page, 3);
  assert.equal(page3.items.length, 1);
  assert.equal(page3.items[0].id, "228005");
});

/* ──────────────────────────────────────────────────────────────────────────
 * 4. Real ANGKON Catalog Verification Test
 * ────────────────────────────────────────────────────────────────────────── */

test("Real Catalog: all active products in real-products.json generate valid feed items", () => {
  assert.ok(Array.isArray(realProducts) && realProducts.length > 0);

  const feedResult = meta.generateMetaCatalogFeed(realProducts, {
    baseUrl: SAMPLE_BASE_URL,
  });

  assert.ok(feedResult.validCount > 0);
  assert.equal(feedResult.items.length, feedResult.validCount);

  for (const item of feedResult.items) {
    assert.ok(/^\d+$/.test(item.id), `ID ${item.id} must be strictly numeric`);
    assert.ok(item.title.length > 0, "Title must not be empty");
    assert.ok(item.description.length > 0, "Description must not be empty");
    assert.ok(item.price.endsWith(" BDT"), `Price ${item.price} must have BDT currency`);
    assert.ok(
      item.link.startsWith("https://www.angkon.net/products/"),
      `Link ${item.link} must be valid canonical URL`
    );
    assert.ok(
      item.image_link.startsWith("https://"),
      `Primary image ${item.image_link} must be secure HTTPS`
    );
    assert.equal(item.condition, "new");
  }
});

/* ──────────────────────────────────────────────────────────────────────────
 * 5. Secure Route & Authentication Tests (GET /api/meta/catalog-feed)
 * ────────────────────────────────────────────────────────────────────────── */

test("API Endpoint: unauthorized when META_CATALOG_FEED_KEY is set and no key provided", async () => {
  const previousKey = process.env.META_CATALOG_FEED_KEY;
  try {
    process.env.META_CATALOG_FEED_KEY = "super-secret-meta-key-2026";
    const { GET } = await import("../src/app/api/meta/catalog-feed/route.ts");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("https://www.angkon.net/api/meta/catalog-feed");
    const res = await GET(req);

    assert.equal(res.status, 401);
    const body = await res.text();
    assert.ok(body.includes("<status>401</status>"));
    assert.ok(body.includes("Unauthorized"));
    assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
  } finally {
    process.env.META_CATALOG_FEED_KEY = previousKey;
  }
});

test("API Endpoint: unauthorized when key is wrong", async () => {
  const previousKey = process.env.META_CATALOG_FEED_KEY;
  try {
    process.env.META_CATALOG_FEED_KEY = "super-secret-meta-key-2026";
    const { GET } = await import("../src/app/api/meta/catalog-feed/route.ts");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest(
      "https://www.angkon.net/api/meta/catalog-feed?feed_key=wrong-key-value"
    );
    const res = await GET(req);

    assert.equal(res.status, 401);
  } finally {
    process.env.META_CATALOG_FEED_KEY = previousKey;
  }
});

test("API Endpoint: authorized with ?feed_key=... returning XML and security headers", async () => {
  const previousKey = process.env.META_CATALOG_FEED_KEY;
  try {
    process.env.META_CATALOG_FEED_KEY = "super-secret-meta-key-2026";
    setProducts([sampleProduct(), sampleProduct({ id: 228002, name: "Tawakkal Wada – Deep Emerald Green 3-Piece", slug: "tawakkal-wada-deep-emerald-green" })]);
    const { GET } = await import("../src/app/api/meta/catalog-feed/route.ts");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest(
      "https://www.angkon.net/api/meta/catalog-feed?feed_key=super-secret-meta-key-2026"
    );
    const res = await GET(req);

    assert.equal(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("application/xml"));
    assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.ok(res.headers.get("x-catalog-total-items"));

    const xml = await res.text();
    assert.ok(xml.includes("<rss version=\"2.0\""));
    assert.ok(xml.includes("ANGKON Product Catalog Feed"));
  } finally {
    setProducts([]);
    process.env.META_CATALOG_FEED_KEY = previousKey;
  }
});

test("API Endpoint: authorized via header x-feed-key and supports format=json", async () => {
  const previousKey = process.env.META_CATALOG_FEED_KEY;
  try {
    process.env.META_CATALOG_FEED_KEY = "super-secret-meta-key-2026";
    setProducts([sampleProduct()]);
    const { GET } = await import("../src/app/api/meta/catalog-feed/route.ts");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("https://www.angkon.net/api/meta/catalog-feed?format=json", {
      headers: { "x-feed-key": "super-secret-meta-key-2026" },
    });
    const res = await GET(req);

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.feed, "ANGKON Meta Catalog Feed Diagnostic");
    assert.ok(json.counts);
    assert.ok(json.items);
    assert.ok(json.pagination);
  } finally {
    setProducts([]);
    process.env.META_CATALOG_FEED_KEY = previousKey;
  }
});

