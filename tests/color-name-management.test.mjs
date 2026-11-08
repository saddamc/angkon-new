import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  cleanColorName,
  getColorDisplayName,
  hexToNearestColorName,
  resolveColorStyle,
  searchFashionColors,
  validateColorName,
  validateHexColor,
  registerCustomColor,
  FASHION_COLOR_LIST,
} from "../src/components/admin/product-form/color-swatches.ts";

test("cleanColorName converts hex codes to human-readable Color Names", () => {
  // Brand luxury colors
  assert.equal(cleanColorName("#530911"), "Maroon", "#530911 must map to Maroon");
  assert.equal(cleanColorName("#E1B76F"), "Gold", "#E1B76F must map to Gold");
  assert.equal(cleanColorName("#2d0302"), "Deep Maroon", "#2d0302 must map to Deep Maroon");

  // Core apparel colors
  assert.equal(cleanColorName("#000000"), "Black");
  assert.equal(cleanColorName("#ffffff"), "White");
  assert.equal(cleanColorName("#171717"), "Jet Black");
  assert.equal(cleanColorName("#1e3a8a"), "Navy Blue");
  assert.equal(cleanColorName("#dc2626"), "Red");
  assert.equal(cleanColorName("#059669"), "Emerald Green");
  assert.equal(cleanColorName("#84a98c"), "Sage Green");
  assert.equal(cleanColorName("#d4a373"), "Dusty Rose");

  // 3-digit hex format
  assert.equal(cleanColorName("#fff"), "White");
  assert.equal(cleanColorName("#000"), "Black");
});

test("cleanColorName normalizes and title-cases color names", () => {
  assert.equal(cleanColorName("sage green"), "Sage Green");
  assert.equal(cleanColorName("ROYAL BLUE"), "Royal Blue");
  assert.equal(cleanColorName("  maroon  "), "Maroon");
  assert.equal(cleanColorName("dusty rose"), "Dusty Rose");
  assert.equal(cleanColorName("emerald green"), "Emerald Green");
});

test("getColorDisplayName ensures storefront never displays raw hex codes", () => {
  assert.equal(getColorDisplayName("#530911"), "Maroon");
  assert.equal(getColorDisplayName("#1d4ed8"), "Royal Blue");
  assert.equal(getColorDisplayName("#2563eb"), "Blue");
  assert.equal(getColorDisplayName("Sage Green"), "Sage Green");
  assert.equal(getColorDisplayName(""), "");
  assert.equal(getColorDisplayName(null), "");
  assert.equal(getColorDisplayName(undefined), "");
});

test("searchFashionColors searches canonical names case-insensitively with 5-item limit", () => {
  // Empty query returns top 5 canonical colors
  const initial = searchFashionColors("", 5);
  assert.equal(initial.length, 5, "Initial focus must return 5 results");
  assert.ok(initial.some((c) => c.name === "Maroon"));
  assert.ok(initial.some((c) => c.name === "Gold"));

  // Prefix query returns matching canonical items
  const greenMatches = searchFashionColors("em", 5);
  assert.ok(greenMatches.length <= 5, "Max 5 results");
  assert.equal(greenMatches[0].name, "Emerald Green");

  // Case-insensitive
  const upperQuery = searchFashionColors("NAVY", 5);
  assert.ok(upperQuery.some((c) => c.name === "Navy Blue"));
});

test("searchFashionColors searches synonyms internally and returns ONLY canonical name", () => {
  // "shonali" is a synonym for Gold
  const goldSynonym = searchFashionColors("shonali", 5);
  assert.ok(goldSynonym.length > 0, "Must find match for synonym");
  assert.equal(goldSynonym[0].name, "Gold", "Must return canonical name 'Gold', not the synonym");

  // "akashi" is a synonym for Sky Blue
  const skySynonym = searchFashionColors("akashi", 5);
  assert.ok(skySynonym.length > 0);
  assert.equal(skySynonym[0].name, "Sky Blue");

  // "merun" is a synonym for Maroon
  const maroonSynonym = searchFashionColors("merun", 5);
  assert.ok(maroonSynonym.length > 0);
  assert.equal(maroonSynonym[0].name, "Maroon");

  // "kolaapata" is a synonym for Bottle Green
  const bottleSynonym = searchFashionColors("kolaapata", 5);
  assert.ok(bottleSynonym.length > 0);
  assert.equal(bottleSynonym[0].name, "Bottle Green");
});

test("searchFashionColors returns empty array when query has no matching color or synonym", () => {
  const noMatches = searchFashionColors("xyz999completelyunknowncolor", 5);
  assert.deepEqual(noMatches, [], "Must return empty array on unknown search query");
});

test("validateColorName enforces valid input rules and prevents empty/invalid names", () => {
  assert.equal(validateColorName("").valid, false);
  assert.equal(validateColorName("   ").valid, false);
  assert.equal(validateColorName("Sage Green").valid, true);
  assert.equal(validateColorName("Dusty Rose / Pink").valid, true);
  assert.equal(validateColorName("<script>alert(1)</script>").valid, false);
});

test("validateHexColor enforces valid 3 or 6 digit hex format", () => {
  assert.equal(validateHexColor("#530911"), true);
  assert.equal(validateHexColor("#fff"), true);
  assert.equal(validateHexColor("#FFF"), true);
  assert.equal(validateHexColor("530911"), false, "Must start with #");
  assert.equal(validateHexColor("#12345"), false, "Must be 3 or 6 chars");
  assert.equal(validateHexColor("#gggggg"), false, "Must be valid hex digits");
});

test("registerCustomColor registers custom colors and resolves correct swatches", () => {
  registerCustomColor("Twilight Lilac", "#9b59b6");
  const style = resolveColorStyle("Twilight Lilac");
  assert.equal(style.bg, "#9b59b6");
  assert.equal(style.isLight, false);
});

test("ProductForm conforms strictly to the Final UI/UX Refinement criteria", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const formFile = fs.readFileSync(path.join(rootDir, "src/components/admin/product-form/ProductForm.tsx"), "utf8");

  // Section 1: Completely removed unnecessary UI
  assert.ok(!formFile.includes("Quick Suggestions:"), "Quick Suggestions section must be completely removed");
  assert.ok(!formFile.includes("POPULAR_SUGGESTIONS.slice"), "Suggestions slice must be removed");
  assert.ok(!formFile.includes("({item.category})"), "Color category labels must not be rendered beside items");
  assert.ok(!formFile.includes("Earth & Warm"), "Category Earth & Warm must not be rendered");
  assert.ok(!formFile.includes("Reds & Pinks"), "Category Reds & Pinks must not be rendered");
  assert.ok(!formFile.includes("Matching Bangladesh Fashion Colors"), "Unnecessary helper descriptions must be removed");

  // Section 2: Search dropdown design
  assert.ok(formFile.includes("searchFashionColors"), "Must use searchFashionColors");
  assert.ok(formFile.includes("role=\"combobox\""), "Input must have role combobox");
  assert.ok(formFile.includes("role=\"listbox\""), "Dropdown must have role listbox");
  assert.ok(formFile.includes("<Check className="), "Selected items must show green checkmark");
  assert.ok(formFile.includes("Added"), "Selected items must display 'Added'");
  assert.ok(formFile.includes("+ Add"), "Unselected items must show '+ Add'");

  // Section 3: Keyboard navigation and clear button
  assert.ok(formFile.includes("handleColorKeyDown"), "Must support keyboard navigation");
  assert.ok(formFile.includes("ArrowDown"), "Must handle ArrowDown key");
  assert.ok(formFile.includes("ArrowUp"), "Must handle ArrowUp key");
  assert.ok(formFile.includes("Escape"), "Must handle Escape key to close dropdown");
  assert.ok(formFile.includes("Clear search"), "Must provide clear search button");

  // Section 4: Custom color creation
  assert.ok(formFile.includes("+ Create"), "Must display + Create option for custom colors");
  assert.ok(formFile.includes("as a custom color"), "Must display 'as a custom color'");
  assert.ok(formFile.includes("customPickerColor"), "Must use customPickerColor value");
  assert.ok(formFile.includes("validateColorName"), "Must validate color name before saving");

  // Section 5: Selected colors section
  assert.ok(formFile.includes("Selected Product Colors ("), "Must keep Selected Product Colors heading");
  assert.ok(formFile.includes("Clear All"), "Must keep Clear All action");
});
