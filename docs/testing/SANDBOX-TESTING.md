# Sandbox Testing Guide — ANGKON

## 1. SSLCOMMERZ Sandbox Testing Environment

When `SSLCOMMERZ_MODE=sandbox` (or `SSLCOMMERZ_IS_LIVE=false`), ANGKON connects to the official SSLCOMMERZ Sandbox (`https://sandbox.sslcommerz.com`).

### Official Sandbox Test Cards

| Card Type | Card Number | Expiry | CVV | OTP | Expected Outcome |
|---|---|---|---|---|---|
| **Visa (Success)** | `4111111111111111` | Any future | `123` | `1234` | Succeeded (`paid`) |
| **Mastercard (Success)** | `5105105105105100` | Any future | `123` | `1234` | Succeeded (`paid`) |
| **Visa (Declined)** | `4000000000000002` | Any future | `123` | — | Failed (`failed`) |
| **bKash (Sandbox)** | `01700000000` | — | — | `1234` | Succeeded (`paid`) |

---

## 2. Steadfast Mock & Failure Simulation

In Mock Mode, test scenarios can be triggered via failure injection in unit tests or via admin controls:

1. **Successful Booking:** Dispatches consignment with ID `MOCK-CID-...`.
2. **Timeout Simulation:** Simulates connection timeout to verify invoice lookup recovery.
3. **Duplicate Prevention:** Dispatches second request for same order; verifies HTTP 409 conflict.
4. **Lifecycle Simulation:** Manually advances mock consignment to `picked_up`, `in_transit`, `delivered`, and `returned`.
