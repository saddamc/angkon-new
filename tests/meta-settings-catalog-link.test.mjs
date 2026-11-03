import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Regression guard for the Catalog & Feed section of the centralized settings
 * screen.
 *
 * Two bugs shipped together:
 *  1. The feed URL was built with a `.xml` suffix that no route serves, so the
 *     "Open feed" link answered 404.
 *  2. The product count used `{ status: "published" }`, but `Product` declares
 *     no `status` field — the query matched zero documents and the section
 *     reported "Not configured" while the store held 16 products.
 */

const ROUTE = "src/app/api/admin/meta/settings/route.ts";

test("catalog: the feed URL points at the real endpoint, not a .xml alias", () => {
  const source = fs.readFileSync(ROUTE, "utf8");

  assert.ok(
    !source.includes("catalog-feed.xml"),
    "no route serves catalog-feed.xml — the endpoint is /api/meta/catalog-feed"
  );
  assert.ok(
    source.includes("/api/meta/catalog-feed`"),
    "the feed URL must be built from the real endpoint path"
  );
});

test("catalog: the product count uses the canonical visibility filter", () => {
  const source = fs.readFileSync(ROUTE, "utf8");

  assert.ok(
    !source.includes('countDocuments({ status: "published" })'),
    "Product has no `status` field, so that filter always returns zero"
  );
  assert.ok(
    source.includes("buildCatalogVisibilityFilter()"),
    "the count must reuse the same eligibility rules as the public feed"
  );
});

test("catalog: the count no longer falls back to a hard-coded 16", () => {
  const source = fs.readFileSync(ROUTE, "utf8");

  assert.ok(
    !source.includes("catalogCount ?? 16"),
    "a fabricated fallback hides database failures"
  );
});

test("catalog: the public feed route is mounted where the settings link points", () => {
  assert.ok(
    fs.existsSync("src/app/api/meta/catalog-feed/route.ts"),
    "the public feed route must exist at /api/meta/catalog-feed"
  );
  assert.ok(
    !fs.existsSync("src/app/api/meta/catalog-feed.xml"),
    "there must be no .xml alias to drift out of sync"
  );
});
