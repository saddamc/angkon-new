# Architecture: ANGKON (a rebuild of Gorur Ghash's core features)

Architectural blueprint for **ANGKON — House of Modern Heritage** replicating the full layout, micro-interactions, and checkout flow of **gorurghash.com**, with high-contrast luxury styling (`#400604` Royal Maroon background and `#E1B76F` Heritage Gold accents).

---

## 1. Stack

| Layer | Choice | Why |
| :--- | :--- | :--- |
| **Web App** | Next.js 16.2 (App Router) + TypeScript | Hybrid SSR/SSG for rapid product catalog SEO and instant client-side cart transitions. |
| **Styling** | Tailwind CSS + Custom Brand Tokens | Direct token control (`#400604` background, `#E1B76F` gold text/accents, 12px pill radius) matching Gorur Ghash geometry. |
| **State** | Zustand (`useCartStore`, `useWishlistStore`) | High-performance, zero-latency reactive state for the 460px Astra-style slide-out drawer with persistent `localStorage`. |
| **Data / Backend** | WooCommerce REST API + Next.js API Routes | Decoupled headless e-commerce; leverages existing WooCommerce order management and catalog backend. |
| **Database** | PostgreSQL / Supabase (or SQLite Edge) | ACID-compliant relational schema for products, variants, orders, and customer address records. |
| **Payments** | Cash on Delivery (COD) + bKash / Nagad Gateway | Dominant Bangladeshi checkout pattern; instant COD placement with automated SMS/email verification. |
| **Hosting** | Vercel / Node.js Production Server | Global edge CDN caching, image optimization (`next/image`), and Turbopack fast builds. |

---

## 2. Schema

Total Tables: **7** (See [replica/schema.sql](file:///d:/Client%20Project/angkon-N/replica/schema.sql))
Access rules: Strict server-side validation on Next.js API route proxies, preventing unauthorized modifications.

### Core Tables Summary:
1. `categories` — Parent/child hierarchy for Shirts, Polos, T-Shirts, Bottoms, Winter.
2. `products` — Base catalog data, BDT pricing, stock states, and 3:4 photoshoot gallery references.
3. `product_variants` — Specific size (S, M, L, XL, XXL) and SKU combinations with dedicated inventory.
4. `customers` — Verified phone numbers, delivery addresses, and order history.
5. `orders` — Order tracking numbers, delivery zones (Dhaka ৳60 / Outside ৳100), COD status, and totals.
6. `order_items` — Line items attached to orders with snapshot pricing and selected sizes.
7. `reviews` — Customer feedback, 1–5 star ratings, and review status.

---

## 3. API & Routes by Flow

| Method & Path | Does | Who | Input | Output | Flow |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET /api/categories` | Returns category hierarchy & live counts | Public | None | `CategoryNode[]` | S01, S02 |
| `GET /api/products` | Lists paginated products with category/price filters | Public | `category`, `minPrice`, `maxPrice`, `page` | `WooProduct[]` | S02 |
| `GET /api/products/[slug]` | Retrieves complete product details & size options | Public | `slug` | `WooProduct` | S03 |
| `POST /api/orders` | Creates new order (COD or digital payment) | Public / Customer | Billing address, items, zone, phone | `{ id, orderNumber, status }` | S06 (F04) |
| `GET /api/shipping` | Calculates delivery rates for district | Public | `district` | `{ fee: 60 | 100, days }` | S03, S06 |
| `POST /api/reviews` | Submits customer review and rating | Customer | Product ID, name, rating, comment | `{ success: true }` | S03 |
| `GET /api/admin/*` | Administrative management & analytics | Admin | Auth Token | Order / product records | Admin |

### Webhooks & Integrations:
- **bKash / Nagad IPN (Instant Payment Notification)**: Handles digital payment verification and auto-moves orders from `unpaid` to `processing`.
- **Courier Webhook (Steadfast / Pathao)**: Automated dispatch tracking and delivery status sync for Cash on Delivery.

---

## 4. The Parts That Bite

- **Dynamic Free Shipping Bar Synchronization**: Astra drawer must recalculate remaining amount to ৳3,000 milestone dynamically on every quantity increment/decrement without page reloads.
- **Bangladeshi Shipping Zone Rules**: Automatic detection of Dhaka Metro (`৳60`, 2–3 days) vs All other 63 districts (`৳100`, 3–5 days) directly bound to checkout calculation.
- **Inventory Concurrency & Overselling**: Size variants must check live stock before confirming checkout to prevent simultaneous checkout conflicts on limited drop runs.
- **Time Zones**: All order timestamps stored in UTC and rendered in Bangladesh Standard Time (`BST / UTC+6`).

---

## 5. Build Order

1. **Vertical Slice (Milestone 1)**:
   - Core shopping loop: Homepage drops (`S01`) ➔ PDP sizing (`S03`) ➔ Astra slide-out cart drawer (`S04`) ➔ COD checkout (`S06`).
   - Database tables: `products`, `orders`, `order_items`.
2. **Must-Haves (Milestone 2)**:
   - 460px Astra right off-canvas drawer with live ৳3,000 progress bar.
   - 3:4 portrait product card layout with secondary photoshoot flip.
   - Dhaka (৳60) / Outside Dhaka (৳100) shipping calculator.
   - Cash on Delivery billing form with 64-district selector.
3. **Should-Haves & Enhancements (Milestone 3)**:
   - Real-time instant search modal (`S07`).
   - Client-side persistent wishlist (`S08`).
   - Category navigation pills and filter drawer on mobile.
4. **Verification & Parity Gate (Milestone 4)**:
   - `replica-diff` feature parity score = 100.0 / 100.
   - Clean Turbopack compilation across all 25 routes (`npm run build`).
   - WCAG AAA contrast ratio compliance (8.99:1).
