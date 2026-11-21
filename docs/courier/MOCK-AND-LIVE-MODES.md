# Courier Mock & Live Modes — ANGKON

## 1. Operating Modes Overview

ANGKON provides two completely decoupled execution environments for logistics operations:

### Mode 1: Mock / Development Mode
* **Active by default** when running locally or during test execution.
* Requires **no external credentials**.
* Sends **zero HTTP requests** across the network.
* Uses `MockSteadfastProvider` which generates deterministic `MOCK-CID-...` and `MOCK-TRK-...` identifiers.
* Simulates complete lifecycle state transitions (`picked_up`, `in_transit`, `delivered`, `returned`).
* Returns a simulated courier balance of ৳50,000 clearly labeled with an amber `[MOCK]` tag.

### Mode 2: Live Production Mode
* Activated strictly when:
  ```env
  COURIER_MODE=live
  STEADFAST_LIVE_BOOKING_ENABLED=true
  ```
* Enforces presence of valid `STEADFAST_API_KEY` and `STEADFAST_SECRET_KEY`.
* Requires explicit administrator confirmation (`confirmLiveBooking: true`) for every consignment.
* Permanently records the administrator's ID and timestamp on both `Shipment` and `Order` documents.
* Queries the live Steadfast API (`https://portal.packzy.com/api/v1`).

---

## 2. Safety Guards & Protections

### A. Test Order Isolation
Any order flagged with `isTestOrder: true`, or having dummy phone numbers (`01700000000`), test emails (`@test.com`), or test prefixes (`TEST-`, `DEV-`) is **hard-blocked** from live courier booking:
```text
HTTP 400 TEST_ORDER_LIVE_BOOKING_BLOCKED
"Accidental live booking prevented: This order is identified as a local test/mock order."
```

### B. Pre-Flight & Timeout Recovery by Invoice
Before creating a live parcel, ANGKON checks if the order number was already booked at Steadfast. If a network timeout occurs during `/create_order`, ANGKON queries Steadfast `/status_by_invoice/${orderNumber}` to recover the booked consignment, preventing duplicate physical pickups.
