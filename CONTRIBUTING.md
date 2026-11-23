# Contributing to ANGKON

Thank you for contributing to the ANGKON e-commerce platform. To ensure high stability, accurate financial tracking, and smooth courier synchronization, please adhere to these guidelines.

---

## 1. Development Workflow & Environment Isolation

1. **Database Safety:**
   - Development and testing **MUST ALWAYS** connect to `angkon_dev` (never production `angkon`).
   - The environment isolation guard (`src/server/env/app-environment.ts`) strictly rejects connecting to production databases outside production.
2. **Environment Variables:**
   - Server-only credentials (e.g. `SSLCOMMERZ_STORE_PASSWORD`, `STEADFAST_API_KEY`, `JWT_SECRET`) must **never** be prefixed with `NEXT_PUBLIC_`.
   - Copy `.env.example` to `.env.local` to get started.
3. **Local Dev Server:**
   ```bash
   npm run dev       # Starts Next.js dev server on port 3001
   npm run typecheck # TypeScript compilation check
   npm run lint      # ESLint static analysis
   ```

---

## 2. Test Suites & Verification

Always run the relevant test suite before creating a pull request:

```bash
npm run test:unit         # Fast unit tests (rate-limiting, sanitization, weights, limits)
npm run test:contracts    # API contracts, schemas, admin order creation, courier reconciliation
npm run test:payments     # SSLCOMMERZ gateway verification, refund safety, idempotency
npm run test:integration  # Multi-courier (Steadfast, Pathao), weight calculation, lifecycle workflows
npm run test:all          # Runs all 4 test tiers systematically
```

---

## 3. Architecture & State Invariants

- **Canonical URLs & Storefront:**
  - Always use canonical URLs for storefront and policy routes: `/cart`, `/checkout`, `/contact`, `/delivery-time`, `/return-refund-policy`, `/privacy-policy`, `/terms`, `/sale`.
  - Never introduce duplicate routes. Redirect legacy URLs via `next.config.ts`.
- **Three-Dimensional Payment State:**
  - Payment state comprises: `status` (gateway state), `customerActivity` (browser action), and `reconciliationStatus` (audit reconciliation).
  - Terminal statuses (`succeeded`, `refunded`) can **never** be downgraded.
- **Courier & Shipment Lifecycle:**
  - Consignment states are authoritative from courier webhooks or reconciliation queries.
  - Test/QA orders are strictly blocked from booking live courier consignments.

---

## 4. Release Checklist

Before releasing to production, follow the comprehensive release checklist:
👉 **[`docs/testing/RELEASE-CHECKLIST.md`](docs/testing/RELEASE-CHECKLIST.md)**
