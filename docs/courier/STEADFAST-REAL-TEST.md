# Steadfast Courier Integration & Real Booking Preflight Verification

**Document Status**: Official Integration Protocol & Preflight Inspection  
**Courier Partner**: Steadfast Courier Bangladesh (`https://portal.packzy.com/api/v1`)  
**Adapter Implementation**: `src/server/courier/steadfast.ts`  
**Operating Mode Configuration**: `COURIER_MODE=mock`, `STEADFAST_LIVE_BOOKING_ENABLED=false`  
**Target Environment**: Development (`angkon_dev`)

---

## 1. Operating Mode & Safety Architecture

The Steadfast integration operates under a strict two-gate safety model:

```mermaid
flowchart TD
    A[Order Ready for Dispatch] --> B{App Environment == production?}
    B -- No --> C[Forced MOCK Adapter]
    C --> D[Generate Mock Tracking ID & Consignment]
    C --> E[Zero External HTTP Requests]
    B -- Yes --> F{COURIER_MODE == live?}
    F -- No --> C
    F -- Yes --> G{STEADFAST_LIVE_BOOKING_ENABLED == true?}
    G -- No --> H[Error: Live Booking Disabled]
    G -- Yes --> I{isLocalTestOrder() == true?}
    I -- Yes --> J[Error: Test Order Blocked from Live Dispatch]
    I -- No --> K[Single Authorized POST /create_order]
```

### Safety Rules Enforced in Source Code:
1. **Non-Production Gate**: `getCourierModeConfig()` in `src/server/courier/courier-mode.ts` forces `mode: "mock"` and `liveBookingEnabled: false` whenever `appEnv !== "production"`.
2. **Dual-Flag Requirement**: In production, both `COURIER_MODE=live` AND `STEADFAST_LIVE_BOOKING_ENABLED=true` must be set.
3. **Local Test Order Shielding**: `isLocalTestOrder()` blocks orders with test prefixes (`TEST-`, `DEV-`, `MOCK-`, `ANG-TEST-`), dummy phones (`01700000000`), or test emails from live dispatch.

---

## 2. Live Read-Only Authentication Verification (Phase 5.2)

A direct read-only query was executed against the Steadfast production API endpoint `GET /get_balance`:

- **API Endpoint**: `https://portal.packzy.com/api/v1/get_balance`
- **Request Headers**:
  - `Api-Key`: Confirmed configured in `.env` (Length $\ge 20$)
  - `Secret-Key`: Confirmed configured in `.env` (Length $\ge 15$)
  - `Accept`: `application/json`
- **HTTP Response Status**: `200 OK`
- **Payload Response**:
  ```json
  {
    "status": 200,
    "current_balance": 0.0
  }
  ```
- **Verification Result**: **PASS**. Merchant API credentials authenticate successfully against Steadfast live infrastructure without triggering any shipment creations or side-effects.

---

## 3. Mock Mode Operational Verification (Phase 5.1)

Automated tests in `tests/courier-automation.test.mjs` and `tests/steadfast-production-verification.test.mjs` verify:
- [x] Zero external HTTP network calls in Mock mode.
- [x] Deterministic mock tracking codes (`STEAD-MOCK-...`).
- [x] Full delivery lifecycle simulation: `pending` $\rightarrow$ `in_transit` $\rightarrow$ `delivered` / `cancelled` / `returned`.
- [x] Webhook handling: Bearer token verification, timing-safe HMAC signature verification, and deduplication via `paymentwebhookinboxes`.

---

## 4. Single Real Consignment Preflight Inspection (Phase 5.3)

Prior to submitting any live consignment to Steadfast, the preflight protocol requires inspecting and explicitly presenting the proposed shipment parameters to the merchant for authorization.

### Proposed Single Live Consignment Parameters:
| Parameter | Proposed Test Value | Validation Status |
| :--- | :--- | :--- |
| **Invoice / Order ID** | `ANG-LIVE-TEST-001` | Unique string, strictly formatted |
| **Recipient Name** | Merchant Authorized Recipient | Validated $\ge 2$ characters |
| **Recipient Phone** | Validated 11-digit Bangladeshi mobile (`017XXXXXXXX`) | Validated via `normalizeBdPhone()` |
| **Recipient Address** | Dedicated Test Delivery Address | Validated $\ge 5$ characters |
| **COD Amount** | ৳ 0 (or agreed advance-paid minimum) | Validated non-negative |
| **Item Description** | ANGKON Fabric Swatch / Sample Garment (Weight: 0.5 kg) | Clean alphanumeric description |
| **Estimated Courier Fee** | ৳ 80 (Inside Dhaka) / ৳ 150 (Outside Dhaka) | Standard merchant delivery tariff |

> [!CAUTION]
> **PREFLIGHT STOP RULE:**
> In accordance with project instructions:
> - **Zero real bookings have been submitted.**
> - `POST /create_order` is **BLOCKED** until the user explicitly reviews and authorizes the exact recipient name, delivery address, COD amount, and charges.
