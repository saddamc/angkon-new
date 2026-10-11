# Component Specifications: ANGKON (Gorur Ghash Design System)

Specifications for all repeated UI components, variants, states, token bindings, and accessibility requirements.

---

### 1. Button (Action & CTAs)
- **variants**:
  - `primary`: Solid `#E1B76F` fill, `#400604` text, `#f3cb87` hover fill.
  - `outline`: 1px `#E1B76F` border, `#E1B76F` text, inverted `#f3cb87` fill on hover with `#400604` text.
  - `ghost`: Transparent background, `#E1B76F` text, `#4a0705` hover background.
  - `secondary`: `#4a0705` background, `#5c0f0d` border, `#E1B76F` text.
- **sizes**:
  - `sm`: 32px height, 11px font, rounded-full or 10px radius.
  - `md`: 40px height, 13px font, 12px `rounded-brand` radius.
  - `lg`: 48px height, 14px font, 12px `rounded-brand` radius.
- **states**: default, hover, active (scale 0.98), focus-visible (2px outline gold), disabled (opacity 50%), loading (animated spinner).
- **tokens**: bg `accent`, text `on-accent`, radius `brand`, font `sm/700`.
- **a11y**: Native `<button>`, visible focus indicators, `aria-disabled` and screen reader announcements for loading state.
- **used on**: S01, S02, S03, S04, S05, S06, S08.

---

### 2. AstraCartDrawer
- **geometry**: 460px fixed width on desktop, 100% full-width on mobile (<544px), full-height (100vh).
- **position**: Fixed right off-canvas overlay, slide-in from `right: 0` via `translateX(0)`.
- **components**:
  - Header: "Shopping Bag", live item count pill, close button with accessible SVG icon.
  - Free Shipping Progress Meter: dynamic bar calculating progress to ৳3,000 threshold.
  - Items List: scrollable vertical stack with 3:4 thumbnail, product title, size pill, quantity stepper, price, and delete button.
  - Footer Action Strip: Subtotal row, "View Cart" outline button, and "Checkout" solid gold CTA.
- **states**: closed (hidden), opening (transition 300ms cubic-bezier), open (backdrop blur), closing.
- **tokens**: bg `#400604`, border `#5c0f0d`, progress fill `#E1B76F`, shadow `drawer`.
- **a11y**: `role="dialog"`, `aria-modal="true"`, focus trap inside drawer, Escape key closes drawer.
- **used on**: Global overlay (S01–S08).

---

### 3. FreeShippingProgress
- **threshold**: `৳3,000` (Bangladeshi Taka).
- **states**:
  - `progress < ৳3,000`: "Add ৳{remaining} more for FREE Delivery!" with gold animated meter.
  - `progress >= ৳3,000`: "🎉 You unlocked FREE Delivery!" with 100% full gold glow.
- **tokens**: bg `#2b0403`, bar fill `#E1B76F`, text `#E1B76F` and `#cbb18a`.
- **used on**: S04 (Astra Drawer), S05 (Cart Page).

---

### 4. ProductCard (Catalog & Drops)
- **aspect-ratio**: 3:4 portrait apparel framing.
- **features**:
  - Primary photoshoot image.
  - Secondary lifestyle angle photo flip on mouseover.
  - Discount percentage pill badge (`-20%`, `-30%`) in `#E1B76F` on top-left.
  - `Sold Out` status pill when `stock_quantity <= 0`.
  - Product title in `font-heading` (`Lato`).
  - Regular price (strikethrough) and current sale price formatted in Bangladeshi Taka (`৳`).
  - Quick action pill button ("Add to Bag" or "Select Options").
- **states**: default, hover (subtle scale 102%, image cross-fade), sold out.
- **tokens**: surface `#4a0705`, border `#5c0f0d`, text `#E1B76F`.
- **used on**: S01 (Home), S02 (Catalog), S08 (Wishlist).

---

### 5. SizeSelector
- **variants**: 12px pill buttons for sizes `S`, `M`, `L`, `XL`, `XXL`.
- **states**:
  - default: `#2b0403` background, `#5c0f0d` border, `#cbb18a` text.
  - hover: `#5c0f0d` background, `#E1B76F` text.
  - selected: solid `#E1B76F` background, `#400604` text, font-bold.
  - out-of-stock: strikethrough line, opacity 40%, disabled cursor.
- **tokens**: radius `brand` (12px), border `#5c0f0d`, active `#E1B76F`.
- **a11y**: `role="radiogroup"`, `aria-checked="true"` for selected size.
- **used on**: S03 (PDP).

---

### 6. ShippingEstimatorBox
- **rates**:
  - Inside Dhaka (2–3 Days): `৳60`
  - Outside Dhaka (3–5 Days): `৳100`
- **states**: District selected, dynamic fee badge updated.
- **tokens**: surface `#2b0403`, border `#5c0f0d`, icon `#E1B76F`.
- **used on**: S03 (PDP), S06 (Checkout).

---

### 7. FormInput & FormSelect
- **variants**: Text, Email, Tel, Dropdown select (for 64 Bangladeshi districts).
- **states**: default, hover, focus (1px solid `#E1B76F` ring), error (border `#f87171`), disabled.
- **tokens**: bg `#2b0403`, border `#5c0f0d`, text `#E1B76F`, placeholder `#cbb18a/60`.
- **a11y**: `<label>` association with `htmlFor`, `aria-invalid` on validation failure.
- **used on**: S06 (Checkout), S07 (Search Modal), Admin.
