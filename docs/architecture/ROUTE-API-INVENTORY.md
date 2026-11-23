# ANGKON — Route & API Inventory and Modernization Plan

> Authoritative architectural specification for active routes, canonical redirects, API domains, and post-release structural consolidation.

---

## 1. Storefront Routes

All public customer-facing routes are canonical. Duplicate suffixes (e.g. `-2`) have been removed and mapped to permanent 308 redirects.

| Path | Status | Purpose | Canonical Target |
|---|---|---|---|
| `/` | **Canonical** | Homepage / Storefront hero & catalog | — |
| `/product/:slug` | **Canonical** | Product details & size selector | — |
| `/product-category/:slug` | **Canonical** | Category & filter view | — |
| `/category/:slug` | **Legacy Redirect** | Old category URL structure | Permanent 308 → `/product-category/:slug` |
| `/cart` | **Canonical** | Shopping cart drawer / page | — |
| `/cart-2` | **Legacy Redirect** | Obsolete duplicate | Permanent 308 → `/cart` |
| `/checkout` | **Canonical** | Multi-step checkout & payment | — |
| `/checkout-2` | **Legacy Redirect** | Obsolete duplicate | Permanent 308 → `/checkout` |
| `/order/:id` | **Canonical** | Order confirmation & status | — |
| `/track` | **Canonical** | Public order tracking | — |
| `/sale` | **Canonical** | Discounted promotional products | — |
| `/on-sale` | **Legacy Redirect** | Obsolete duplicate | Permanent 308 → `/sale` |
| `/login` | **Canonical** | Customer & Admin unified login | — |
| `/register` | **Canonical** | Customer registration | — |
| `/my-account` | **Canonical** | Customer account dashboard | — |
| `/my-account-2` | **Legacy Redirect** | Obsolete duplicate | Permanent 308 → `/my-account` |
| `/privacy-policy` | **Canonical** | Privacy policy | — |
| `/terms` | **Canonical** | Terms & Conditions | — |
| `/return-refund-policy`| **Canonical** | Returns & Refunds Policy | — |
| `/contact` | **Canonical** | Contact Us & Support | — |

---

## 2. Admin Routes

Admin pages live under `/admin/` and are protected by Next.js middleware/proxy plus server-side session checks.

| Path | Purpose |
|---|---|
| `/admin/dashboard` | Main KPI overview, revenue, quick metrics |
| `/admin/orders` | Comprehensive order operations, bulk fulfillment, courier actions |
| `/admin/orders/:id` | Single order inspection, timeline, notes, settlement |
| `/admin/couriers` | Courier providers, connection status, sync controls |
| `/admin/payments` | Payment attempt ledger, reconciliation, settlement logs |
| `/admin/payments/:id` | Single payment attempt audit, manual capture, refund trigger |
| `/admin/products` | Catalog management, inventory, product weights |
| `/admin/categories` | Category & subcategory taxonomy studio |
| `/admin/settings` | Store configuration, shipping rates, policies, courier keys |
| `/admin/users` | Admin user access management |
| `/admin/profile` | Logged-in admin profile & password security |

---

## 3. Canonical API Routes

All new and active endpoints follow standard pluralized domain paths.

### 3.1 Authentication (`/api/auth/*`)
- `POST /api/auth/login`: Customer authentication
- `POST /api/auth/register`: Customer account creation
- `POST /api/auth/logout`: Session termination

### 3.2 Admin Operations (`/api/admin/*`)
*Protected by direct server-side `requireAdminSessionCore` / `requireSuperAdminSessionCore`.*
- `GET, POST, DELETE /api/admin/orders`: Order operations & creation
- `GET, PATCH, DELETE /api/admin/orders/:id`: Individual order actions
- `POST /api/admin/orders/:id/shipment`: Courier consignment booking
- `POST /api/admin/orders/:id/payments/manual`: Manual payment recording
- `GET, POST, DELETE /api/admin/products`: Product catalog management
- `GET, PATCH, DELETE /api/admin/categories`: Taxonomy management
- `GET, POST /api/admin/settings/*`: Centralized configuration endpoints
- `GET /api/admin/couriers/overview`: Courier connection & live status
- `POST /api/admin/shipments/:id/refresh`: Refresh tracking from courier

### 3.3 Payments (`/api/payments/*`)
*Authoritative payment infrastructure powered by `src/server/payments/*`.*
- `POST /api/payments/sslcommerz/initiate`: Initiate SSLCOMMERZ gateway transaction
- `POST /api/payments/sslcommerz/success`: Customer payment success return handler
- `POST /api/payments/sslcommerz/fail`: Customer payment failure return handler
- `POST /api/payments/sslcommerz/cancel`: Customer cancellation return handler
- `POST /api/payments/sslcommerz/ipn`: Asynchronous gateway webhook (IPN)
- `POST, GET /api/payments/reconcile`: Scheduled & on-demand payment reconciliation
- `POST /api/payments/:attemptId/refund`: Guarded refund execution

### 3.4 Webhooks & Background Cron (`/api/cron/*`, `/api/webhooks/*`)
*Protected by `Authorization: Bearer <CRON_SECRET>` or cryptographic signatures.*
- `POST /api/cron/courier-sync`: Periodic shipment tracking synchronization
- `POST /api/cron/meta-sync`: Meta Conversions API event dispatch
- `POST /api/payments/reconcile`: Nightly payment reconciliation
- `POST /api/webhooks/steadfast`: Steadfast real-time status update webhook

---

## 4. Deprecated Legacy API Routes

Kept for temporary zero-downtime transition. All underlying execution is delegated to canonical services.

| Legacy Path | Canonical Replacement | Status |
|---|---|---|
| `POST /api/payment/sslcommerz/initiate` | `POST /api/payments/sslcommerz/initiate` | **Deprecated** (delegates to `initiatePaymentAttempt`) |
| `POST /api/payment/sslcommerz/callback` | `POST /api/payments/sslcommerz/[success\|fail\|cancel]` | **Deprecated** (delegates to payment return service) |
| `POST /api/payment/sslcommerz/ipn` | `POST /api/payments/sslcommerz/ipn` | **Deprecated** (delegates to `processPaymentIpn`) |
| `POST /api/payment/sslcommerz/reconcile` | `POST /api/payments/reconcile` | **Deprecated** (delegates to `runAllPaymentJobs`) |

---

## 5. Post-Release Consolidation Blueprint

Following the first stable VPS production release, execute the phase 2 structural refactor without altering business logic:

### 5.1 `src/lib/` Domain Folders
```
src/lib/
├── db/              # mongodb.ts, mongodb-dns.ts, products.ts
├── email/           # resend.ts, templates.ts
├── payments/        # payment-methods.ts, payment-display.ts
├── catalog/         # real-products.json loader, price calculations
├── security/        # crypto helpers, token signing
└── integrations/    # cloudinary, meta-capi
```

### 5.2 `tests/` Domain Hierarchy
```
tests/
├── unit/            # Rate limiting, cart limits, color naming, HTML sanitization
├── contracts/       # Order create contracts, courier schemas, dataset configs
├── payments/        # Gateway lifecycle, refunds, reconciliation
├── courier/         # Steadfast integration, weight calculations, cancellation
├── orders/          # Lifecycle recovery, stock atomicity, COD reconciliation
├── security/        # Environment isolation, auth defense-in-depth, headers
├── integration/     # Full end-to-end payment & courier workflow
└── e2e/             # Playwright browser tests
```
