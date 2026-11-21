# SSLCOMMERZ Integration Guide — ANGKON

## 1. Overview
ANGKON integrates with the **SSLCOMMERZ Hosted Payment Gateway** supporting:
* Visa, Mastercard, American Express, UnionPay.
* Mobile Financial Services (bKash, Nagad, Rocket, Upay).
* Internet Banking (Citytouch, BRAC Bank, Islami Bank).

---

## 2. Environment Configuration

```bash
# Gateway Credentials
SSLCOMMERZ_STORE_ID="angkon_store_id"
SSLCOMMERZ_STORE_PASSWORD="angkon_store_password"
SSLCOMMERZ_IS_SANDBOX="false" # Set true for development testing

# Official API Base URLs
# Sandbox: https://sandbox.sslcommerz.com
# Live:    https://securepay.sslcommerz.com
```

---

## 3. Endpoints & Server Operations

| Endpoint | Gateway Route | Purpose |
|---|---|---|
| Session Initiation | `POST /gwprocess/v4/api.php` | Initializes hosted gateway session, generates `sessionkey` |
| Transaction Validation | `GET /validator/api/validationserverAPI.php` | Direct server-to-server validation using `val_id` |
| Merchant Query | `GET /validator/api/merchantTransIDvalidationAPI.php` | Safe recovery query by merchant `tran_id` |
| Refund Initiation | `GET /validator/api/merchantTransIDvalidationAPI.php` | Submits refund requests via merchant portal |

---

## 4. Security & Idempotency Rules

1. **Server Validation Mandate:** Browser redirects to `/api/payment/sslcommerz/callback` only trigger backend verification; they never finalize payments without calling `/validator/api/validationserverAPI.php`.
2. **Duplicate IPN Handling:** Every IPN payload is fingerprinted using SHA-256 in `PaymentWebhook`. Second deliveries with the same fingerprint return HTTP 200 immediately without repeating stock deduction or order updates.
3. **No-Downgrade Invariant:** Once an attempt reaches status `succeeded`, incoming failed or cancelled callbacks are discarded.
