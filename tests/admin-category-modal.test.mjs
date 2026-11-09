import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Create Main Category modal — UI/UX refinement contract.
 *
 * Verifies the modal keeps its data behaviour (slug generation, ordering,
 * visibility, banner, SEO subtitle) while the form surface matches the spec:
 * no visible slug field, Display Order beside the name, compact dimensions.
 */

const MODAL = "src/app/admin/categories/CreateCategoryModal.tsx";
const API = "src/app/api/admin/categories/route.ts";

const modal = fs.readFileSync(MODAL, "utf8");
const api = fs.readFileSync(API, "utf8");

test("modal: compact reduced width and height, capped by viewport", () => {
  assert.ok(
    modal.includes('maxWidth: "min(620px, calc(100vw - 32px))"'),
    "desktop width should be min(620px, 100vw - 32px)"
  );
  assert.ok(
    modal.includes('maxHeight: "min(680px, calc(100dvh - 32px))"'),
    "height should cap at 680px and the dynamic viewport height"
  );
});

test("modal: header and footer stay fixed while the body scrolls", () => {
  assert.ok(modal.includes("shrink-0"), "header/footer must not shrink");
  assert.ok(
    modal.includes("min-h-0 flex-1 space-y-4 overflow-y-auto"),
    "only the body should scroll"
  );
});

test("modal: Category Name and URL Slug are side-by-side in grid", () => {
  assert.ok(modal.includes("Category Name"), "Category Name must be present");
  assert.ok(modal.includes("URL Slug"), "URL Slug must be present on the right side of Category Name");
  assert.ok(
    modal.includes("sm:grid-cols-2"),
    "Category Name and URL Slug must share a 2-column row on desktop"
  );
  assert.ok(modal.includes("autoSlug"), "slug auto-sync state must be present");
});

test("modal: slug generation stays server-side and unique", () => {
  assert.ok(
    api.includes("slugifyCategory(name)"),
    "the API must derive the slug from the name"
  );
  assert.ok(
    api.includes("for (let n = 2; await Category.exists({ slug }); n++)"),
    "the API must uniquify duplicate slugs (-2, -3, …)"
  );
});

test("modal: Display Order is sanitised non-negative integer", () => {
  assert.ok(
    modal.includes("Math.max(0, Math.floor(Number(sortOrder) || 0))"),
    "order must clamp to a non-negative integer"
  );
  assert.ok(
    modal.includes("menu_order: Math.max(0, Math.floor(Number(sortOrder) || 0))"),
    "the sanitised value must be what is submitted"
  );
});

test("modal: name is required with inline validation and duplicate protection", () => {
  assert.ok(modal.includes("Category name is required."));
  assert.ok(
    modal.includes("already exists here."),
    "duplicate sibling names must be rejected with a clear message"
  );
  assert.ok(modal.includes('aria-invalid={Boolean(nameError)}'));
  assert.ok(modal.includes('aria-describedby={nameError ? "category-name-error" : undefined}'));
  assert.ok(modal.includes("const trimmedName = name.trim();"), "name must be trimmed");
});

test("modal: saving is guarded against double submission", () => {
  assert.ok(modal.includes("if (saving) return;"), "re-entry must be blocked");
  assert.ok(modal.includes("disabled={saving}"), "actions must disable while saving");
  assert.ok(modal.includes("Creating…"), "a loading label must be shown");
});

test("modal: one primary action; add-another is a secondary ghost", () => {
  assert.ok(modal.includes("Create Category"), "the primary action remains");
  assert.ok(modal.includes("Save &amp; add another"), "the secondary action is kept");
  const solidPrimary = modal.match(/bg-purple-600 px-4 py-2/g) ?? [];
  assert.ok(solidPrimary.length <= 1, "only the create button may be a solid primary");
});

test("modal: banner presets have a clear selected state", () => {
  assert.ok(modal.includes("aria-pressed={selected}"), "presets must expose pressed state");
  assert.ok(modal.includes("ring-2 ring-purple-200"), "the selected preset must be ringed");
  assert.ok(modal.includes("1700 × 700 px recommended"), "the size hint must stay");
  assert.ok(modal.includes("Change Image") && modal.includes("Remove"), "replace/remove must stay");
});

test("modal: SEO subtitle stays collapsible and optional", () => {
  assert.ok(modal.includes("showAdvanced"), "the collapsible state must exist");
  assert.ok(modal.includes('useState(false)'), "it must be collapsed by default");
  assert.ok(modal.includes("(optional)"), "the section must be labelled optional");
  assert.ok(modal.includes('aria-expanded={showAdvanced}'));
  assert.ok(modal.includes("<textarea"), "an expanded textarea must be provided");
});

test("modal: storefront status is a persisted segmented control", () => {
  assert.ok(modal.includes('role="radiogroup"'), "status must be a radio group");
  assert.ok(modal.includes("aria-checked={isActive}"));
  assert.ok(
    modal.includes('{ key: "_is_active", value: String(isActive) }'),
    "the active state must still be persisted"
  );
});
