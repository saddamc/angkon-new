# ANGKON — Premium Sports & Lifestyle Store

A production-ready e-commerce storefront built with **Next.js 15 (App Router)**, TypeScript, Tailwind CSS, Framer Motion, Zustand, and Axios — powered directly by the **WooCommerce REST API**.

---

## 1. How the backend works

**ANGKON talks directly to your WordPress/WooCommerce site — no separate backend server is needed.**

```
┌────────────────────┐        WooCommerce REST API        ┌──────────────────────┐
│      ANGKON        │  ──────────────────────────────▶   │   WordPress +         │
│   (Next.js app)    │      /wp-json/wc/v3/...             │   WooCommerce site    │
│                    │  ◀──────────────────────────────   │   (products, orders,  │
│  - storefront      │                                     │    reviews, shipping) │
│  - admin panel     │                                     └──────────────────────┘
│  - /api/* routes   │
└────────────────────┘
```

The `src/app/api/*` folders are **Next.js API routes** — they run server-side inside this same app and proxy requests to WooCommerce. They are *not* a separate service.

> ### Note on the `../server` folder
> The repository may contain a `server/` folder (Express + Prisma + PostgreSQL).
> **It is NOT used by this frontend.** You can ignore it entirely.
> To run the store you only need this `NetBazer/` folder + your WordPress site.

---

## 2. Admin Panel

Admin authentication is handled **entirely inside the Next.js app**:

- Login route: `src/app/api/admin/login/route.ts`
- Validates credentials against `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars
- On success, signs a `JWT_SECRET` token stored in a secure **HttpOnly cookie** (`nb_admin_token`, 8 h)
- Logout clears the cookie

**Set these in `.env.local` to enable admin login:**

```bash
ADMIN_USERNAME=your-admin-name
ADMIN_PASSWORD=your-strong-password
JWT_SECRET=a-long-random-secret-string
```

Then visit **`/admin`** to log in. No Express server, no database, no extra port.

---

## 3. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_WC_API_URL` | ✅ Yes | Your WordPress site URL (e.g. `https://shop.example.com`) |
| `NEXT_PUBLIC_WC_CONSUMER_KEY` | ✅ Yes | WooCommerce REST API consumer key |
| `NEXT_PUBLIC_WC_CONSUMER_SECRET` | ✅ Yes | WooCommerce REST API consumer secret |
| `ADMIN_USERNAME` | ✅ Yes (admin) | Admin panel login name |
| `ADMIN_PASSWORD` | ✅ Yes (admin) | Admin panel login password |
| `JWT_SECRET` | ✅ Yes (admin) | Signs the admin session cookie |
| `WC_ORDERS_CONSUMER_KEY` | ⬜ Optional | Separate key for **creating orders** (falls back to public key) |
| `WC_ORDERS_CONSUMER_SECRET` | ⬜ Optional | Separate secret for creating orders |
| `WP_ADMIN_USERNAME` | ⬜ Optional | WordPress user — needed for **admin image uploads** |
| `WP_APP_PASSWORD` | ⬜ Optional | WordPress Application Password for that user |

**Notes:**
- `NEXT_PUBLIC_*` variables are intentionally browser-visible — they are read-only product keys.
- `ADMIN_*`, `JWT_SECRET`, `WC_ORDERS_*`, and `WP_*` are server-only and never exposed to the browser.
- Get WooCommerce keys: **WooCommerce → Settings → Advanced → REST API**
- Get a WordPress Application Password: **Users → Your Profile → Application Passwords**

---

## 4. Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # edit with your values

# 3. Start the development server
npm run dev   # → http://localhost:3000
```

| Command | Description |
|---|---|
| `npm run dev` | Dev server (Webpack) on port 3000 |
| `npm run dev:turbo` | Dev server (Turbopack) on port 3000 |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint the project |

> If WooCommerce API variables are missing or the API fails, the storefront falls back to built-in demo products so the UI always renders.

---

## 5. Project Structure

```
NetBazer/
├── src/
│   ├── app/
│   │   ├── (storefront)            Home, Products, Product/[slug], Cart, Checkout, Category…
│   │   ├── admin/                  Admin panel (Dashboard, Products, Orders, Reports…)
│   │   └── api/
│   │       ├── admin/login/        Admin auth (credentials → HttpOnly cookie)
│   │       ├── admin/products/     Admin product CRUD
│   │       ├── admin/upload/       Image upload to WordPress media library
│   │       ├── admin/categories/   Category management
│   │       ├── categories/         Public category listing
│   │       ├── orders/             Create WooCommerce orders
│   │       ├── reviews/            Product reviews (GET + POST)
│   │       └── shipping/           Shipping zones & rates
│   ├── components/
│   │   ├── layout/                 Navbar, Footer, MegaMenu
│   │   ├── product/                ProductCard, ProductDetailsView, SizeSelector…
│   │   ├── products/               ProductGrid, ProductFilters, ProductSort…
│   │   ├── sections/               Hero, FeaturedProducts, SEO section…
│   │   └── admin/                  Admin-only UI components
│   ├── store/                      Zustand stores (cart, etc.)
│   ├── services/                   WooCommerce API fetch helpers
│   ├── hooks/                      Custom hooks (use-auth, …)
│   ├── data/                       Static data (Bangladesh districts, category config…)
│   ├── types/                      TypeScript interfaces (WooProduct, WooReview, …)
│   └── utils/                      Price formatting, helpers
└── public/                         Static assets
```

---

## 6. Key Features

| Feature | Details |
|---|---|
| **Premium UI** | Dark luxury sports-store design with Framer Motion animations |
| **Product Catalog** | Grid with filters, sorting, search, and category mega-menu |
| **Product Detail Page** | Multi-image gallery (thumbnails below), size selector, tabbed info (Description, Specs, Shipping, Reviews) |
| **Trust Strip** | 100% Authentic · Fast Dispatch · 30-Day Returns shown on every product |
| **Shipping Options** | Office Pickup (Free), Inside Dhaka, Outside Dhaka — pulled per-product from WooCommerce meta |
| **Cart & Checkout** | Zustand cart with localStorage persistence; WooCommerce order creation |
| **Reviews** | Fetch + POST reviews from WooCommerce; rating breakdown with animated bars |
| **Admin Panel** | Self-contained login, product CRUD, image upload, orders view |
| **SEO** | Per-page meta titles, descriptions, Open Graph tags |
| **Responsive** | Mobile-first layout; works across all screen sizes |
| **Demo Fallback** | Shows demo products when the WooCommerce API is unavailable |

---

## 7. Shipping Policy (Platform Default)

| Delivery Method | Time | Cost |
|---|---|---|
| Office Pickup | — | **Free** |
| Inside Dhaka | 1–3 business days | Per product (default ৳50) |
| Outside Dhaka | 2–5 business days | Per product (default ৳80) |
| Returns | Within 30 days | Free (items must be unused, original condition) |

> Delivery fees are stored per-product in WooCommerce custom meta fields (`_delivery_inside`, `_delivery_outside`) and can be set individually from the admin panel.

---

## 8. Branding

- **Brand Name:** ANGKON
- **Brand Type:** Premium Sports & Lifestyle E-Commerce
- **Technology:** Next.js 15 · TypeScript · Tailwind CSS · WooCommerce REST API
