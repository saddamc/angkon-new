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

    const categorySeoFile = fs.readFileSync(
      path.resolve(process.cwd(), "src/config/category-seo.ts"),
      "utf-8"
    );
    assert.ok(
      categorySeoFile.includes("Three-Piece Dresses & Embroidered Suits for Women | ANGKON"),
      "Ethnic wear category title must prioritize Three-Piece Dresses & Embroidered Suits"
    );
    assert.ok(
      categorySeoFile.includes("Women's Dresses Online in Bangladesh | ANGKON"),
      "Women category title must prioritize Women's Dresses Online in Bangladesh"
    );
    assert.ok(
      categorySeoFile.includes("Women's Dresses & Designer Ethnic Fashion"),
      "Women category H1 must be 'Women's Dresses & Designer Ethnic Fashion'"
    );
    assert.ok(
      categorySeoFile.includes("Designer Three-Piece Dresses & Embroidered Suits"),
      "Ethnic wear category H1 must be 'Designer Three-Piece Dresses & Embroidered Suits'"
    );

    const productsContent = fs.readFileSync(path.resolve(process.cwd(), "src/app/products/page.tsx"), "utf-8");
    assert.ok(
      productsContent.includes("Women's Dresses & Premium Three-Piece Suits Online | ANGKON"),
      "Products page must prioritize Women's Dresses & Premium Three-Piece Suits"
    );
  });

  await t.test("Category SEO dictionary descriptions are concise and within Google SERP limits (60 - 170 chars)", () => {
    const categorySeoFile = fs.readFileSync(
      path.resolve(process.cwd(), "src/config/category-seo.ts"),
      "utf-8"
    );
    const catDescMatches = [...categorySeoFile.matchAll(/description:\s*\n?\s*"([^"]+)"/g)].map((m) => m[1]);
    assert.ok(catDescMatches.length >= 8, `Expected at least 8 category descriptions, found ${catDescMatches.length}`);
    for (const desc of catDescMatches) {
      assert.ok(
        desc.length <= 170,
        `Category description exceeds 170 chars (${desc.length} chars): "${desc}"`
      );
      assert.ok(
        desc.length >= 60,
        `Category description is too short (${desc.length} chars): "${desc}"`
      );
    }
  });

  await t.test("Category page dynamically sets noindex on empty categories and index on populated categories", () => {
    const categoryPageContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/product-category/[...slug]/page.tsx"),
      "utf-8"
    );
    assert.ok(
      categoryPageContent.includes("robots: {\n      index: isPopulated,\n      follow: true,\n    }"),
      "Category page must pass index: isPopulated to robots metadata"
    );
  });
});
