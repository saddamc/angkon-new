# Local Development & SSLCOMMERZ Sandbox Setup

This guide walks through configuring and testing the ANGKON Payment Module locally against the official SSLCOMMERZ Sandbox.

---

## 1. Prerequisites & Environment Variables

Create or edit your local `.env` file:

```env
# SSLCOMMERZ Sandbox Credentials
SSLCOMMERZ_STORE_ID=testbox
SSLCOMMERZ_STORE_PASSWORD=qwerty
SSLCOMMERZ_IS_SANDBOX=true

# Public Base URL (Required for Gateway Callbacks & IPN)
# When running locally, set this to your ngrok or Cloudflare tunnel URL:
NEXT_PUBLIC_APP_URL=https://your-tunnel.ngrok-free.app

# Cron Secret for Reconciliation Tests
CRON_SECRET=local-development-cron-secret-123456
```

---

## 2. Setting Up a Tunnel for Callbacks & IPN

Because SSLCOMMERZ hosted gateway needs to redirect the browser and send server-to-server POST webhooks back to your local development machine:

1. Start your local Next.js dev server:
   ```bash
   npm run dev
   ```
2. Start an HTTPS tunnel pointing to your dev port:
   ```bash
   ngrok http 3001
   ```
3. Copy the forwarding URL (e.g., `https://a1b2c3d4.ngrok-free.app`) and set it as `NEXT_PUBLIC_APP_URL` in `.env`.
4. Restart Next.js dev server.

---

## 3. Official SSLCOMMERZ Sandbox Test Cards & Wallets

### 3.1 Credit / Debit Cards

| Card Brand | Card Number | Expiry Date | CVV | OTP |
|---|---|:---:|:---:|:---:|
| **VISA** | `4111 1111 1111 1111` | Any future date | `123` | `123456` |
| **MasterCard** | `5555 5555 5555 4444` | Any future date | `123` | `123456` |
| **AMEX** | `3782 8224 6310 005` | Any future date | `1234`| `123456` |

### 3.2 Mobile Financial Services (MFS)

| Service | Test Wallet Number | OTP | PIN |
|---|---|:---:|:---:|
| **bKash** | `01711111111` | `1234` | `12345` |
| **Nagad** | `01811111111` | `1234` | `1234` |
| **Rocket** | `01911111111` | `1234` | `1234` |

---

## 4. Testing Payment Scenarios Locally

### A. Testing Successful Payment
1. Add an item to your bag and proceed to `/checkout`.
2. Select **"Online Payment (SSLCOMMERZ)"** and click **"Pay Securely Now"**.
3. You will be redirected to the SSLCOMMERZ Sandbox portal.
4. Select VISA or bKash, enter test credentials above, and submit.
5. You should be redirected to `/checkout/payment-status/[attemptId]`, displaying a confirmed payment screen.

### B. Testing Cancellation
1. Initiate checkout and redirect to gateway.
2. Click **"Cancel"** at the bottom of the SSLCOMMERZ portal.
3. You should be redirected back to the cancellation status page with a **"Retry Payment"** button.
