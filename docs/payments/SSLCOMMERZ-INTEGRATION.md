# SSLCOMMERZ Gateway Integration Guide

This guide details the integration between ANGKON and SSLCOMMERZ Hosted Payment Gateway.

---

## 1. Environment Configuration

Credentials must be configured in environment variables and are **strictly server-only**. The Store Password is never exposed to client-side bundles.

| Variable | Type | Description |
|---|---|---|
| `SSLCOMMERZ_STORE_ID` | String | Store ID provided by SSLCOMMERZ |
| `SSLCOMMERZ_STORE_PASSWORD` | String | Store Password provided by SSLCOMMERZ |
| `SSLCOMMERZ_IS_SANDBOX` | Boolean | `true` for sandbox (`sandbox.sslcommerz.com`), `false` for live (`securepay.sslcommerz.com`) |
| `NEXT_PUBLIC_APP_URL` | URL | Base URL used to formulate callback and IPN URLs |

---

## 2. Gateway API Endpoints

### Sandbox Endpoints
- **Session Initiation:** `https://sandbox.sslcommerz.com/gwprocess/v4/api.php`
- **Validation Server API:** `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php`
- **Merchant Transaction ID Query:** `https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php`

### Live Production Endpoints
- **Session Initiation:** `https://securepay.sslcommerz.com/gwprocess/v4/api.php`
- **Validation Server API:** `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php`
- **Merchant Transaction ID Query:** `https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php`

---

## 3. APIs Used in ANGKON

### A. Session Initiation & Hosted Redirect
`src/server/payments/providers/sslcommerz/create-session.ts`
- Initiates an HTTPS POST request with URL-encoded form data containing order total, unique `tran_id`, customer profile, shipping address, and product profile.
- Receives `GatewayPageURL` and `sessionkey`.
- Session key is masked using SHA-256 before persisting in MongoDB.
- **Hosted Payment Integration (Full-Page Redirect):** The client performs top-level navigation using `window.location.assign(gatewayUrl)`.
- **Prohibition of Embedded Popup / Iframes:** No custom iframe or SSLCOMMERZ Easy Checkout popup script is injected. This eliminates mobile browser popup blockers, ensures seamless redirects to external MFS applications (bKash app, Nagad app), and preserves ANGKON's luxury checkout interface isolation.

### B. Transaction Validation
`src/server/payments/providers/sslcommerz/validate-transaction.ts`
- Invoked when the browser returns or IPN arrives with `val_id`.
- Performs GET request to `/validator/api/validationserverAPI.php?val_id=...&store_id=...&store_passwd=...&format=json`.
- Validates status `VALID`, currency, and amount.

### C. Merchant Transaction ID Query
`src/server/payments/providers/sslcommerz/query-transaction.ts`
- Invoked during background reconciliation when no return was detected.
- Queries `/validator/api/merchantTransIDvalidationAPI.php?tran_id=...&store_id=...&store_passwd=...&format=json`.
- Locates transaction by `tran_id` to determine whether customer paid even if they closed the browser.

---

## 4. Webhook (IPN) Best Practices

1. **Do not block IPN:** The IPN endpoint (`/api/payments/sslcommerz/ipn`) is configured with a high-ceiling rate limit (120 req / minute) so SSLCOMMERZ retries are not blocked.
2. **Durable Inbox:** Every inbound IPN is written to `PaymentWebhookInbox` with a deterministic `eventFingerprint` (SHA-256 of provider + tran_id + val_id + status + amount).
3. **Always respond with 200 OK:** If already settled or duplicate, respond 200 immediately to acknowledge receipt and prevent unnecessary gateway retry loops.
