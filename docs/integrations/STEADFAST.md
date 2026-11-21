# Steadfast Courier Integration Guide — ANGKON

## 1. Overview
ANGKON integrates with **Steadfast Courier** for automated logistics, parcel pickup scheduling, cash-on-delivery collection, and real-time package tracking across Bangladesh.

---

## 2. Operating Modes

ANGKON strictly separates Steadfast operations into two modes:

| Feature | Mode 1: Mock / Development | Mode 2: Live Production |
|---|---|---|
| **Environment Flag** | Default / `COURIER_MODE=mock` | `COURIER_MODE=live` + `STEADFAST_LIVE_BOOKING_ENABLED=true` |
| **Network Traffic** | Zero external HTTP requests | Direct calls to Steadfast API |
| **Consignment IDs** | Prefixed `MOCK-CID-...` | Official Steadfast numerical IDs |
| **Tracking Codes** | Prefixed `MOCK-TRK-...` | Official Steadfast tracking codes |
| **Balance Display** | ৳50,000 tagged `[MOCK]` (Amber) | Real merchant ledger balance (Emerald) |
| **Test Order Guard** | Allows test bookings | Rejects test orders with `HTTP 400` |
| **Admin Authorization** | Standard admin click | Requires explicit confirmation checkbox |

---

## 3. Official API Endpoints

```text
Base URL (Production): https://portal.packzy.com/api/v1
```

* `POST /create_order`: Creates a single delivery consignment.
* `POST /create_order/bulk-order`: Bulk dispatch up to 500 parcels per call.
* `GET /status_by_cid/{consignment_id}`: Real-time parcel status lookup by consignment ID.
* `GET /status_by_trackingcode/{tracking_code}`: Real-time parcel status lookup by tracking code.
* `GET /status_by_invoice/{invoice}`: Lookup parcel by merchant order number (used for timeout recovery).
* `GET /get_balance`: Read-only merchant ledger balance inquiry.

---

## 4. Required Headers & Authentication

All requests to Steadfast API send:
* `Api-Key`: Merchant API Key (from Steadfast Portal).
* `Secret-Key`: Merchant Secret Key (from Steadfast Portal).
* `Content-Type`: `application/json`.
* `Accept`: `application/json`.
