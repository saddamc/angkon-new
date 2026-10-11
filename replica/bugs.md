# Bug Log & Resolution: ANGKON

Tracked issues, severity ratings, reproduction steps, and fixes applied during replication.

---

### BUG-001: Root layout body tag leaked light theme
- **Severity**: S3 (Visually inconsistent)
- **Flow / Case**: Global layout
- **Screen**: All screens (S01–S08)
- **Steps**:
  1. Navigate to `/wishlist` or empty `/cart`.
  2. Observe background flashing light gray (`#f9f9f9`).
- **Expected**: Complete royal maroon (`#400604`) background on all routes.
- **Actual**: Root `<body>` had legacy classes `text-[#000000] bg-[#f9f9f9]`.
- **Status**: **Fixed** — updated `src/app/layout.tsx` with `bg-[#400604] text-[#E1B76F]`.

---

### BUG-002: Product card button hover leaked white background
- **Severity**: S3 (Visually wrong)
- **Flow / Case**: F01-H2
- **Screen**: S02 (Catalog)
- **Steps**:
  1. Hover over "Add to Bag" button on product card.
  2. Button background flashed pure white.
- **Expected**: Hover transition to warm highlight gold (`#f3cb87`).
- **Actual**: Class was `hover:bg-white`.
- **Status**: **Fixed** — updated `product-card.tsx` and `products-filter-bar.tsx` to `hover:bg-[#f3cb87]`.

---

### BUG-003: UI primitive buttons defaulted to blue/zinc
- **Severity**: S4 (Cosmetic)
- **Flow / Case**: Primitive design tokens
- **Screen**: UI library
- **Steps**:
  1. Render `Button` or `Input` from `@/components/ui/`.
  2. Element rendered with `bg-blue-600` or `border-zinc-200`.
- **Expected**: Use brand tokens (`#E1B76F`, `#4a0705`, `#5c0f0d`).
- **Status**: **Fixed** — mapped variants in `button.tsx`, `input.tsx`, and `textarea.tsx` to Royal Maroon & Heritage Gold tokens.

---

### BUG-004: Social link pointed to YouTube instead of TikTok
- **Severity**: S4 (Information mismatch)
- **Flow / Case**: Global footer & mobile drawer
- **Screen**: Global
- **Steps**:
  1. Inspect footer social icon row.
  2. YouTube icon was present.
- **Expected**: TikTok link pointing to `www.tiktok.com/@angkon.official`.
- **Status**: **Fixed** — replaced YouTube with TikTok icon and link in `footer.tsx` and `MobileMenu.tsx`.

---

## Bug Severity Summary
- **S1 (Blocker / Data Loss)**: 0 open, 0 total
- **S2 (Feature Broken)**: 0 open, 0 total
- **S3 (Visible Glitch / Visual Inconsistency)**: 0 open, 2 fixed
- **S4 (Cosmetic / Copy Polish)**: 0 open, 2 fixed
- **Total Open**: **0**
