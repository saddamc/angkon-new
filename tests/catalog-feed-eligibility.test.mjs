import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

/* ──────────────────────────────────────────────────────────────────────────
 * Module hooks: resolve the `@/` alias and redirect the database modules to
 * in-memory stubs so the endpoint can be exercised without a live MongoDB.
 * ────────────────────────────────────────────────────────────────────────── */

const DB_STUBS = {
  "@/lib/mongodb": "tests/stubs/mongodb-stub.mjs",
  "@/models/Product": "tests/stubs/product-stub.mjs",
};

function resolveAlias(specifier) {
  const target = path.resolve(process.cwd(), "src", specifier.slice(2));
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  if (fs.existsSync(`${target}.ts`)) return `${target}.ts`;
  if (fs.existsSync(`${target}.json`)) return `${target}.json`;
  return `${target}/index.ts`;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return nextResolve("next/server.js", context);
    }
    if (DB_STUBS[specifier]) {
      return nextResolve(pathToFileURL(path.resolve(process.cwd(), DB_STUBS[specifier])).href, context);
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(pathToFileURL(resolveAlias(specifier)).href, context);
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
      return { format: "module", shortCircuit: true, source: `export default ${content};` };
    }
    return nextLoad(url, context);
  },
});

const { GET } = await import("../src/app/api/meta/catalog-feed/route.ts");
const { NextRequest } = await import("next/server");
const { setProducts, setDatabaseFailure, resetDb } = await import("./stubs/db-state.mjs");
const { matchesFilter } = await import("./stubs/product-stub.mjs");
const { buildCatalogVisibilityFilter } = await import("../src/server/meta-catalog.ts");

const FEED_KEY = "unit-test-feed-key";
const SNAPSHOT_NAMES = ["Tawakkal Wada", "Safaidah", "Gulnaar", "Shabnam"];

/* ──────────────────────────────────────────────────────────────────────────
 * Fixtures — shaped like the real ANGKON documents: no `status` field at all.
 * ────────────────────────────────────────────────────────────────────────── */

function makeProduct(id, overrides = {}) {
  return {
    id,
    name: `ANGKON Suit ${id}`,
    slug: `angkon-suit-${id}`,
    short_description: `Embroidered three piece suit ${id}.`,
    description: `<p>Premium embroidered suit, item ${id}.</p>`,
    price: "7990",
    regular_price: "7990",
    sale_price: "",
    sku: `AK-${id}`,
    stock_status: "instock",
    manage_stock: false,
    stock_quantity: null,
    images: [
      {
        id: 1,
        src: `https://res.cloudinary.com/demo/image/upload/v1/ANGKON/${id}-front.webp`,
        alt: "Front view",
      },
    ],
    categories: [{ id: 914, name: "Women", slug: "women" }],
    attributes: [
      { id: 1, name: "Brand", options: ["ANGKON"], visible: true },
      { id: 2, name: "Color", options: ["Black"], visible: true },
      { id: 3, name: "Size", options: ["S", "M", "L"], visible: true },
    ],
    ...overrides,
  };
}

/** The 16 products ANGKON actually holds (IDs 228001-228016). */
function catalogOf16() {
  return Array.from({ length: 16 }, (_, index) => makeProduct(228001 + index));
}

function feedRequest(query = "") {
  return new NextRequest(`https://www.angkon.net/api/meta/catalog-feed?feed_key=${FEED_KEY}${query}`);
}

function extractIds(xml) {
  return [...xml.matchAll(/<g:id>([^<]*)<\/g:id>/g)].map((match) => match[1]);
}

async function withSilentLogging(fn) {
  const original = console.warn;
  console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.warn = original;
  }
}

// Keep link assertions deterministic regardless of the developer's shell.
const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

before(() => {
  process.env.META_CATALOG_FEED_KEY = FEED_KEY;
  process.env.NEXT_PUBLIC_SITE_URL = "";
  resetDb();
});

after(() => {
  if (ORIGINAL_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
});

/* ──────────────────────────────────────────────────────────────────────────
 * 1. Regression: the original production bug exported only 7 of 16 products.
 * ────────────────────────────────────────────────────────────────────────── */

test("all 16 eligible products appear in the generated XML", async () => {
  setProducts(catalogOf16());

  const res = await GET(feedRequest());
  assert.equal(res.status, 200);

  const xml = await res.text();
  const ids = extractIds(xml);

  assert.equal(ids.length, 16, `expected 16 <g:id> entries, received ${ids.length}`);
  for (let index = 0; index < 16; index += 1) {
    assert.ok(ids.includes(String(228001 + index)), `product ${228001 + index} is missing from the feed`);
  }

  assert.equal(res.headers.get("x-catalog-total-items"), "16");
  assert.equal(res.headers.get("x-catalog-valid-items"), "16");
});

test("products that never carry a `status` field are still exported", async () => {
  // Every ANGKON document has `status` absent. The old query filtered on it,
  // matched nothing, and served a stale snapshot instead.
  setProducts(catalogOf16());
  const filter = buildCatalogVisibilityFilter();

  for (const doc of catalogOf16()) {
    assert.equal("status" in doc, false, "fixture must not declare status");
    assert.equal(matchesFilter(doc, filter), true, `product ${doc.id} should match the canonical filter`);
  }
});

test("XML keeps numeric IDs, product links, image links, price and availability", async () => {
  setProducts(catalogOf16());

  const xml = await (await GET(feedRequest())).text();

  assert.ok(xml.includes("<g:id>228016</g:id>"), "highest id must be present");
  assert.ok(xml.includes("https://www.angkon.net/products/angkon-suit-228001"));
  assert.ok(xml.includes("https://res.cloudinary.com/demo/image/upload/v1/ANGKON/228001-front.webp"));
  assert.ok(xml.includes("<g:price>7990 BDT</g:price>"), "BDT currency must be preserved");
  assert.ok(xml.includes("<g:availability>in stock</g:availability>"));
  assert.ok(xml.includes("xmlns:g=\"http://base.google.com/ns/1.0\""));
});

/* ──────────────────────────────────────────────────────────────────────────
 * 2. New products must flow through without a code or data deploy.
 * ────────────────────────────────────────────────────────────────────────── */

test("products created after the previous fetch are exported automatically", async () => {
  setProducts(catalogOf16());

  const firstIds = extractIds(await (await GET(feedRequest())).text());
  assert.equal(firstIds.length, 16);
  assert.ok(!firstIds.includes("228017"));

  // A new product is added to the store.
  setProducts([...catalogOf16(), makeProduct(228017, { name: "New Arrival Suit" })]);

  const secondXml = await (await GET(feedRequest())).text();
  const secondIds = extractIds(secondXml);

  assert.equal(secondIds.length, 17);
  assert.ok(secondIds.includes("228017"), "a newly created product must appear without redeploying");
  assert.ok(secondXml.includes("New Arrival Suit"));

  // ...and a deleted product disappears just as promptly.
  setProducts(catalogOf16().slice(0, 16));
  const thirdIds = extractIds(await (await GET(feedRequest())).text());
  assert.equal(thirdIds.length, 16);
  assert.ok(!thirdIds.includes("228017"), "removed products must not be served from a stale snapshot");
});

/* ──────────────────────────────────────────────────────────────────────────
 * 3. Canonical visibility rules must keep excluding unpublished inventory.
 * ────────────────────────────────────────────────────────────────────────── */

test("products excluded by the canonical visibility rules are omitted", async () => {
  setProducts([
    makeProduct(1001), // no flags at all -> eligible
    makeProduct(1002, { status: "draft" }),
    makeProduct(1003, { status: "private" }),
    makeProduct(1004, { published: false }),
    makeProduct(1005, { isPublished: false }),
    makeProduct(1006, { is_active: false }),
    makeProduct(1007, { visibility: "hidden" }),
    makeProduct(1008, { catalog_visibility: "hidden" }),
    makeProduct(1009, { deleted: true }),
    makeProduct(1010, { deletedAt: "2026-10-01T00:00:00.000Z" }),
    makeProduct(1011, { status: "publish" }),
    makeProduct(1012, { published: true }),
  ]);

  const xml = await (await GET(feedRequest())).text();
  const ids = extractIds(xml);

  // Explicitly eligible documents.
  for (const id of [1001, 1011, 1012]) {
    assert.ok(ids.includes(String(id)), `product ${id} should be exported`);
  }

  // Explicitly excluded documents.
  for (const id of [1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010]) {
    assert.ok(!ids.includes(String(id)), `product ${id} must stay out of the Meta feed`);
  }

  assert.equal(countItems(xml), 3, "only the three eligible products should be emitted");
});

// Counts emitted <item> elements.
function countItems(xml) {
  return (xml.match(/<item>/g) || []).length;
}

/* ──────────────────────────────────────────────────────────────────────────
 * 4. The stale `real-products.json` fallback must be gone.
 * ────────────────────────────────────────────────────────────────────────── */

test("an empty database returns a 503 diagnostic, never the stale snapshot", async () => {
  setProducts([]);

  const res = await withSilentLogging(() => GET(feedRequest()));
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("x-catalog-reason"), "no-eligible-products");
  assert.equal(res.headers.get("cache-control"), "no-store");

  const body = await res.text();
  assert.equal((body.match(/<item>/g) || []).length, 0, "an empty feed must not advertise zero items to Meta");
  assert.ok(body.includes("<channel>"), "the body must stay parseable XML so Meta retries instead of deleting");

  for (const name of SNAPSHOT_NAMES) {
    assert.ok(!body.includes(name), `stale snapshot product "${name}" leaked into the feed`);
  }
});

test("an empty database also fails the JSON diagnostic instead of returning snapshot rows", async () => {
  setProducts([]);

  const res = await withSilentLogging(() => GET(feedRequest("&format=json")));
  assert.equal(res.status, 503);

  const json = await res.json();
  assert.equal(json.reason, "no-eligible-products");
  assert.equal(json.items, undefined, "no snapshot products may be reported");
});

test("a database failure returns 503 without leaking driver details", async () => {
  setDatabaseFailure(true);

  const res = await withSilentLogging(() => GET(feedRequest()));
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("x-catalog-reason"), "database-unavailable");

  const body = await res.text();
  for (const secret of ["MONGODB_URI", "simulated connection failure", "cluster0", "stack"]) {
    assert.ok(!body.includes(secret), `response must not expose "${secret}"`);
  }
  for (const name of SNAPSHOT_NAMES) {
    assert.ok(!body.includes(name), `stale snapshot product "${name}" leaked during an outage`);
  }
});

/* ──────────────────────────────────────────────────────────────────────────
 * 5. Authorization and response shape are unchanged.
 * ────────────────────────────────────────────────────────────────────────── */

test("unauthorized requests still return 401", async () => {
  setProducts(catalogOf16());

  const missingKey = await GET(new NextRequest("https://www.angkon.net/api/meta/catalog-feed"));
  assert.equal(missingKey.status, 401);
  assert.ok((await missingKey.text()).includes("<status>401</status>"));

  const wrongKey = await GET(
    new NextRequest("https://www.angkon.net/api/meta/catalog-feed?feed_key=not-the-key")
  );
  assert.equal(wrongKey.status, 401);
});

test("authorized requests return valid Meta-compliant XML with security headers", async () => {
  setProducts(catalogOf16());

  const res = await GET(feedRequest());
  assert.equal(res.status, 200);
  assert.ok(res.headers.get("content-type")?.includes("application/xml"));
  assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");

  const xml = await res.text();
  assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
  assert.ok(xml.includes("<rss version=\"2.0\""));
  assert.ok(xml.includes("<channel>"));
  assert.ok(xml.includes("ANGKON Product Catalog Feed"));
  assert.ok(xml.includes("<g:title>"));
  assert.ok(xml.includes("<g:description>"));
  assert.ok(xml.includes("<g:link>"));
  assert.ok(xml.includes("<g:image_link>"));
  assert.ok(xml.includes("<g:brand>"));
  assert.ok(xml.includes("<g:condition>"));
});

test("the x-feed-key header still authorizes requests", async () => {
  setProducts(catalogOf16());

  const res = await GET(
    new NextRequest("https://www.angkon.net/api/meta/catalog-feed", {
      headers: { "x-feed-key": FEED_KEY },
    })
  );

  assert.equal(res.status, 200);
  assert.equal(extractIds(await res.text()).length, 16);
});

/* ──────────────────────────────────────────────────────────────────────────
 * 6. Pagination must never drop products.
 * ────────────────────────────────────────────────────────────────────────── */

test("pagination returns every product across all pages", async () => {
  setProducts(catalogOf16());

  const collected = new Set();
  let page = 1;
  let totalPages = 1;

  do {
    const res = await GET(feedRequest(`&per_page=5&page=${page}`));
    assert.equal(res.status, 200);

    extractIds(await res.text()).forEach((id) => collected.add(id));

    totalPages = Number(res.headers.get("x-catalog-total-pages"));
    page += 1;
  } while (page <= totalPages);

  assert.equal(totalPages, 4, "16 products at 5 per page should span 4 pages");
  assert.equal(collected.size, 16, `pagination dropped ${16 - collected.size} product(s)`);
  for (let index = 0; index < 16; index += 1) {
    assert.ok(collected.has(String(228001 + index)), `product ${228001 + index} missing while paginating`);
  }
});

test("an oversized per_page still exports the whole catalog on one page", async () => {
  setProducts(catalogOf16());

  const res = await GET(feedRequest("&per_page=1000"));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-catalog-total-pages"), "1");
  assert.equal(extractIds(await res.text()).length, 16);
});
