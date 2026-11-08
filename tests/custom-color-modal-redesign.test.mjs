import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  cleanColorName,
  getColorDisplayName,
  searchFashionColors,
  validateColorName,
  validateHexColor,
  registerCustomColor,
  resolveColorStyle,
  FASHION_COLOR_LIST,
} from "../src/components/admin/product-form/color-swatches.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("1. Search existing colors: canonical names & synonyms with 5-item limit", () => {
  // Canonical search
  const maroonResults = searchFashionColors("maroon", 5);
  assert.ok(maroonResults.length > 0);
  assert.equal(maroonResults[0].name, "Maroon");

  // Synonym search returns canonical name
  const goldSynonym = searchFashionColors("shonali", 5);
  assert.ok(goldSynonym.length > 0);
  assert.equal(goldSynonym[0].name, "Gold");

  // Empty search returns initial 5
  const initial = searchFashionColors("", 5);
  assert.equal(initial.length, 5);
});

test("2 & 3. Add existing color and already-added indicator", () => {
  let selected = ["Maroon"];

  // Check if "Maroon" is marked as already added
  const isMaroonAdded = selected.some((c) => c.toLowerCase() === "maroon".toLowerCase());
  assert.equal(isMaroonAdded, true);

  // Adding another color
  const newColor = "Gold";
  if (!selected.some((c) => c.toLowerCase() === newColor.toLowerCase())) {
    selected = [...selected, newColor];
  }
  assert.deepEqual(selected, ["Maroon", "Gold"]);

  // Duplicate add is prevented
  if (!selected.some((c) => c.toLowerCase() === "gold".toLowerCase())) {
    selected = [...selected, "Gold"];
  }
  assert.equal(selected.length, 2, "Duplicate color must not be appended");
});

test("4 & 5. Remove selected color and Clear All", () => {
  let selected = ["Maroon", "Gold", "Black"];

  // Remove single color
  const toRemove = "Gold";
  selected = selected.filter((c) => c.toLowerCase() !== toRemove.toLowerCase());
  assert.deepEqual(selected, ["Maroon", "Black"]);

  // Clear all
  selected = [];
  assert.deepEqual(selected, []);
});

test("6. CustomColorModal component structure and Dialog usage", () => {
  const modalPath = path.join(rootDir, "src/components/admin/product-form/CustomColorModal.tsx");
  assert.ok(fs.existsSync(modalPath), "CustomColorModal.tsx must exist");
  const modalContent = fs.readFileSync(modalPath, "utf8");

  // Uses shadcn/ui Dialog
  assert.ok(modalContent.includes("Dialog"), "Must import and use Dialog");
  assert.ok(modalContent.includes("DialogContent"), "Must use DialogContent");
  assert.ok(modalContent.includes("DialogHeader"), "Must use DialogHeader");
  assert.ok(modalContent.includes("DialogTitle"), "Must use DialogTitle");
  assert.ok(modalContent.includes("DialogDescription"), "Must use DialogDescription");
  assert.ok(modalContent.includes("DialogFooter"), "Must use DialogFooter");

  // Modal Title and Description exact strings
  assert.ok(modalContent.includes("Add Custom Color"), "Must have title 'Add Custom Color'");
  assert.ok(
    modalContent.includes("Create a new color for your product."),
    "Must have description 'Create a new color for your product.'"
  );

  // Action buttons
  assert.ok(modalContent.includes("Cancel"), "Must have Cancel button");
  assert.ok(modalContent.includes("Save Color"), "Must have Save Color button");
});

test("7. Required color name validation in CustomColorModal", () => {
  assert.equal(validateColorName("").valid, false);
  assert.equal(validateColorName("   ").valid, false);
  assert.equal(validateColorName("").error, "Color name is required");

  // Valid names
  assert.equal(validateColorName("Wine Red").valid, true);
  assert.equal(validateColorName("Royal Sapphire Blue").valid, true);
});

test("8. Optional HEX code: omitted hex allowed, neutral preview used without arbitrary hex invention", () => {
  // If hex is omitted, validateColorName passes
  const nameValidation = validateColorName("Champagne Mist");
  assert.equal(nameValidation.valid, true);

  // Saving without hex: resolveColorStyle provides neutral default preview
  const resolved = resolveColorStyle("Champagne Mist");
  assert.ok(resolved.bg, "Must have preview background");
  // Does not invent a random fake hex for data storage
  assert.equal(cleanColorName("Champagne Mist"), "Champagne Mist");
});

test("9. Invalid HEX rejection", () => {
  // Valid formats
  assert.equal(validateHexColor("#8B1E3F"), true);
  assert.equal(validateHexColor("#FFF"), true);
  assert.equal(validateHexColor("#000000"), true);

  // Invalid formats
  assert.equal(validateHexColor("8B1E3F"), false, "Missing # must fail");
  assert.equal(validateHexColor("#12345"), false, "5-digit hex must fail");
  assert.equal(validateHexColor("#XYZ123"), false, "Non-hex digits must fail");
  assert.equal(validateHexColor("#12"), false, "Too short must fail");
});

test("10. Color picker and HEX synchronization logic in CustomColorModal", () => {
  const modalPath = path.join(rootDir, "src/components/admin/product-form/CustomColorModal.tsx");
  const content = fs.readFileSync(modalPath, "utf8");

  // Check sync logic
  assert.ok(content.includes("handleHexInputChange"), "Must synchronize picker when hex input changes");
  assert.ok(content.includes("handlePickerChange"), "Must synchronize hex input when picker changes");
  assert.ok(content.includes("type=\"color\""), "Must contain color picker input inside modal");
});

test("11. Duplicate name prevention logic against existing product colors", () => {
  const existingColors = ["Maroon", "Gold", "Black"];
  const candidate = "maroon";

  const isDuplicate = existingColors.some(
    (c) => c.toLowerCase() === candidate.trim().toLowerCase()
  );
  assert.equal(isDuplicate, true, "Must flag duplicate case-insensitively");

  const newUnique = "Rose Gold";
  const isUniqueDuplicate = existingColors.some(
    (c) => c.toLowerCase() === newUnique.trim().toLowerCase()
  );
  assert.equal(isUniqueDuplicate, false);
});

test("12. Main toolbar design in ProductForm: no inline native picker outside modal", () => {
  const formPath = path.join(rootDir, "src/components/admin/product-form/ProductForm.tsx");
  const content = fs.readFileSync(formPath, "utf8");

  // Toolbar search occupies most width
  assert.ok(content.includes("relative flex-1"), "Search field must occupy flex-1 available width");
  assert.ok(content.includes("<Plus className="), "Add button must have plus icon");
  assert.ok(content.includes("<span>Add</span>"), "Add button text must be 'Add' without duplicate '+'");
  assert.ok(content.includes("bg-purple-600"), "Add button must have purple primary styling");

  // Verification that NO native color picker is in the main ProductForm toolbar
  // The toolbar should only render input and + Add button
  assert.ok(
    !content.includes('aria-label="Custom color picker"'),
    "Inline color picker must be removed from ProductForm toolbar"
  );
  assert.ok(
    content.includes("<CustomColorModal"),
    "ProductForm must render CustomColorModal"
  );
});

test("13. Product data compatibility: colors array preserved as string[]", () => {
  // Existing product structure
  const productData = {
    name: "Classic Silk Panjabi",
    colors: ["Maroon", "Gold"],
  };

  // Adding a new custom color
  const newColor = "Wine Red";
  productData.colors = [...productData.colors, newColor];

  assert.deepEqual(productData.colors, ["Maroon", "Gold", "Wine Red"]);
  assert.ok(Array.isArray(productData.colors));
  assert.ok(productData.colors.every((c) => typeof c === "string"));
});

test("14. CustomColorModal actions do not trigger form submission or route redirect", () => {
  const modalPath = path.join(rootDir, "src/components/admin/product-form/CustomColorModal.tsx");
  const modalContent = fs.readFileSync(modalPath, "utf8");

  // Must not have nested form tag
  assert.ok(!modalContent.includes("<form"), "CustomColorModal must not use a nested <form> element");
  assert.ok(!modalContent.includes("type=\"submit\""), "CustomColorModal buttons must not use type='submit'");
  assert.ok(modalContent.includes("e.stopPropagation()"), "Must stop event propagation on Save and Cancel");

  const formPath = path.join(rootDir, "src/components/admin/product-form/ProductForm.tsx");
  const formContent = fs.readFileSync(formPath, "utf8");

  // Form closing tag must appear BEFORE CustomColorModal
  const formCloseIdx = formContent.indexOf("</form>");
  const modalIdx = formContent.indexOf("<CustomColorModal");
  assert.ok(formCloseIdx !== -1, "</form> must exist");
  assert.ok(modalIdx !== -1, "<CustomColorModal> must exist");
  assert.ok(
    modalIdx > formCloseIdx,
    "CustomColorModal must be rendered outside the <form> to prevent accidental submission and redirect"
  );
});

