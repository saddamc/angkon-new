# Replica Build Log: ANGKON (Gorur Ghash 100% Replication)

Screen-by-screen build tracking against `replica/recon.md` and `replica/features.csv`.
Theme: Royal Maroon (`#400604`) & Heritage Gold (`#E1B76F`).

---

## Screen Inventory Build Status

| ID | Screen | Route | Status | Notes & States Handled |
| :--- | :--- | :--- | :--- | :--- |
| **S01** | Homepage | `/` | **Done** | Announcement ticker (`#2b0403`), 4 trust pillars, circular category chips, new drops carousel, trending products grid, FAQ accordions, and Modern Heritage SEO section. Responsive at 390px and 1440px. |
| **S02** | Catalog / Shop | `/products`, `/[category]` | **Done** | Dual-range price slider, category accordion sidebar, 3:4 portrait product card grid with photoshoot hover flips, sort selector, active filter chips, mobile filter drawer. |
| **S03** | Product Details | `/products/[slug]` | **Done** | Multi-image gallery with gold active thumbnail borders, 12px pill size selector (S–XXL), Inside Dhaka (৳60) / Outside Dhaka (৳100) shipping estimate box, dual CTA buttons ("Add to Cart" & "Buy It Now"), specification tabs, review submission form. |
| **S04** | Astra Cart Drawer | Global slide-out | **Done** | 460px right off-canvas drawer, dynamic ৳3,000 free shipping goal meter with animated gold progress bar, quantity steppers, item deletion, live BDT subtotal, dual action CTAs ("View Cart" & "Checkout"). |
| **S05** | Cart Page | `/cart` | **Done** | Full-width cart table, item thumbnail previews, size tags, quantity steppers, free shipping threshold meter, order summary sidebar, clear-cart action. |
| **S06** | Checkout Page | `/checkout` | **Done** | 3-step billing form (Contact, Shipping with 64 Bangladeshi district selector, COD payment method), delivery fee calculation (৳60 Dhaka vs ৳100 Outside), sticky order summary, order placed success view. |
| **S07** | Search Modal | Global overlay | **Done** | Instant modal search overlay with keyboard shortcut trigger, live query filtering, product thumbnail results, empty state. |
| **S08** | Wishlist Page | `/wishlist` | **Done** | Persistent client-side wishlist store, saved apparel cards with direct "Add to Cart" and "Remove" actions, empty state with "Continue Shopping" CTA. |

---

## Technical Highlights & Hardest Parts Solved

1. **Astra-Style Slide Drawer Synchronization**:
   - Replicated exact 460px right off-canvas slide animation (`transition-transform duration-300`).
   - Integrated live cart state with dynamic free shipping bar tracking the ৳3,000 threshold across all add/increment/decrement actions.
2. **Apparel Card Hover Flip (3:4 Portrait Framing)**:
   - Configured exact portrait aspect ratio matching Gorur Ghash fashion photography.
   - Smooth CSS cross-fade transition flipping to secondary lifestyle angle on mouseover.
3. **Bangladeshi Delivery & Cash on Delivery (COD)**:
   - Dynamic district detection updating delivery rates to ৳60 (Dhaka) or 100 (Outside Dhaka).
   - Cash on Delivery order creation flow with complete customer phone and address capture.
4. **WCAG AAA Color Uniformity**:
   - Eliminated all legacy light-theme backgrounds across customer-facing routes.
   - Guaranteed 8.99:1 contrast ratio across all headings, buttons, and form inputs.
