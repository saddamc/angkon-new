# Troubleshooting & Diagnostics Runbook — ANGKON

## 1. Fast Diagnostic Commands

| Check | Command | Expected Result |
|---|---|---|
| Complete Integration Health | `npm run probe:integrations` | 13/14 passed |
| TypeScript Types | `npm run typecheck` | 0 errors |
| Lint Quality | `npm run lint` | 0 errors |
| Core Test Suite | `npm run test:payments` | 45/45 passed |
| Courier Workflows | `npx tsx --test tests/steadfast-modes.test.ts` | 14/14 passed |
| Steadfast Auth Check | `node -e "/* read-only balance check */"` | HTTP 200, current_balance number |

---

## 2. Common Issues & Remediations

### Issue A: SSLCOMMERZ Session Fails (`STORE_ID_NOT_FOUND` or 401)
* **Cause:** Whitespace in `SSLCOMMERZ_STORE_ID` or a mismatched mode flag (`SSLCOMMERZ_MODE` / `SSLCOMMERZ_IS_LIVE`).
* **Fix:**
  - Verify credentials directly in merchant portal.
  - Set `SSLCOMMERZ_MODE=live` + `SSLCOMMERZ_IS_LIVE=true` for live stores, `SSLCOMMERZ_MODE=sandbox` for sandbox.

### Issue B: Steadfast Returns HTTP 401 (Unauthorized)
* **Cause:** Incorrect API headers, trailing whitespace in keys, or using portal login passwords instead of API keys.
* **Fix:**
  - Verify `Api-Key` and `Secret-Key` header names (capitalized).
  - Check `STEADFAST_BASE_URL` is `https://portal.packzy.com/api/v1`.
  - Ensure IP restrictions in Steadfast merchant portal allow Vercel serverless IPs.

### Issue C: Cron Endpoints Return HTTP 503
* **Cause:** Missing or mismatched `CRON_SECRET`.
* **Fix:**
  - Supply header `Authorization: Bearer <CRON_SECRET>` in scheduled job requests.
  - Verify `CRON_SECRET` in `.env` / Vercel settings.

### Issue D: Customer Closes Browser During Payment
* **Behavior:** Order remains in `pending` payment status.
* **Fix:**
  - No manual action needed. If customer completed payment, SSLCOMMERZ IPN delivers within 60 seconds and finalizes the order automatically.
  - If IPN was missed, the 10-minute reconciliation cron job queries `/validator/api/merchantTransIDvalidationAPI.php` and resolves it.
