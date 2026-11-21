# Payments & Courier — Production Runbook

> Status: all 14 implementation phases are code-complete. What remains is
> **credential configuration**, the **index migration**, and the **sandbox
> acceptance run** described below.

---

## 1. The 14 implementation phases

| # | Phase | Status | Evidence |
|---|---|---|---|
| 1 | Architecture / dependency audit | ✅ | `docs/` + audit report |
| 2 | Model & relationship audit | ✅ | `Order`, `Product`, `User`, `Settings` |
| 3 | Checkout / payment workflow audit | ✅ | `/api/orders` flow |
| 4 | Order idempotency + atomic order numbers | ✅ | `src/server/idempotency.ts`, `order-number.ts`, `Counter` |
| 5 | SSLCOMMERZ server-side verification | ✅ | `src/server/payments/verify.ts`, `settle.ts` |
| 6 | Admin authorization + fail-closed config | ✅ | `requireAdminSessionCore`, `src/lib/env.ts` |
| 7 | Payment model + reconciliation | ✅ | `Payment`, `reconcile.ts`, `/api/payment/sslcommerz/reconcile` |
| 8 | Admin payment timeline | ✅ | `GET /api/admin/orders/:id/payments` + modal |
| 9 | Shipment model + Steadfast adapter | ✅ | `Shipment`, `src/server/courier/steadfast.ts` |
| 10 | Courier API + webhook | ✅ | create / refresh / `/api/webhooks/steadfast` |
| 11 | Admin shipment UI | ✅ | order-row truck action + shipment modal |
| 12 | Stock lifecycle | ✅ | `src/server/stock.ts` (reserve / release / commit) |
| 13 | CI typecheck + Pathao adapter | ✅ | `next.config.ts`, `package.json`, `pathao.ts` |
| 14 | Security hardening | ✅ | guarded secrets, rate limits, audit log |

Regression gates: **519/519 tests**, `tsc` clean, production build passes with
typechecking enabled.

---

## 2. Environment variables

Server-only — never prefix with `NEXT_PUBLIC_`.

```env
# Existing
DATABASE_URL=mongodb+srv://…
JWT_SECRET=<unique 64+ chars>          # required; no fallback in production
CLOUDINARY_CLOUD_NAME=…
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
RESEND_API_KEY=…
EMAIL_FROM=…
ADMIN_EMAIL=…

# New in this work
NEXT_PUBLIC_SITE_URL=https://angkon.net  # used for gateway return URLs
CRON_SECRET=<unique random string>       # required for Vercel Cron
META_TOKEN_ENCRYPTION_KEY=<random>       # recommended dedicated key

# SSLCOMMERZ (sandbox first)
# Scoped pairs win; the legacy pair is only a fallback.
SSLCOMMERZ_SANDBOX_STORE_ID=
SSLCOMMERZ_SANDBOX_STORE_PASSWORD=
SSLCOMMERZ_LIVE_STORE_ID=
SSLCOMMERZ_LIVE_STORE_PASSWORD=
SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
SSLCOMMERZ_IS_LIVE=false
PAYMENT_SESSION_TTL_MINUTES=60

# Rate limiting / request security (MongoDB-backed; no Redis)
RATE_LIMIT_HMAC_SECRET=<random string; falls back to JWT_SECRET>
TRUST_PROXY_HEADERS=true
TRUST_CLOUDFLARE_IP_HEADER=false
CSRF_TRUSTED_ORIGINS=

# Steadfast
STEADFAST_API_KEY=
STEADFAST_SECRET_KEY=
STEADFAST_BASE_URL=https://portal.packzy.com/api/v1
STEADFAST_WEBHOOK_SECRET=

# Pathao (later; adapter is ready, city/zone mapping required)
PATHAO_BASE_URL=https://api-hermes.pathao.com
PATHAO_CLIENT_ID=
PATHAO_CLIENT_SECRET=
PATHAO_USERNAME=
PATHAO_PASSWORD=
PATHAO_STORE_ID=
PATHAO_CITY_ID=
PATHAO_ZONE_ID=
```

Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>` when
`CRON_SECRET` is configured. The reconciliation routes accept that bearer token
or an administrator session; if neither is present the request is rejected
(fail closed).

---

## 3. Database indexes (run before traffic)

Production uses `autoIndex: false`, so the migration is mandatory.

```bash
# 1. Back up the database first.
# 2. Inspect the plan (no writes):
node scripts/migrations/2026-11-12-payments-shipments-indexes.mjs --dry-run

# 3. Apply:
node scripts/migrations/2026-11-12-payments-shipments-indexes.mjs
```

Creates/ensures **27 indexes** across `orders`, `payments`, `shipments`,
`admin_audit_logs` and `ratelimitbuckets`.

---

## 4. SSLCOMMERZ sandbox acceptance

1. Set the **sandbox** pair (`SSLCOMMERZ_SANDBOX_STORE_ID` /
   `SSLCOMMERZ_SANDBOX_STORE_PASSWORD`) and `SSLCOMMERZ_IS_LIVE=false`.
   Never put a live store in sandbox mode or vice versa.
2. Restart the app; open checkout.
3. Confirm **Online payment** is enabled (it is disabled when creds are absent).

| Case | Expected |
|---|---|
| Success | Redirected to gateway → order `paid`, `processing`, stock committed, one CAPI Purchase |
| Fail | `paymentStatus=failed`, stock restored, no Purchase |
| Cancel | `paymentStatus=failed`, `orderStatus=cancelled`, stock restored |
| Refresh/return twice | One payment row, one Purchase |
| `?status=success` without `val_id` | Rejected — order stays unpaid |
| Tampered amount / currency / `tran_id` | Rejected |
| Forged `status=FAIL` without the signed return token | Rejected — order untouched |
| IPN `status=FAILED` without a validator-confirmed `val_id` | Acknowledged and ignored |
| IPN replay | `{ success: true, duplicate: true }`, no duplicate side-effects |
| Reconciliation dry-run | `{ ok: true, scanned: … }`, no writes |

Verify in **Admin → Orders → payment timeline** (credit-card label) and in
`payments` / `admin_audit_logs`.

---

## 5. Steadfast sandbox acceptance

1. Set the API/secret keys and base URL.
2. Open **Admin → Orders → truck icon**.

| Case | Expected |
|---|---|
| Create consignment | One `Shipment`, status `created`, order → `shipped`, COD = total (0 if prepaid) |
| Double-click create | Same consignment returned (`existing: true`) |
| Refresh status | Timeline updated; order summary updated |
| Delivered (COD) | Shipment `delivered`, order `completed`, payment `paid`, stock committed |
| Delivered (prepaid) | Payment untouched (COD = 0) |
| Cancelled / returned | Shipment closed, stock restored |
| Invalid phone | `422` before any consignment is created |
| No credentials | `503 not-configured`, **no** shipment row created |

Webhook (optional): set `STEADFAST_WEBHOOK_SECRET`, configure the URL
`/api/webhooks/steadfast`, send a signed POST. The handler re-reads the status
from Steadfast before applying it.

---

## 6. Stock acceptance

Use a managed-stock product.

| Case | Expected |
|---|---|
| Order within stock | Quantity decremented; `stock_status=outofstock` at 0 |
| Order above stock | `409 OUT_OF_STOCK`; no order; stock unchanged |
| Online payment fails/cancels | Quantity restored |
| Admin cancels/refunds | Quantity restored once |
| Courier returns/cancels | Quantity restored once |
| Delivered / paid | Stock committed |
| Repeated webhook | No double release |

A safe live check is already documented: request more than the available
quantity — the API returns `409` before creating an order.

---

## 7. Go-live checklist

- [ ] `JWT_SECRET`, `CRON_SECRET`, `META_TOKEN_ENCRYPTION_KEY` set in Vercel
- [ ] `RATE_LIMIT_HMAC_SECRET` set (or deliberately reuse `JWT_SECRET`)
- [ ] SSLCOMMERZ **live** pair (`SSLCOMMERZ_LIVE_STORE_*`) + `SSLCOMMERZ_IS_LIVE=true`
- [ ] No sandbox store ID in live mode (and no live store in sandbox mode)
- [ ] Steadfast live credentials + webhook secret
- [ ] `NEXT_PUBLIC_SITE_URL` is the canonical HTTPS domain
- [ ] `CSRF_TRUSTED_ORIGINS` includes the apex/www pair and any preview domain
- [ ] `TRUST_CLOUDFLARE_IP_HEADER=true` **only** if Cloudflare is in front
- [ ] Index migration applied
- [ ] Sandbox tables above all pass
- [ ] Backup taken (see §12)
- [ ] Deploy; check `/api/checkout/config` → `onlinePaymentAvailable: true`
- [ ] Place one low-value live order, confirm paid + stock + no duplicate

## 8. Rollback

1. Set `SSLCOMMERZ_IS_LIVE=false` (or remove the keys) — checkout falls back to
   COD and online payment is disabled.
2. Remove `STEADFAST_*` keys — shipment creation returns `not-configured`;
   existing consignments remain readable.
3. Redeploy the previous build if needed. The new collections/indexes are
   additive and safe to leave in place.

## 9. Credential rotation

1. Rotate the provider key in SSLCOMMERZ / Steadfast.
2. Update the Vercel env var; redeploy.
3. Rotate `JWT_SECRET` only with a planned logout (all sessions invalidate).
4. Meta token encryption: set `META_TOKEN_ENCRYPTION_KEY`, run
   `/api/admin/meta/security/migrate-tokens`, then remove legacy rotation keys
   from `src/lib/security/token-encryption.ts`.

## 10. Monitoring

- Payment failures: `payments` with `status=failed` / `reconcileNote`.
- Reconciliation: daily cron at 03:00 UTC; inspect the JSON result.
- Courier errors: `shipments.error` + `Shipment.events`.
- Admin overrides: `admin_audit_logs` (actor, before/after, IP).
- Rate limits: `ratelimitbuckets` collection (TTL-cleaned; window enforced from
  `windowStart`, never from TTL).
- Security events: search logs for `[SECURITY]` JSON lines
  (`rate_limit.blocked`, `csrf.origin_mismatch`, `payment.verification_rejected`,
  `payment.reconcile_mismatch`, `admin.unauthorized`).

## 10b. Rate limiting & API security

MongoDB is the only rate-limit backend; Redis is not required.

| Surface | Limit |
|---|---|
| Customer login | 5/15 min per email, 25/15 min per IP (HMAC-hashed) |
| Admin login | 5/15 min per IP |
| Register | 6/hour per IP |
| OTP send | 6/hour per email, 20/hour per IP |
| OTP verify | 12/15 min per email, 40/15 min per IP |
| Password reset | 10/15 min per IP |
| Checkout | 15/hour per IP, 6/hour per email |
| Payment initiation | 10/15 min per IP, 5/15 min per order |
| Coupon validation | 20/min per IP |
| SSLCOMMERZ callback | 120/min per IP |
| SSLCOMMERZ IPN | 60/min per transaction + 3000/min global |
| Courier webhooks | 600/min per IP (HMAC/token authenticated) |
| Reconciliation | 20/min per IP |

Credential endpoints fail **closed** when the rate-limit store is unreachable;
checkout and payment paths fail **open** so a database blip cannot stop a sale.

Cross-origin protection runs in `src/proxy.ts` for mutating `/api/admin/*`,
`/api/auth/*`, `/api/orders`, `/api/promo/validate`,
`/api/payment/sslcommerz/initiate` and `/api/pixel/events`. IPN and webhook
routes are excluded because they are server-to-server and authenticate by
signature/secret.

## 11. Known limitations

- Stock is product-level; per-size/colour stock is not modelled.
- Pathao requires a city/zone mapping before creating a consignment.
- Vercel Hobby allows two daily crons; shipment sync relies on the webhook and
  the admin **Refresh status** button.
- Webhooks are optional; refresh/reconciliation cover the same state.
- Rate-limit windows use the server clock. Keep NTP enabled; a multi-region
  deployment should treat the limit as approximate at window boundaries.
- Settlement is a sequence of atomic, idempotent writes rather than one
  multi-document transaction. A crash between steps is repaired by the daily
  reconciliation job (which re-commits stock for paid orders). A transaction
  can be introduced later without a schema change.

## 12. Backup & recovery

- Atlas: enable **Continuous Cloud Backup** (or scheduled snapshots) before
  go-live; keep at least 7 days of point-in-time recovery.
- Before any migration or destructive change, take an on-demand snapshot and
  record its timestamp in the deploy notes.
- Restore drill (quarterly): restore the snapshot into a staging cluster, run
  `node scripts/migrations/2026-11-12-payments-shipments-indexes.mjs --dry-run`,
  then point a preview deployment at the restored cluster.
- Recovery priorities: `orders` → `payments` → `shipments`. Provider evidence
  lives in `payments.rawValidation` and `payments.events`; never edit those
  fields by hand — re-run reconciliation instead.
- `ratelimitbuckets` is disposable: deleting the collection only resets
  counters and cannot corrupt application data.

## 13. Cloudflare / WAF (if used)

- Keep the Vercel deployment as the origin; do not expose it directly.
- Add a WAF rate-limit rule for `POST /api/auth/login`, `/api/admin/login`,
  `/api/payment/sslcommerz/initiate` (e.g. 30 req/min per IP) as a second layer.
- **Do not** rate-limit `/api/payment/sslcommerz/ipn` or `/api/webhooks/*` at the
  edge — SSLCOMMERZ and couriers retry from shared egress IPs and a block would
  drop legitimate notifications. The handlers already authenticate and
  deduplicate.
- Enable "Bot Fight Mode" for storefront pages, not for `/api/`.
- Set `TRUST_CLOUDFLARE_IP_HEADER=true` so per-customer limits key on
  `CF-Connecting-IP` instead of the Cloudflare edge IP.
