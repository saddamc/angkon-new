# Production Deployment Runbook — ANGKON

> **VPS deployment is the canonical target.** Follow
> [`VPS-DEPLOYMENT.md`](./VPS-DEPLOYMENT.md) for the full server setup.

## 1. Pre-Deployment Quality Gates

Before initiating a production deployment, all quality gates must pass cleanly:
1. `npm run typecheck` (0 errors)
2. `npm run lint` (0 errors)
3. `npm run build` (0 errors)
4. `npm run test:all` (0 failures)
5. `npm run verify:environment-isolation` (0 failures)
6. `npm run probe:integrations` (Pathao optional inactive)

---

## 2. Production Environment Configuration (VPS)

Put the production values in `/var/www/angkon/shared/.env`, based on
[`.env.production.example`](../../.env.production.example). Never commit the
completed file.

Minimum critical values:

```env
APP_ENVIRONMENT=production
NODE_ENV=production
DATABASE_URL=<production Atlas URI>
JWT_SECRET=<unique long random secret>
CRON_SECRET=<unique random secret>
NEXT_PUBLIC_SITE_URL=https://angkon.net

SSLCOMMERZ_MODE=live
SSLCOMMERZ_IS_LIVE=true
SSLCOMMERZ_LIVE_STORE_ID=<live store id>
SSLCOMMERZ_LIVE_STORE_PASSWORD=<live store password>

COURIER_MODE=live
STEADFAST_LIVE_BOOKING_ENABLED=true
STEADFAST_BASE_URL=https://portal.packzy.com/api/v1
STEADFAST_API_KEY=<live API key>
STEADFAST_SECRET_KEY=<live secret>
STEADFAST_WEBHOOK_SECRET=<live webhook secret>

CLOUDINARY_CLOUD_NAME=<production cloud>
CLOUDINARY_API_KEY=<production key>
CLOUDINARY_API_SECRET=<production secret>
RESEND_API_KEY=<production key>
ENABLE_REAL_EMAIL=true
```

---

## 3. Deployment Procedure

1. Build and test the release.
2. Deploy it to a new directory under `/var/www/angkon/releases`.
3. Point `/var/www/angkon/current` to the tested release.
4. Restart the `angkon` systemd service.
5. Run post-deployment checks.

Do not deploy by overwriting the active release directory. Keep the previous
release available for rollback.

## 4. Post-Deployment Verification

* Verify the real Steadfast balance in **Admin → Orders** only after live credentials and IP allowlisting are confirmed.
* Test public storefront loading (`/`, `/products`, `/checkout`).
* Confirm Nginx HTTPS and certificate renewal.
* Confirm the VPS scheduler runs payment reconciliation, Meta sync, and courier sync.
* Verify payment success/failure/cancel and duplicate IPN behavior with the sandbox before enabling live traffic.
