# ANGKON — Luxury Fashion & Royal Apparel Store

A production e-commerce storefront and admin panel built with **Next.js (App Router)**, TypeScript, Tailwind CSS, Framer Motion and Zustand. All data lives in **MongoDB Atlas**; product and category images live in **Cloudinary**; transactional email is sent through **Resend**.

There is no separate backend server — the `src/app/api/*` folders are Next.js route handlers that run inside this same app.

---

## 1. Architecture

```
Browser ──▶ Next.js app (storefront + admin + /api routes) ──▶ MongoDB Atlas   (products, categories, orders, customers, settings)
                                                          ├──▶ Cloudinary      (images)
                                                          └──▶ Resend          (order & verification emails)
```

| Concern | Where |
|---|---|
| Products, categories, orders, users, settings | MongoDB models in `src/models/`, data access in `src/lib/db/` and `src/server/` |
| Delivery pricing (Inside Dhaka / Gazipur-Narayanganj-Savar / elsewhere, free-delivery threshold) | `src/lib/shipping.ts` — configured in **Admin → Settings → Shipping** |
| Checkout options and promo codes | **Admin → Settings → Checkout** |
| Admin login | `src/app/api/admin/login/route.ts`, guarded by `src/proxy.ts` (HttpOnly cookie, 8 h) |
| Emails | `src/lib/email/` (Resend) |

> **Naming note:** types such as `WooProduct` / `WooCategory` and the `meta_data` field keep their old WooCommerce-style names from when the store was migrated. They are plain data shapes — nothing in the app talks to WooCommerce any more.

### Keeping the website in step with admin edits
Every admin change to products or categories calls `publishCatalogChange()` (`src/lib/catalog-sync.ts`). It stamps a new catalog version in the database (all server instances reload within a few seconds) and marks the cached storefront pages stale, so edits appear on the website almost immediately.

---

## 2. Environment variables

Copy the example file and fill in your values (never commit `.env`):

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` (or `MONGODB_URL` / `DATABASE_URL`) | Yes | MongoDB Atlas connection string. Atlas must allow your host's IPs (use `0.0.0.0/0` for Vercel). |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Yes | Admin panel login |
| `JWT_SECRET` | Yes | Signs admin sessions, customer sessions and email codes. Use a long random string. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Yes | Image uploads |
| `RESEND_API_KEY` | Yes | Sending email |
| `EMAIL_FROM` | Recommended | Sender, e.g. `ANGKON <noreply@angkon.net>` |
| `ADMIN_EMAIL` | Recommended | New-order alert recipient(s), comma-separated. No alert is sent if empty. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical site URL |

On Vercel, add the same variables under **Settings → Environment Variables** (enable them for Production) and redeploy.

---

## 3. Run it

```bash
npm install
npm run dev        # http://localhost:3001  (webpack)
npm run dev:turbo  # http://localhost:3000  (turbopack)
npm run build      # production build
npm start          # run the production build
npm run lint
npm run test:e2e   # Playwright
```

Admin panel: **`/admin`**.

---

## 4. Project structure

```
src/
├── app/
│   ├── (storefront pages)      Home, products, category pages, cart, checkout, policies…
│   ├── admin/                  Dashboard, orders, customers, products, categories, reports, settings
│   └── api/
│       ├── admin/              Admin-only APIs (guarded by src/proxy.ts)
│       ├── auth/               Customer accounts and email verification
│       ├── checkout/, orders/  Checkout config and order creation
│       ├── products/, categories/, promo/, shipping/   Public read APIs
├── components/                 Storefront and admin UI
├── lib/                        DB access, shipping rules, email, catalog sync
├── models/                     Mongoose models
├── server/                     Server-only business logic
├── store/                      Zustand stores (cart, wishlist)
└── types/, utils/, data/
```
