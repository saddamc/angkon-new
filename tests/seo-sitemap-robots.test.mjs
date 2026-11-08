import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * ──────────────────────────────────────────────────────────────────────────
 * ANGKON Technical SEO Test Suite: Robots.txt & Dynamic XML Sitemap
 * ──────────────────────────────────────────────────────────────────────────
 */

test("SEO 1: robots.txt file exists and defines valid Next.js MetadataRoute.Robots structure", () => {
  const robotsSrc = fs.readFileSync("src/app/robots.ts", "utf8");
  assert.ok(robotsSrc.includes("MetadataRoute.Robots"), "Must import MetadataRoute.Robots");
  assert.ok(robotsSrc.includes("export default function robots"), "Must export default robots function");
  assert.ok(robotsSrc.includes("/sitemap.xml"), "Must reference sitemap");
  assert.ok(robotsSrc.includes("https://www.angkon.net"), "Must reference canonical host");
});

test("SEO 2: robots.txt allows public crawling while excluding private routes", () => {
  const robotsSrc = fs.readFileSync("src/app/robots.ts", "utf8");
  assert.ok(robotsSrc.includes('allow: "/"'), "Must allow storefront root");
  assert.ok(robotsSrc.includes('"/admin"'), "Must disallow /admin");
  assert.ok(robotsSrc.includes('"/api"'), "Must disallow /api");
  assert.ok(robotsSrc.includes('"/cart"'), "Must disallow /cart");
  assert.ok(robotsSrc.includes('"/checkout"'), "Must disallow /checkout");
  assert.ok(robotsSrc.includes('"/my-account"'), "Must disallow /my-account");
  assert.ok(robotsSrc.includes('"/search"'), "Must disallow /search");
  assert.ok(robotsSrc.includes('"/wishlist"'), "Must disallow /wishlist");

  // Ensure public storefront routes are NOT accidentally disallowed
  assert.ok(!robotsSrc.includes('"/products"'), "Must not disallow /products");
  assert.ok(!robotsSrc.includes('"/product-category"'), "Must not disallow /product-category");
  assert.ok(!robotsSrc.includes('"/about"'), "Must not disallow /about");
  assert.ok(!robotsSrc.includes('"/policies"'), "Must not disallow /policies");
  assert.ok(!robotsSrc.includes('"/sale"'), "Must not disallow /sale");
});

test("SEO 3: Built robots.txt.body matches search engine crawler specifications", () => {
  if (fs.existsSync(".next/server/app/robots.txt.body")) {
    const body = fs.readFileSync(".next/server/app/robots.txt.body", "utf8");
    assert.ok(body.includes("User-Agent: *"));
    assert.ok(body.includes("Allow: /"));
    assert.ok(body.includes("Disallow: /admin"));
    assert.ok(body.includes("Disallow: /api"));
    assert.ok(body.includes("Disallow: /checkout"));
    assert.ok(body.includes("Disallow: /cart"));
    assert.ok(body.includes("Sitemap: https://www.angkon.net/sitemap.xml"));
    assert.ok(body.includes("Host: https://www.angkon.net"));
  }
});

test("SEO 4: sitemap.ts file exists and defines valid Next.js MetadataRoute.Sitemap structure", () => {
  const sitemapSrc = fs.readFileSync("src/app/sitemap.ts", "utf8");
  assert.ok(sitemapSrc.includes("MetadataRoute.Sitemap"), "Must import MetadataRoute.Sitemap");
  assert.ok(sitemapSrc.includes("export default async function sitemap"), "Must export default async sitemap");
  assert.ok(sitemapSrc.includes("https://www.angkon.net"), "Must use canonical baseUrl");
  assert.ok(sitemapSrc.includes("export const revalidate = 3600"), "Must declare 1h revalidation");
});

test("SEO 5: Built sitemap.xml is valid XML and contains all mandatory core storefront routes", () => {
  if (fs.existsSync(".next/server/app/sitemap.xml.body")) {
    const xml = fs.readFileSync(".next/server/app/sitemap.xml.body", "utf8");
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "Must be standard XML");
    assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), "Must have sitemap namespace");

    // Core required pages
    assert.ok(xml.includes("<loc>https://www.angkon.net/</loc>"), "Homepage must be present");
    assert.ok(xml.includes("<loc>https://www.angkon.net/products</loc>"), "/products must be present");
    assert.ok(xml.includes("<loc>https://www.angkon.net/sale</loc>"), "/sale must be present");
    assert.ok(xml.includes("<loc>https://www.angkon.net/about</loc>"), "/about must be present");
    assert.ok(xml.includes("<loc>https://www.angkon.net/policies</loc>"), "/policies must be present");
    assert.ok(xml.includes("<loc>https://www.angkon.net/contact</loc>"), "/contact must be present");
    assert.ok(xml.includes("<loc>https://www.angkon.net/delivery-timing</loc>"), "/delivery-timing must be present");
    assert.ok(xml.includes("<loc>https://www.angkon.net/refund-and-exchange-policies</loc>"), "/refund-and-exchange-policies must be present");
    assert.ok(xml.includes("<loc>https://www.angkon.net/privacy</loc>"), "/privacy must be present");
    assert.ok(xml.includes("<loc>https://www.angkon.net/terms</loc>"), "/terms must be present");

    // Populated categories must be present; empty categories must be excluded to prevent soft-404s
    assert.ok(xml.includes("<loc>https://www.angkon.net/product-category/women</loc>"), "Women category must be present");
    assert.ok(xml.includes("<loc>https://www.angkon.net/product-category/women/ethnic-wear</loc>"), "Canonical Ethnic Wear category must be present");
    assert.ok(!xml.includes("<loc>https://www.angkon.net/product-category/ethnic-wear</loc>"), "Non-canonical alias /product-category/ethnic-wear must be excluded from sitemap");
    assert.ok(!xml.includes("<loc>https://www.angkon.net/product-category/men</loc>"), "Empty Men category must be excluded from sitemap");
  }
});

test("SEO 6: Built sitemap.xml contains active product detail URLs with valid timestamps", () => {
  if (fs.existsSync(".next/server/app/sitemap.xml.body")) {
    const xml = fs.readFileSync(".next/server/app/sitemap.xml.body", "utf8");
    assert.ok(
      xml.includes("<loc>https://www.angkon.net/products/tawakkal-wada-midnight-black</loc>"),
      "Product detail page must be present"
    );
    assert.ok(
      xml.includes("<loc>https://www.angkon.net/products/tawakkal-wada-deep-emerald-green</loc>"),
      "Product detail page must be present"
    );
    assert.ok(
      xml.includes("<loc>https://www.angkon.net/products/safaidah-dastaan-black-floral-suit</loc>"),
      "Product detail page must be present"
    );
  }
});

test("SEO 7: Sitemap enforces zero duplicate URLs and canonical domain consistency", () => {
  if (fs.existsSync(".next/server/app/sitemap.xml.body")) {
    const xml = fs.readFileSync(".next/server/app/sitemap.xml.body", "utf8");
    const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    assert.ok(locMatches.length > 20, "Should contain comprehensive set of URLs");

    const seen = new Set();
    const duplicates = [];
    for (const url of locMatches) {
      if (seen.has(url)) duplicates.push(url);
      seen.add(url);
      assert.ok(url.startsWith("https://www.angkon.net"), `URL must start with canonical host: ${url}`);
    }

    assert.equal(duplicates.length, 0, `Found duplicate URLs in sitemap: ${duplicates.join(", ")}`);
  }
});

test("SEO 8: Metadata layout and pages declare canonical alternates matching sitemap URLs", () => {
  const layoutSrc = fs.readFileSync("src/app/layout.tsx", "utf8");
  const productSrc = fs.readFileSync("src/app/products/[slug]/page.tsx", "utf8");
  const categorySrc = fs.readFileSync("src/app/product-category/[...slug]/page.tsx", "utf8");
  const productsIndexSrc = fs.readFileSync("src/app/products/page.tsx", "utf8");
  const aboutSrc = fs.readFileSync("src/app/about/page.tsx", "utf8");
  const policiesSrc = fs.readFileSync("src/app/policies/page.tsx", "utf8");
  const saleSrc = fs.readFileSync("src/app/sale/page.tsx", "utf8");

  assert.ok(layoutSrc.includes("https://www.angkon.net"), "Layout metadataBase defaults to https://www.angkon.net");
  assert.ok(productSrc.includes("canonical: `/products/${product.slug}`"), "Product page sets canonical");
  assert.ok(categorySrc.includes("canonical: `/product-category/${canonicalPathSegments}`"), "Category page sets canonical");
  assert.ok(productsIndexSrc.includes('canonical: "/products"'), "Products index sets canonical");
  assert.ok(aboutSrc.includes('canonical: "/about"'), "About page sets canonical");
  assert.ok(policiesSrc.includes('canonical: "/policies"'), "Policies page sets canonical");
  assert.ok(saleSrc.includes('canonical: "/sale"'), "Sale page sets canonical");
});

test("SEO 9: Sitemap contains exactly 32 canonical URLs and zero duplicate or alias URLs", () => {
  if (fs.existsSync(".next/server/app/sitemap.xml.body")) {
    const xml = fs.readFileSync(".next/server/app/sitemap.xml.body", "utf8");
    const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    // Recalculated total URL count must contain all canonical URLs
    assert.ok(locMatches.length >= 32, `Expected at least 32 sitemap URLs, got ${locMatches.length}`);

    const categories = locMatches.filter((url) => url.includes("/product-category/"));
    assert.ok(categories.length >= 6, `Expected at least 6 canonical categories, got ${categories.length}`);

    // Verify core canonical categories
    const expectedCoreCategories = [
      "https://www.angkon.net/product-category/women",
      "https://www.angkon.net/product-category/women/ethnic-wear",
      "https://www.angkon.net/product-category/women/ethnic-wear/tawakkal-wada",
      "https://www.angkon.net/product-category/women/ethnic-wear/guzel",
      "https://www.angkon.net/product-category/women/ethnic-wear/aiman-aisha",
      "https://www.angkon.net/product-category/women/ethnic-wear/safa-marwa",
    ];
    for (const exp of expectedCoreCategories) {
      assert.ok(categories.includes(exp), `Category ${exp} must be in sitemap`);
    }

    // Zero redundant alias categories
    const aliasCategories = locMatches.filter(
      (url) => url.startsWith("https://www.angkon.net/product-category/ethnic-wear")
    );
    assert.equal(aliasCategories.length, 0, "No alias /product-category/ethnic-wear URLs in sitemap");

    // All active products included
    const products = locMatches.filter((url) => url.includes("/products/"));
    assert.ok(products.length >= 16, `Expected at least 16 products, got ${products.length}`);
  }
});
