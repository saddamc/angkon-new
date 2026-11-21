# Tracking & Returns Operations — ANGKON

## 1. Package Tracking Mechanisms

ANGKON provides 3 complementary tracking methods:

1. **Customer Public Tracking:**
   * Direct tracking URL: `https://steadfast.com.bd/t/<TRACKING_CODE>`.
   * Integrated customer order tracking page: `/account/orders/[orderId]`.

2. **Admin Real-Time Polling:**
   * Inside **Admin → Orders → Order Drawer**:
     - Displays live courier events history.
     - Includes a **"Refresh Tracking"** button that immediately queries Steadfast `/status_by_cid/{id}`.

3. **Automated Webhook Synchronization:**
   * Endpoint: `POST /api/webhooks/steadfast`.
   * Receives real-time parcel state updates from Steadfast delivery riders.
   * Signature verified via `STEADFAST_WEBHOOK_SECRET`.

---

## 2. Parcel Return Workflow

When a delivery cannot be completed (e.g. customer unavailable or refuses delivery):

```mermaid
flowchart TD
    Failed["Delivery Attempt Failed"] --> RiderUpdate["Steadfast Marks Return Initiated"]
    RiderUpdate --> Webhook["POST /api/webhooks/steadfast"]
    Webhook --> OrderUpdate["Update order.shipmentStatus = 'return_initiated'"]
    OrderUpdate --> Hub["Parcel Returns to Merchant Hub"]
    Hub --> Received["Merchant Scans Parcel as Returned"]
    Received --> StockRestored["releaseStockForOrder() Restores Inventory"]
    StockRestored --> FinalOrder["Update order.orderStatus = 'returned'"]
```

---

## 3. Cancellation Policy

* **Before Pickup (`created` / `pending`):**
  - Admin clicks **"Cancel Courier Booking"** in the order drawer.
  - Shipment status set to `cancelled`.
  - Order status set to `confirmed` or `processing`.
* **After Pickup (`picked_up` / `in_transit`):**
  - Courier cancellation is locked via API.
  - Admin initiates Return to Merchant (RTM) through hub support with the Consignment ID.
