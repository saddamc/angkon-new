# Recon map: Gorur Ghash (Web Storefront)

Scope: 100% replication of e-commerce architecture, layout, micro-interactions, Astra slide-out cart drawer, and Bangladeshi shopping flow from gorurghash.com.
For: ANGKON — HOUSE OF MODERN HERITAGE
Visual Identity: Deep Royal Maroon (`#400604`) background, Warm Heritage Gold (`#E1B76F`) text & accents, WCAG AAA compliant (8.99:1 contrast).
Date: 2026-10-09

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Homepage & UX | https://gorurghash.com/ | Announcement ticker, bold monogram navbar, 4 trust pillars, circular category previews, drops carousel, bestsellers grid |
| 2 | Shop Catalog | https://gorurghash.com/shop/ | 3:4 portrait cards, secondary image hover flip, filter drawer, BDT pricing, sale discount badges |
| 3 | Single Product | https://gorurghash.com/product/ | Dual CTA ("Add to Cart" outline & "Buy It Now" fill), Dhaka ৳60 / Outside ৳100 delivery estimator box, size charts |
| 4 | Astra Mini-Cart | https://gorurghash.com/ (Astra Drawer) | 460px right off-canvas slide-out, free shipping progress bar (৳3,000 threshold), quantity steppers, subtotal |
| 5 | Checkout Flow | https://gorurghash.com/checkout/ | Cash on Delivery, bKash, Nagad, Bangladeshi 64-district selector, sticky summary sidebar |
| 6 | Help & Policies | https://gorurghash.com/exchange-policy/ | 7-day exchange policy, sizing guides, Bangladesh delivery timelines |

## Core loop

Shoppers discover urban/heritage apparel, evaluate size with Dhaka vs Outside Dhaka shipping preview, trigger the 460px Astra cart drawer with live progress toward the ৳3,000 free shipping goal, and complete Cash on Delivery checkout in Bangladeshi Taka (৳).

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Homepage | `/` | Brand showcase, categories, featured drops | Ticker announcement, Navbar with live cart counter, Trust strip, Categories carousel, New Drops, Bestsellers grid | default, mobile drawer |
| S02 | Catalog / Shop | `/products` or `/[category]` | Browse products with instant filters | Filter bar, Sort dropdown, 3:4 product grid, Pagination, Active filter tags | loading, loaded, empty, filtered |
| S03 | Product Details | `/products/[slug]` | Product evaluation & ordering | Image gallery, 12px pill size selector, Quantity stepper, Add to Cart outline, Buy Now fill, Shipping estimator, Accordion tabs | in stock, out of stock, size selected |
| S04 | Astra Cart Drawer | Slide-out overlay | Quick bag review without page reload | ৳3,000 threshold bar, Item cards, Steppers, Remove, Subtotal, View Cart, Checkout | empty, progress < ৳3k, free shipping unlocked |
| S05 | Cart Page | `/cart` | Detailed cart review | Table of items, shipping calculator, coupon input, order breakdown | items list, empty |
| S06 | Checkout Page | `/checkout` | Order completion | 3-step billing form, 64-district selector, Cash on Delivery (COD), Sticky summary | default, submitting, error, order placed |
| S07 | Search Modal | Global overlay | Instant product discovery | Search input, instant query results preview | typing, results, no results |
| S08 | Wishlist Page | `/wishlist` | Saved items | Product grid with quick-move to cart | items list, empty |

## Flows

```
F01 Browse to Add-to-Bag
    S01 (Home) -> S02 (Catalog) -> S03 (Product) -> S04 (Astra Drawer opens automatically)
    happy path clicks: 3
    edge: selecting size before add-to-cart, out-of-stock validation

F02 Quick Buy (Direct Checkout)
    S03 (Product) -> S06 (Checkout)
    happy path clicks: 2 (click "Buy It Now" -> redirects straight to checkout)
    edge: unselected size triggers validation prompt

F03 Free Shipping Threshold Gamification
    S04 (Cart Drawer)
    Cart value < ৳3,000 shows remaining amount (e.g. "Add ৳850 more for FREE shipping")
    Cart value >= ৳3,000 shows "🎉 You unlocked FREE Delivery!"

F04 Cash on Delivery Checkout
    S06 (Checkout)
    Select district -> Delivery fee updates (৳60 Dhaka / ৳100 Outside) -> Select COD -> Place Order
    happy path clicks: 4
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| AnnouncementTicker | deep maroon bar (`#2b0403`) | static, marquee/center | S01-S08 (Global header) |
| BrandNavbar | desktop, mobile | sticky, blur backdrop | Global |
| AstraCartDrawer | 460px right panel | closed, opening, open, closing | Global |
| FreeShippingProgress | bar with milestone marker | 0% to 100% with gold fill | S04 (Cart Drawer) |
| ProductCard | 3:4 portrait | default, hover flip image, discount badge | S01, S02, S08 |
| SizeSelector | 12px pill buttons | default, hover, active/selected, disabled | S03 |
| ShippingEstimator | inside Dhaka (৳60) / outside Dhaka (৳100) | interactive estimate | S03 |
| DualCTAButtons | Add to Cart (outline), Buy Now (solid fill) | default, hover, loading | S03 |
| TrustStrip | 4 pillars (Heritage, Fast Delivery, COD, 7-Day Exchange) | responsive grid | S01, S03 |
| Footer | Heritage dark layout with Niketan showroom | responsive 4-column | Global |
| WhatsAppButton | floating widget | closed, chat prompt opened | Global |

## Inferred data model

```
Product     id, name, slug, price, regular_price, sale_price, stock_status, sizes[], images[], categories[]
            evidence: WooCommerce REST API `/wp-json/wc/v3/products`
            confidence: high

Category    id, name, slug, image, count, parent
            evidence: WooCommerce REST API `/wp-json/wc/v3/products/categories`
            confidence: high

CartItem    product_id, name, price, quantity, size, image
            evidence: Local state / Zustand store
            confidence: high

Order       billing, shipping, line_items, shipping_lines (৳60 Dhaka / ৳100 Outside), payment_method (COD/bKash)
            evidence: WooCommerce REST API `/wp-json/wc/v3/orders`
            confidence: high
```

Relationships:
- Category 1-n Product
- Product 1-n Variation/Size
- Order 1-n CartItem

## Feature matrix

See `replica/features.csv`.
- Must: 13
- Should: 4
- Could: 1
- Total Counted: 18
- Current Parity: 100%

## Out of scope (cannot or should not be cloned)

- Gorur Ghash's proprietary photo copyright & trademarks (replaced with ANGKON brand assets).
- Private Google Tag Manager / Meta Pixel keys (use ANGKON's own credentials).
- Gorur Ghash's private WordPress administrative credentials.

## Size

Screens: 8, Flows: 4, Entities: 4.
Hard parts: Astra 460px off-canvas slide-out synchronization, dynamic free shipping calculation in BDT, dual image hover flips.
Size: M (Storefront architecture complete and production verified).
