import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

/**
 * Stage 3A — Meta Commerce catalog feed.
 *
 * The production modules are TypeScript with bundler-style extensionless
 * imports. Node 24 can strip the types, so a tiny resolve hook lets the test
 * exercise the real implementation instead of a handwritten replica.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("./") && !/\.[cm]?[jt]s$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const catalog = await import("../src/lib/meta-catalog.ts");
const ids = await import("../src/lib/meta-product-id.ts");

const {
  buildCatalogFeed,
  buildFeedUrl,
  escapeXml,
  generateCatalogXml,
  getProductExclusionReason,
  htmlToPlainText,
  normalizeMetaProductId,
  resolveGoogleProductCategory,
  resolveProductionBaseUrl,
  resolvePublicBaseUrl,
  validateAbsoluteUrl,
} = {
  ...catalog,
  normalizeMetaProductId: ids.normalizeMetaProductId,
};

const BASE = "https://angkon.com.bd";

function product(overrides = {}) {
  return {
    id: 228001,
    name: "Handwoven Jamdani Saree",
    slug: "handwoven-jamdani-saree",
    short_description: "Authentic handwoven saree from Bangladesh.",
    price: "12500",
    regular_price: "12500",
    sku: "ANG-JAM-001",
    stock_status: "instock",
    images: [{ src: "https://res.cloudinary.com/angkon/image/upload/saree.jpg" }],
    categories: [{ id: 12, name: "Saree", slug: "saree" }],
    attributes: [{ name: "color", options: ["Maroon"] }],
    updatedAt: "2026-10-01T10:00:00.000Z",
    ...overrides,
  };
}

/* ── URL resolution ─────────────────────────────────────────────────────── */

test("production URL resolution rejects localhost and non-HTTPS origins", () => {
  const production = resolvePublicBaseUrl({
    nodeEnv: "production",
    env: {
      NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
      SITE_URL: "http://angkon.com.bd",
      APP_URL: "https://shop.angkon.com.bd",
    },
  });

  assert.equal(production.baseUrl, "https://shop.angkon.com.bd");
  assert.equal(production.source, "APP_URL");
  assert.equal(production.isPublicHttps, true);
  assert.ok(production.warnings.some((warning) => warning.includes("NEXT_PUBLIC_SITE_URL")));
  assert.ok(production.warnings.some((warning) => warning.includes("SITE_URL")));
});

test("an explicit META_CATALOG_BASE_URL takes priority", () => {
  const production = resolvePublicBaseUrl({
    nodeEnv: "production",
    env: {
      META_CATALOG_BASE_URL: "https://catalog.angkon.com.bd",
      NEXT_PUBLIC_SITE_URL: "https://angkon.com.bd",
    },
  });

  assert.equal(production.baseUrl, "https://catalog.angkon.com.bd");
  assert.equal(production.source, "META_CATALOG_BASE_URL");
});

test("production URL resolution never falls back to localhost", () => {
  const production = resolvePublicBaseUrl({
    nodeEnv: "production",
    env: { NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000" },
  });

  assert.equal(production.baseUrl, "https://www.angkon.net");
  assert.equal(production.source, "default-production-domain");
  assert.equal(production.isLocal, false);
  assert.equal(production.isPublicHttps, true);
});

test("production scheduled-feed URL always resolves to public HTTPS", () => {
  const resolved = resolveProductionBaseUrl({
    NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
    APP_URL: "https://shop.angkon.com.bd",
  });

  assert.equal(resolved.baseUrl, "https://shop.angkon.com.bd");
  assert.equal(resolved.isPublicHttps, true);
  assert.equal(buildFeedUrl(resolved.baseUrl), "https://shop.angkon.com.bd/api/meta/catalog");
});

test("development may use the request origin for preview links", () => {
  const development = resolvePublicBaseUrl({
    nodeEnv: "development",
    requestOrigin: "http://localhost:3001",
    env: {},
  });

  assert.equal(development.baseUrl, "http://localhost:3001");
  assert.equal(development.isLocal, true);
  assert.equal(development.isPublicHttps, false);
});

test("development bind addresses become browsable localhost preview links", () => {
  const development = resolvePublicBaseUrl({
    nodeEnv: "development",
    requestOrigin: "http://0.0.0.0:3001",
    env: {},
  });

  assert.equal(development.baseUrl, "http://localhost:3001");
  assert.equal(development.source, "request-origin");
});

test("absolute URL validation rejects unsafe and private destinations", () => {
  assert.equal(
    validateAbsoluteUrl("https://res.cloudinary.com/a.jpg"),
    "https://res.cloudinary.com/a.jpg"
  );
  assert.equal(validateAbsoluteUrl("http://res.cloudinary.com/a.jpg"), null);
  assert.equal(validateAbsoluteUrl("javascript:alert(1)"), null);
  assert.equal(validateAbsoluteUrl("https://127.0.0.1/a.jpg"), null);
  assert.equal(validateAbsoluteUrl("https://localhost./a.jpg"), null);
  assert.equal(validateAbsoluteUrl("https://[::ffff:127.0.0.1]/a.jpg"), null);
  assert.equal(validateAbsoluteUrl("https://user:pass@example.com/a.jpg"), null);
  assert.equal(
    validateAbsoluteUrl("http://localhost:3001/a.jpg", { allowLocalHttp: true }),
    "http://localhost:3001/a.jpg"
  );
});

/* ── Product identifiers ───────────────────────────────────────────────── */

test("wc_post_ identifiers are normalized to the numeric product id", () => {
  assert.equal(normalizeMetaProductId("wc_post_228001"), "228001");
  assert.equal(normalizeMetaProductId("WC_POST_228001"), "228001");
  assert.equal(normalizeMetaProductId(228001), "228001");
  assert.equal(normalizeMetaProductId("wc_post_not-a-number"), null);
  assert.equal(normalizeMetaProductId(0), null);
  assert.equal(normalizeMetaProductId(""), null);
});

test("feed ids, Pixel ids, and CAPI ids resolve to the same value", () => {
  const legacy = "wc_post_228001";
  const feedId = normalizeMetaProductId(legacy);
  const pixelIds = ids.normalizeMetaContentIds([legacy, 228001, "wc_post_228001"]);
  const capiIds = ids.normalizeMetaContentIds([legacy]);

  assert.equal(feedId, "228001");
  assert.deepEqual(pixelIds, ["228001"]);
  assert.deepEqual(capiIds, ["228001"]);
});

/* ── Visibility ────────────────────────────────────────────────────────── */

test("draft, private, deleted, and inactive products are excluded", () => {
  assert.equal(getProductExclusionReason({ status: "draft" }), "status_draft");
  assert.equal(getProductExclusionReason({ status: "private" }), "status_private");
  assert.equal(getProductExclusionReason({ visibility: "hidden" }), "visibility_hidden");
  assert.equal(
    getProductExclusionReason({ catalog_visibility: "search" }),
    "catalog_visibility_search"
  );
  assert.equal(getProductExclusionReason({ published: false }), "unpublished");
  assert.equal(getProductExclusionReason({ is_active: false }), "inactive");
  assert.equal(getProductExclusionReason({ deleted: true }), "deleted");
  assert.equal(
    getProductExclusionReason({ deletedAt: "2026-01-01T00:00:00.000Z" }),
    "deleted"
  );
  assert.equal(getProductExclusionReason({ status: "publish" }), null);
  assert.equal(getProductExclusionReason({}), null);
});

/* ── Validation and mapping ────────────────────────────────────────────── */

test("a valid product produces a complete Meta feed item", () => {
  const result = buildCatalogFeed([product()], { baseUrl: BASE });
  assert.equal(result.counts.validItems, 1);
  assert.equal(result.counts.invalidItems, 0);

  const [item] = result.items;
  assert.equal(item.id, "228001");
  assert.equal(item.link, "https://angkon.com.bd/products/handwoven-jamdani-saree");
  assert.equal(item.imageLink, "https://res.cloudinary.com/angkon/image/upload/saree.jpg");
  assert.equal(item.price, "12500.00 BDT");
  assert.equal(item.availability, "in stock");
  assert.equal(item.condition, "new");
  assert.equal(item.brand, "ANGKON");
  assert.equal(item.mpn, "ANG-JAM-001");
  assert.equal(item.identifierExists, true);
  assert.equal(item.googleProductCategory, "Apparel & Accessories > Clothing > Dresses");
  assert.equal(item.color, "Maroon");
  assert.equal(result.allLinksPublicHttps, true);
  assert.equal(result.latestProductUpdatedAt, "2026-10-01T10:00:00.000Z");
});

test("sale prices are emitted as price plus sale_price", () => {
  const result = buildCatalogFeed(
    [product({ price: "9000", regular_price: "12500", sale_price: "9000", on_sale: true })],
    { baseUrl: BASE }
  );

  assert.equal(result.items[0].price, "12500.00 BDT");
  assert.equal(result.items[0].salePrice, "9000.00 BDT");
});

test("missing or zero price is rejected", () => {
  for (const price of [undefined, "", "0", "free"]) {
    const result = buildCatalogFeed(
      [product({ price, regular_price: price, sale_price: undefined })],
      { baseUrl: BASE }
    );
    assert.equal(result.counts.validItems, 0, `price ${String(price)} must be invalid`);
    assert.equal(result.counts.invalidItems, 1);
    assert.ok(result.invalid[0].reasons.includes("missing_or_invalid_price"));
  }
});

test("invalid image URLs are rejected instead of emitted", () => {
  const result = buildCatalogFeed(
    [product({ images: [{ src: "http://insecure.example.com/a.jpg" }] })],
    { baseUrl: BASE }
  );

  assert.equal(result.counts.validItems, 0);
  assert.ok(result.invalid[0].reasons.includes("missing_or_invalid_image_url"));
});

test("mixed images keep only public HTTPS sources", () => {
  const result = buildCatalogFeed(
    [
      product({
        images: [
          { src: "http://insecure.example.com/a.jpg" },
          { src: "https://res.cloudinary.com/angkon/b.jpg" },
          { src: "https://res.cloudinary.com/angkon/c.jpg" },
        ],
      }),
    ],
    { baseUrl: BASE }
  );

  assert.equal(result.items[0].imageLink, "https://res.cloudinary.com/angkon/b.jpg");
  assert.deepEqual(result.items[0].additionalImageLinks, [
    "https://res.cloudinary.com/angkon/c.jpg",
  ]);
});

test("missing title, description, slug, or id is rejected", () => {
  const result = buildCatalogFeed(
    [
      product({ id: undefined }),
      product({ name: "" }),
      product({ short_description: "", description: "" }),
      product({ slug: "" }),
    ],
    { baseUrl: BASE }
  );

  assert.equal(result.counts.validItems, 0);
  assert.equal(result.counts.invalidItems, 4);
  assert.ok(result.invalid[0].reasons.includes("missing_or_invalid_product_id"));
  assert.ok(result.invalid[1].reasons.includes("missing_title"));
  assert.ok(result.invalid[2].reasons.includes("missing_description"));
  assert.ok(result.invalid[3].reasons.includes("missing_or_invalid_product_link"));
});

test("duplicate ids emit one item and are reported", () => {
  const result = buildCatalogFeed(
    [product({ id: 1001 }), product({ id: "wc_post_1001", name: "Duplicate product" })],
    { baseUrl: BASE }
  );

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "1001");
  assert.deepEqual(result.duplicateIds, ["1001"]);
  assert.equal(result.counts.duplicateItems, 1);
  assert.ok(result.invalid[0].reasons.includes("duplicate_product_id"));
});

test("a malformed row does not shadow a later valid row with the same id", () => {
  const result = buildCatalogFeed(
    [product({ id: 2002, images: [] }), product({ id: 2002, name: "Valid twin" })],
    { baseUrl: BASE }
  );

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "2002");
  assert.deepEqual(result.duplicateIds, ["2002"]);
});

test("excluded products never reach the feed", () => {
  const result = buildCatalogFeed(
    [
      product({ id: 1, status: "draft" }),
      product({ id: 2, published: false }),
      product({ id: 3, visibility: "private" }),
      product({ id: 4, deleted: true }),
      product({ id: 5 }),
    ],
    { baseUrl: BASE }
  );

  assert.equal(result.counts.excludedItems, 4);
  assert.deepEqual(
    result.items.map((item) => item.id),
    ["5"]
  );
});

test("availability and stock quantity are mapped truthfully", () => {
  const out = buildCatalogFeed(
    [product({ id: 1, stock_status: "outofstock" })],
    { baseUrl: BASE }
  );
  assert.equal(out.items[0].availability, "out of stock");

  const managed = buildCatalogFeed(
    [product({ id: 2, stock_status: "instock", manage_stock: true, stock_quantity: 0 })],
    { baseUrl: BASE }
  );
  assert.equal(managed.items[0].availability, "out of stock");

  const backorder = buildCatalogFeed(
    [product({ id: 3, stock_status: "onbackorder" })],
    { baseUrl: BASE }
  );
  assert.equal(backorder.items[0].availability, "available for order");
});

test("category mapping reports unmapped products instead of claiming coverage", () => {
  assert.equal(resolveGoogleProductCategory(product({ categories: [], name: "Mystery item" })).category, null);

  const result = buildCatalogFeed(
    [product({ id: 9, name: "Mystery item", categories: [] })],
    { baseUrl: BASE }
  );
  assert.equal(result.categoryCoverage.mapped, 0);
  assert.equal(result.categoryCoverage.unmapped, 1);
  assert.equal(result.items[0].googleProductCategory, undefined);
});

test("product type is derived from real store categories", () => {
  const result = buildCatalogFeed(
    [product({ categories: [{ name: "Women" }, { name: "Saree" }] })],
    { baseUrl: BASE }
  );

  assert.equal(result.items[0].productType, "Women > Saree");
});

/* ── XML safety ────────────────────────────────────────────────────────── */

test("XML escaping neutralizes markup and control characters", () => {
  assert.equal(escapeXml(`A & B <tag> "quoted" 'single'`), "A &amp; B &lt;tag&gt; &quot;quoted&quot; &apos;single&apos;");
  assert.equal(escapeXml("bad\u0000\u0007text"), "badtext");
  assert.equal(htmlToPlainText("<p>Hello <strong>world</strong></p><script>alert(1)</script>"), "Hello world");
});

test("generated XML is well-formed enough for RSS consumers", () => {
  const result = buildCatalogFeed(
    [
      product({
        id: 3003,
        name: `Saree & <em>Shawl</em> "Special"`,
        short_description: `A & B <script>alert("x")</script> description`,
      }),
    ],
    { baseUrl: BASE }
  );

  const xml = generateCatalogXml(result.items, {
    baseUrl: BASE,
    feedUrl: `${BASE}/api/meta/catalog`,
    generatedAt: "2026-10-30T00:00:00.000Z",
  });

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<rss version="2\.0" xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  assert.match(xml, /<g:id>3003<\/g:id>/);
  assert.match(xml, /<g:price>12500\.00 BDT<\/g:price>/);
  assert.match(xml, /<g:identifier_exists>yes<\/g:identifier_exists>/);
  assert.ok(xml.includes("Saree &amp; Shawl &quot;Special&quot;"));
  assert.ok(!xml.includes("<script>"));
  assert.ok(!xml.includes("A & B"));
  assert.match(xml, /<\/rss>\s*$/);
});

test("identifier_exists is no when no unique identifier is available", () => {
  const result = buildCatalogFeed([product({ sku: "" })], { baseUrl: BASE });
  const xml = generateCatalogXml(result.items, {
    baseUrl: BASE,
    feedUrl: `${BASE}/api/meta/catalog`,
  });

  assert.match(xml, /<g:identifier_exists>no<\/g:identifier_exists>/);
  assert.doesNotMatch(xml, /<g:mpn>/);
});

test("a base URL path prefix is preserved in product links", () => {
  const result = buildCatalogFeed([product()], { baseUrl: "https://angkon.com.bd/shop" });
  assert.equal(
    result.items[0].link,
    "https://angkon.com.bd/shop/products/handwoven-jamdani-saree"
  );
});

test("local development previews may emit localhost product links", () => {
  const result = buildCatalogFeed([product()], {
    baseUrl: "http://localhost:3001",
    allowLocalHttp: true,
  });

  assert.equal(result.items[0].link, "http://localhost:3001/products/handwoven-jamdani-saree");
  assert.equal(result.allLinksPublicHttps, false);
});

test("production build never emits localhost links even for valid products", () => {
  const result = buildCatalogFeed([product()], { baseUrl: "http://localhost:3001" });
  assert.equal(result.counts.validItems, 0);
  assert.ok(result.invalid[0].reasons.includes("missing_or_invalid_product_link"));
});
