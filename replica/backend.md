# Backend Specification & Checklist: ANGKON

Backend infrastructure, API bindings, payment flows, and security checklist for **ANGKON — House of Modern Heritage** (replicated from Gorur Ghash e-commerce model).

---

## 1. Authentication & Sessions

- **Customer Flow**: Frictionless guest checkout (dominant in Bangladeshi e-commerce) with automatic customer profile creation by phone number.
- **Admin Authentication**: JWT session tokens via `POST /api/admin/login` stored in secure HTTP-only cookies.
- **Access Control**: Administrative routes protected via middleware requiring valid bearer tokens.

---

## 2. Database & Data Layer

- **Schema**: Complete PostgreSQL schema definition in [replica/schema.sql](file:///d:/Client%20Project/angkon-N/replica/schema.sql) with indexes on slugs, categories, order status, and customer phone numbers.
- **Authoritative Data Layer**: Headless integration with WooCommerce REST API (`v3` endpoints for products, categories, variations, and orders).
- **Concurrency & Stock**: Server-side stock verification before order commitment preventing negative inventory during drops.

---

## 3. Payments & Orders

- **Primary Method**: **Cash on Delivery (COD)** — standard practice matching Gorur Ghash.
- **Order Placement**: `POST /api/orders`
  - Captures full customer name, phone number, district, and shipping address.
  - Automatically classifies shipping zone:
    - **Inside Dhaka**: `৳60` (2–3 business days)
    - **Outside Dhaka**: `৳100`–`৳120` (3–5 business days)
  - Records line items with selected apparel `Size` metadata.
  - Generates official WooCommerce order number and returns tracking confirmation.
- **Digital Payment Readiness**: Architecture supports bKash and Nagad direct merchant gateways via server-side IPN webhooks.

---

## 4. Integrations

- **WooCommerce REST API (`/wp-json/wc/v3`)**:
  - `GET /products`: Paginated catalog queries with tag and category filtering.
  - `GET /products/categories`: Dynamic taxonomy tree and count retrieval.
  - `POST /orders`: Authenticated order creation with server-only consumer secret.
- **Courier Logistics Integration**: Standard payload compatibility with Bangladeshi courier APIs (Steadfast, Pathao, RedX).

---

## 5. Security Checklist

- [x] **Secrets in environment variables**: No private keys in client code; `WC_ORDERS_CONSUMER_SECRET` kept strictly server-side.
- [x] **Environment template**: Comprehensive [.env.example](file:///d:/Client%20Project/angkon-N/.env.example) maintained with empty values.
- [x] **Server-side input validation**: Required fields (`fullName`, `phone`, `district`, `address`, `items`) validated before dispatch.
- [x] **Authoritative shipping fees**: Shipping fees recalculated server-side, never trusting client-tampered totals.
- [x] **CORS & Proxying**: Direct external WooCommerce API calls proxied through Next.js server route handlers to hide backend URLs.
- [x] **No sensitive data in URLs**: Customer contact details transmitted solely via HTTPS POST payloads.
