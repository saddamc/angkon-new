import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Customer-Intent SEO: Product Catalog SEO Dictionary Validation", async (t) => {
  const filePath = path.resolve(process.cwd(), "src/config/product-seo.ts");
  assert.ok(fs.existsSync(filePath), "src/config/product-seo.ts must exist");

  const content = fs.readFileSync(filePath, "utf-8");

  // Extract all seoTitle and seoDescription entries
  const titleMatches = [...content.matchAll(/seoTitle:\s*"([^"]+)"/g)].map((m) => m[1]);
  const descMatches = [...content.matchAll(/seoDescription:\s*"([^"]+)"/g)].map((m) => m[1]);
  const slugMatches = [...content.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

  // Unique slugs
  const uniqueSlugs = [...new Set(slugMatches)];

  await t.test("All 16 products are defined in SEO catalog", () => {
    assert.strictEqual(
      uniqueSlugs.length,
      16,
      `Expected 16 unique product slugs, found ${uniqueSlugs.length}`
    );
  });

  await t.test("Zero duplicate SEO titles across all products", () => {
    assert.strictEqual(titleMatches.length, 16, "Expected 16 titles");
    const uniqueTitles = new Set(titleMatches);
    assert.strictEqual(
      uniqueTitles.size,
      16,
      `Found duplicate titles! Unique: ${uniqueTitles.size}, Total: ${titleMatches.length}`
    );
  });

  await t.test("Zero duplicate meta descriptions across all products", () => {
    assert.strictEqual(descMatches.length, 16, "Expected 16 descriptions");
    const uniqueDescs = new Set(descMatches);
    assert.strictEqual(
      uniqueDescs.size,
      16,
      `Found duplicate descriptions! Unique: ${uniqueDescs.size}, Total: ${descMatches.length}`
    );
  });

  await t.test("Meta descriptions are concise and within Google SERP limits (<= 170 chars)", () => {
    for (const desc of descMatches) {
      assert.ok(
        desc.length <= 170,
        `Description exceeds 170 chars (${desc.length} chars): "${desc}"`
      );
      assert.ok(
        desc.length >= 60,
        `Description is too short (${desc.length} chars): "${desc}"`
      );
    }
  });

  await t.test("No product SEO title begins with 'Pakistani' as sole primary keyword", () => {
    for (const title of titleMatches) {
      assert.ok(
        !title.startsWith("Pakistani "),
        `Title should not start with 'Pakistani': "${title}"`
      );
    }
  });

  await t.test("Homepage, Categories, and Products Page metadata align with customer-intent", () => {
    const layoutContent = fs.readFileSync(path.resolve(process.cwd(), "src/app/layout.tsx"), "utf-8");
    assert.ok(
      layoutContent.includes("Premium Women's Clothing & Designer Ethnic Wear in Bangladesh"),
      "Layout title must prioritize Women's Clothing & Designer Ethnic Wear"
    );

    const categoryContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/product-category/[...slug]/page.tsx"),
      "utf-8"
    );
    assert.ok(
      categoryContent.includes("Three-Piece Dresses & Luxury Embroidered Suits for Women | ANGKON BD"),
      "Ethnic wear category title must prioritize Three-Piece Dresses & Luxury Embroidered Suits"
    );
    assert.ok(
      categoryContent.includes("Women's Ethnic Wear & Designer Outfits in Bangladesh | ANGKON"),
      "Women category title must prioritize Ethnic Wear & Designer Outfits"
    );

    const productsContent = fs.readFileSync(path.resolve(process.cwd(), "src/app/products/page.tsx"), "utf-8");
    assert.ok(
      productsContent.includes("Women's Dresses & Premium Three-Piece Suits Online | ANGKON"),
      "Products page must prioritize Women's Dresses & Premium Three-Piece Suits"
    );
  });
});
