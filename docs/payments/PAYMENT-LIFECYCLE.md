# Payment Lifecycle & Scenarios

This document explains the payment lifecycle and how the ANGKON Payment Module addresses all failure and recovery scenarios.

---

## The Three Dimensions of Payment State

Unlike naive systems that conflate gateway status with customer browser actions, ANGKON models three orthogonal state dimensions:

1. **Payment Attempt Status (`status`):**
   - `created` → `initiating` → `pending` → `succeeded` / `failed` / `cancelled` / `expired` / `unknown` / `review_required` / `refunded`.
2. **Customer Activity (`customerActivity`):**
   - `not_redirected`: Session created, customer not yet redirected.
   - `redirected`: Gateway URL generated, customer forwarded to SSLCOMMERZ.
   - `returned_success`: Customer redirected back to `/api/payments/sslcommerz/success`.
   - `returned_failed`: Customer redirected to failure URL.
   - `returned_cancelled`: Customer clicked Cancel on the gateway.
   - `no_return_detected`: Customer abandoned, closed browser, or lost internet.
3. **Reconciliation Status (`reconciliationStatus`):**
   - `not_required`: Initial state.
   - `scheduled`: Session awaiting background query via backoff schedule.
   - `processing`: Background job actively querying SSLCOMMERZ.
   - `resolved`: Transaction confirmed or cleanly terminated.
   - `manual_review`: Ambiguous transaction escalated to admin review.

---

## 16 Lifecycle Scenarios Handled

| # | Scenario | System Handling |
|---|---|---|
| **1** | **Normal Success** | Redirect arrives with `val_id` → Validated with SSLCOMMERZ server-to-server API → Order settled `paid` → Stock committed once. Subsequent IPN arrives → Detected as already settled → 200 OK. |
| **2** | **IPN Before Redirect** | IPN arrives first with `val_id` → Server validates and settles order. When customer browser returns later → Detects `alreadySettled === true` and displays success immediately without duplicating stock commit. |
| **3** | **Internet Loss During Payment** | Customer device loses connection before redirecting back. `customerActivity` remains `no_return_detected`. Session status stays `pending` (NOT failed). IPN settles transaction when connection restores or background reconciler queries gateway. |
| **4** | **Customer Closes Browser** | Same as internet loss: system does not assume failure. Reconciler checks gateway via `querySslcommerzTransactionByTranId`. If money was charged, order is settled automatically. |
| **5** | **Customer Leaves Gateway Without Action** | Customer opens SSLCOMMERZ portal and walks away. Reconciler checks at 2m, 5m, 10m, 30m, 1h, 2h. If untouched after 4 hours, session transitions to `expired` and inventory is released. |
| **6** | **Explicit Cancellation** | Customer clicks "Cancel and Return". Redirects to `/api/payments/sslcommerz/cancel`. Marked `cancelled`. Order restored, stock released. Late success cannot overwrite if payment was not processed. |
| **7** | **Payment Failed at Bank** | Bank declines transaction (insufficient funds, OTP timeout). Gateway redirects to failure route. Marked `failed`. Customer shown retry button. |
| **8** | **High-Risk Transaction (`risk_level: "1"`)** | Transaction is valid at bank but flagged by SSLCOMMERZ risk engine. Marked `review_required`. Order moved to `on-hold`. Stock committed. Flagged in Admin Portal for manual approval. |
| **9** | **Amount Mismatch Tampering** | Attacker tries modifying form payload. `VerifyPaymentService` detects discrepancy. Transaction flagged `review_required` (held) to prevent fraudulent order fulfillment. |
| **10** | **Currency Mismatch** | Non-BDT transaction received when BDT expected. Flagged `review_required`. |
| **11** | **Duplicate IPN Notifications** | Webhook inbox computes SHA-256 fingerprint. Subsequent duplicate payloads return `{ alreadyProcessed: true }` without re-executing business logic. |
| **12** | **Validation Server Network Glitch** | Validation call times out. State transitions to `unknown`, `reconciliationStatus: "scheduled"`. Reconciler retries with exponential backoff. |
| **13** | **Customer Retries Payment** | Previous failed/cancelled attempt preserved. New attempt created with unique `tranId` (`ANG-1001-A2`). Prior attempt count verified (< 5). |
| **14** | **Reconciliation Retry Ceiling Exceeded** | If gateway is unreachable for 8 attempts over 24 hours, attempt transitions to `reconciliationStatus: "manual_review"` and alerts admin. |
| **15** | **Out of Stock at Initiation** | Product stock checked against live MongoDB `Product` collection. If depleted, initiation blocked with 409 Conflict. |
| **16** | **Concurrent Callback + IPN Race** | Handled by MongoDB atomic query: `{ _id: orderId, paymentStatus: { $ne: "paid" } }`. The loser of the race detects `alreadySettled === true`. |
