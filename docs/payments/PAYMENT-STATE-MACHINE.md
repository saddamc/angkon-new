# Payment State Machine Specification

## 1. Overview & Architectural Axioms

The ANGKON Payment State Machine is implemented in `src/server/payments/payment-state-machine.ts`.

It strictly enforces the following core security principles:
1. **The No-Downgrade Invariant:** An attempt that has reached `succeeded` can never transition backwards to `failed`, `cancelled`, `pending`, or `created`.
2. **Deterministic Forward Progression:** All valid paths are strictly mapped. Unmapped transitions return `false` and reject updates.
3. **Three Independent Dimensions:** Payment financial status is completely decoupled from browser activity and background reconciliation loops.

---

## 2. Permitted State Transitions Matrix

| From Status \ To Status | created | initiating | pending | succeeded | failed | cancelled | expired | unknown | review_required | refunded | partially_refunded |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **`created`** | — | **YES** | NO | NO | **YES** | **YES** | NO | **YES** | NO | NO | NO |
| **`initiating`** | NO | — | **YES** | NO | **YES** | **YES** | NO | **YES** | NO | NO | NO |
| **`pending`** | NO | NO | — | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | NO | NO |
| **`unknown`** | NO | NO | **YES** | **YES** | **YES** | **YES** | **YES** | — | **YES** | NO | NO |
| **`review_required`** | NO | NO | NO | **YES** | **YES** | **YES** | NO | NO | — | **YES** | NO |
| **`failed`** | NO | NO | NO | NO | — | NO | NO | NO | NO | NO | NO |
| **`cancelled`** | NO | NO | NO | NO | NO | — | NO | NO | NO | NO | NO |
| **`expired`** | NO | NO | NO | NO | NO | NO | — | NO | NO | NO | NO |
| **`succeeded`** | NO | NO | NO | — | **NO** | **NO** | NO | NO | NO | **YES** | **YES** |
| **`refunded`** | NO | NO | NO | NO | NO | NO | NO | NO | NO | — | NO |
| **`partially_refunded`**| NO | NO | NO | NO | NO | NO | NO | NO | NO | **YES** | — |

---

## 3. Status Definitions & Entry Conditions

### `created`
- **Definition:** The payment attempt record has been allocated in MongoDB with a unique `tranId`.
- **How it is entered:** Customer clicks "Pay Securely" at checkout (`InitiatePaymentService.initiate`).
- **Customer action allowed:** Yes, awaiting browser redirection.
- **Reconciliation required:** No.

### `initiating`
- **Definition:** Backend server is contacting SSLCOMMERZ `/gwprocess/v4/api.php` to generate the session.
- **How it is entered:** Automatically right before initiating the HTTP call.
- **Allowed next transitions:** `pending`, `failed`, `unknown`, `cancelled`.
- **Reconciliation required:** Yes, if gateway times out.

### `pending`
- **Definition:** Session created; customer redirected to the SSLCOMMERZ Hosted Portal.
- **How it is entered:** Successful response from `/gwprocess/v4/api.php` containing `GatewayPageURL`.
- **Allowed next transitions:** `succeeded`, `failed`, `cancelled`, `expired`, `unknown`, `review_required`.
- **Reconciliation required:** Yes, if customer does not return within 5 minutes.

### `succeeded`
- **Definition:** Payment verified server-to-server via the official Validation API and funds confirmed.
- **How it is entered:** `val_id` validated with SSLCOMMERZ server-to-server call.
- **Allowed next transitions:** `refunded`, `partially_refunded`. (Cannot be failed or cancelled).
- **Customer action allowed:** None (Order confirmed).
- **Reconciliation required:** No (marked `resolved`).

### `review_required`
- **Definition:** Payment succeeded at gateway/bank, but triggered security checks:
  1. SSLCOMMERZ `risk_level: "1"` (foreign card, flagged IP, risk score).
  2. Amount mismatch between order expected total and charged amount.
  3. Currency mismatch.
- **How it is entered:** Verified transaction failed risk rules.
- **How administrators resolve it:** Admin inspects at `/admin/payments/[attemptId]`. If approved, order moves to `processing`. If fraudulent, refund is issued.

### `failed`
- **Definition:** Bank or card declined the charge.
- **How it is entered:** Gateway reports `FAILED` in callback, IPN, or reconciliation.
- **Customer action allowed:** Customer can click "Retry Payment" to start a new attempt.

### `cancelled`
- **Definition:** Customer clicked "Cancel and Return to Merchant" at the gateway.
- **Customer action allowed:** Customer can reattempt payment.

### `expired`
- **Definition:** Gateway session timed out (>4 hours) without customer completion.
- **Reconciliation action:** System releases reserved stock and frees inventory.

### `refunded` / `partially_refunded`
- **Definition:** Verified refund issued back to customer card/MFS account.
- **How it is entered:** Succeeded payment refunded via SSLCOMMERZ Refund API.
