# ANGKON — Route & Navigation Map

Source of truth: `src/app/**` and `src/components/navigation|layout/**`.
Every storefront route renders inside `RootShell` → **Navbar** (announcement bar + header + cart drawer + mobile drawer) … page … **Footer** + WhatsApp button.

## Global chrome (all storefront routes)

| Part | Contents | File |
|---|---|---|
| Announcement bar | Free shipping over ৳15,000 · COD nationwide · 7-day exchange | `navigation/Navbar.tsx` |
| Header (desktop) | Logo · Home · Women · Men · Activewear · Accessories · All Products · Policies · About · SALE · Search · Wishlist · Cart (with subtotal) | `navigation/Navbar.tsx` |
| Header (mobile) | Menu button → drawer with category tree · Search · Wishlist · Cart | `navigation/MobileMenu.tsx` |
| Cart drawer | Line items, free-shipping meter (৳15,000), checkout button | `layout/cart-drawer.tsx` |
| Search | Instant search modal | `layout/search-modal.tsx` |
| Footer | Brand + showroom + contact · Explore collections · Customer support · Newsletter · Social · Payment badges | `layout/footer.tsx` |

## Storefront routes

| Route | Purpose | Main sections |
|---|---|---|
| `/` | Home | Hero · Shop by collection (8 tiles) · COD band · New & trending (10) · Trust pillars · Showroom card |
| `/products` | Shop / all products | Filter bar · sort · product grid · pagination |
| `/[category]` | Collection (e.g. `/men`, `/women`, `/pants`) | Hero · subcategory nav · breadcrumb · product grid |
| `/[category]/[subcategory]` | Sub-collection | Breadcrumb · product grid |
| `/products/[slug]` | Product detail | Gallery · title/price · size selector · quantity · Add to cart / Buy now · delivery calculator · description · reviews · related |
| `/sale` | On-sale products | Grid filtered to discounted items |
| `/search` | Search results | Query + grid |
| `/wishlist` | Saved items | Grid from wishlist store |
| `/cart` | Full cart | Items · totals · shipping hint · checkout CTA |
| `/checkout` | Checkout | Customer form · 64-district selector · shipping fee · COD · order summary |
| `/about` | About ANGKON | Story · values |
| `/contact` | Contact & showroom | Address · hours · WhatsApp · form |
| `/shipping` | Shipping & delivery policy | Policy text |
| `/returns` | 7-day exchange & returns | Policy text |
| `/policies` | Store policies hub | Links/summary |
| `/terms` | Terms & conditions | Legal text |
| `/privacy` | Privacy policy | Legal text |

## Admin (not in public nav)

`/admin` → `/admin/dashboard`, `/admin/products` (+ `/new`, `/[id]`), `/admin/categories`, `/admin/orders`, `/admin/customers`, `/admin/reports`, `/admin/settings`.

## API routes

`/api/products`, `/api/products/[slug]`, `/api/categories`, `/api/orders`, `/api/reviews`, `/api/shipping`, and `/api/admin/*` (login, products, categories, orders, reports, upload).

## Known gaps to fix

1. Nav/footer still link to a `Mighto` activewear collection (carried over from the other store) — rename or replace with your own collection.
2. Product data and photos in `src/data/real-products.json` come from another store — replace with ANGKON's own catalog.
3. `Navbar.tsx` comment mentions the other store; reword.
4. No account/login route in the storefront nav — decide whether to add `/account`.
