# Feature Parity Report: ANGKON (Gorur Ghash Replication)

Date: 2026-10-09  
Evaluator: `replica-diff` (`parity.py`)  
Parity Score: **100.0 / 100**  
Verdict: **Shippable**

---

## 1. Feature Parity Breakdown

- **Total Counted Features**: 18 of 18 (100.0%)
- **Must-Have Features**: 13 of 13 (100.0%)
- **Should-Have Features**: 4 of 4 (100.0%)
- **Could-Have Features**: 1 of 1 (100.0%)

### Score By Area:
| Area | Score | Features Counted | Status |
| :--- | :--- | :--- | :--- |
| **header** | 100.0% | 2 | Completed (Ticker & Cart Subtotal Counter) |
| **cart** | 100.0% | 2 | Completed (Astra 460px Drawer & ৳3,000 Milestone Meter) |
| **catalog** | 100.0% | 4 | Completed (3:4 Portrait Framing, Image Hover Flip, Category Pills, Discount Badge) |
| **pricing** | 100.0% | 1 | Completed (Bangladeshi Taka ৳ formatting) |
| **product** | 100.0% | 3 | Completed (12px Size Pills, Dual CTAs, Dhaka ৳60 / Outside ৳100 Calculator) |
| **home** | 100.0% | 1 | Completed (4 Brand Trust Pillars) |
| **navigation** | 100.0% | 1 | Completed (Responsive Mobile Drawer with Collections) |
| **footer** | 100.0% | 1 | Completed (Niketan Showroom, WhatsApp & Payment Badges) |
| **search** | 100.0% | 1 | Completed (Instant Search Modal Overlay) |
| **account** | 100.0% | 1 | Completed (Client-side Wishlist Store) |
| **checkout** | 100.0% | 1 | Completed (Cash on Delivery with 64-District Selector) |

---

## 2. Missing Features

- **None**: Every counted feature is fully implemented and verified.

---

## 3. Behaviour Differences & Improvements Over Original

| Flow | Gorur Ghash (Original) | ANGKON (Clone) | Verdict |
| :--- | :--- | :--- | :--- |
| **Core Checkout Steps** | 3–4 clicks through standard WooCommerce page | 2 clicks via direct "Buy It Now" button straight to checkout | **Better / Faster** |
| **Page Load Speed** | WordPress PHP monolith with heavy plugins | Next.js 16.2 Turbopack with pre-rendered static routes and sub-second transitions | **Better / Faster** |
| **Cart Drawer Experience** | PHP-rendered Astra mini-cart overlay | Zero-latency client-side Zustand store with real-time reactive ৳3,000 threshold meter | **Better** |
| **Visual Accessibility** | Standard yellow `#fbdd02` on white (low contrast on light backgrounds) | High-contrast Royal Maroon (`#400604`) and Heritage Gold (`#E1B76F`) with **8.99:1 WCAG AAA** compliance | **Better** |
| **Mobile Experience** | Heavy DOM payload with WordPress assets | Lightweight responsive mobile menu with Niketan showroom and WhatsApp | **Better** |

---

## 4. Verdict: Shippable

- [x] All 13 must-haves implemented and verified.
- [x] Feature parity score: 100.0 / 100.
- [x] Zero open S1 or S2 bugs.
- [x] Zero TypeScript compilation errors (`npm run build` exits 0).
