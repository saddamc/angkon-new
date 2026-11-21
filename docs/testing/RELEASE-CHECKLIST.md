# Production Release Checklist — ANGKON

Use this checklist before authorizing any production deployment:

## 1. Code & Quality Gates
- [ ] Working tree clean, all files committed.
- [ ] Release candidate tag created (`v1.0.0-rc1`).
- [ ] `npm run typecheck` passes with 0 errors.
- [ ] `npm run lint` passes with 0 errors.
- [ ] All 89 test suites pass (`npx tsx --test tests/payments/*.test.ts tests/orders-payment-courier-workflow.test.ts tests/steadfast-modes.test.ts`).
- [ ] `npm run build` generates production bundle cleanly.

## 2. Configuration & Secrets
- [ ] `MONGODB_URI` points to production Atlas cluster.
- [ ] `JWT_SECRET` is strong, unique, and set.
- [ ] `CRON_SECRET` is configured in local and production environments.
- [ ] `SSLCOMMERZ_IS_SANDBOX` is set to `false`.
- [ ] `STEADFAST_LIVE_BOOKING_ENABLED` is set to `true`.
- [ ] Steadfast credentials verified with read-only balance query.
- [ ] Cloudinary credentials verified.

## 3. Financial & Logistics Protections
- [ ] Server-side gateway validation active on all payment callbacks.
- [ ] IPN deduplication active with SHA-256 event fingerprinting.
- [ ] Test orders isolated from sales and revenue reports.
- [ ] Live courier booking requires explicit admin confirmation.
- [ ] Ambiguous courier booking timeout triggers lookup by invoice.

## 4. Operational Readiness
- [ ] Vercel Cron jobs verified and configured.
- [ ] Rollback commit SHA recorded.
- [ ] Admin team verified with access to order drawer and manual delivery overrides.
- [ ] Customer support escalation runbook available.
