# SSLCOMMERZ Official API Reference

This document catalogs the exact SSLCOMMERZ Hosted Gateway API endpoints, parameters, and response contracts implemented in ANGKON.

---

## 1. Environments & Base URLs

| Environment | Base URL |
|---|---|
| **Sandbox** | `https://sandbox.sslcommerz.com` |
| **Live Production** | `https://securepay.sslcommerz.com` |

---

## 2. Session Initiation API

- **Endpoint:** `/gwprocess/v4/api.php`
- **HTTP Method:** `POST`
- **Content-Type:** `application/x-www-form-urlencoded`

### Request Parameters

| Parameter | Type | Required | Description |
|---|---|:---:|---|
| `store_id` | String(30) | Yes | Merchant Store ID |
| `store_passwd` | String(30) | Yes | Merchant Store Password |
| `total_amount` | Decimal(10,2) | Yes | Total payable amount in BDT |
| `currency` | String(3) | Yes | Currency code (`BDT`) |
| `tran_id` | String(30) | Yes | Unique merchant transaction ID (e.g. `ANG-1001-A1`) |
| `success_url` | URL(255) | Yes | Customer return URL upon successful payment |
| `fail_url` | URL(255) | Yes | Customer return URL upon payment failure |
| `cancel_url` | URL(255) | Yes | Customer return URL upon cancellation |
| `ipn_url` | URL(255) | Yes | Server-to-server webhook endpoint |
| `cus_name` | String(50) | Yes | Customer full name |
| `cus_email` | String(50) | Yes | Customer email address |
| `cus_add1` | String(100) | Yes | Customer street address |
| `cus_city` | String(50) | Yes | Customer city |
| `cus_postcode`| String(20) | Yes | Customer postal code |
| `cus_country` | String(50) | Yes | Customer country (`Bangladesh`) |
| `cus_phone` | String(20) | Yes | Customer phone number |
| `shipping_method` | String(10) | Yes | `YES` or `NO` |
| `product_name` | String(255) | Yes | Summary of ordered products |
| `product_category`| String(100)| Yes | Product category (`Clothing`) |
| `product_profile` | String(50) | Yes | `general` |

### Response Structure (JSON)

```json
{
  "status": "SUCCESS",
  "failedreason": "",
  "sessionkey": "E78F9B61876D805647573A99BFCC09E3",
  "GatewayPageURL": "https://sandbox.sslcommerz.com/EasyCheckOut/testboxe78f9b61876d805647573a99bfcc09e3"
}
```

---

## 3. Order Validation API

- **Endpoint:** `/validator/api/validationserverAPI.php`
- **HTTP Method:** `GET`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|:---:|---|
| `val_id` | String(80) | Yes | Validation ID returned by SSLCOMMERZ |
| `store_id` | String(30) | Yes | Merchant Store ID |
| `store_passwd` | String(30) | Yes | Merchant Store Password |
| `format` | String(10) | Yes | `json` |

### Response Structure (JSON)

```json
{
  "status": "VALID",
  "tran_date": "2026-11-20 20:30:00",
  "tran_id": "ANG-261120-1001",
  "val_id": "2611202030001ValId",
  "amount": "2500.00",
  "store_amount": "2437.50",
  "currency": "BDT",
  "bank_tran_id": "1709162345070ANJdZV8LyI4cMw",
  "card_type": "VISA-CityBank",
  "card_brand": "VISA",
  "card_issuer_country": "Bangladesh",
  "risk_level": "0",
  "risk_title": "Safe",
  "APIConnect": "DONE"
}
```

---

## 4. Merchant Transaction ID Query API

- **Endpoint:** `/validator/api/merchantTransIDvalidationAPI.php`
- **HTTP Method:** `GET`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|:---:|---|
| `tran_id` | String(30) | Yes | Merchant transaction ID to look up |
| `store_id` | String(30) | Yes | Merchant Store ID |
| `store_passwd` | String(30) | Yes | Merchant Store Password |
| `format` | String(10) | Yes | `json` |

### Response Structure (JSON)

Returns an object containing `element`: either an array of matching transaction attempts or a single transaction object.

---

## 5. Initiate Refund API

- **Endpoint:** `/validator/api/merchantTransIDvalidationAPI.php`
- **HTTP Method:** `GET`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|:---:|---|
| `store_id` | String(30) | Yes | Merchant Store ID |
| `store_passwd` | String(30) | Yes | Merchant Store Password |
| `bank_tran_id` | String(80) | Yes | Original bank transaction reference |
| `refund_amount`| Decimal(10,2)| Yes | Amount to refund |
| `refund_remarks`| String(255) | Yes | Reason for refund |
| `refe_id` | String(50) | Yes | Internal refund ID (`REF-...`) |
| `format` | String(10) | Yes | `json` |

### Response Structure (JSON)

```json
{
  "APIConnect": "DONE",
  "status": "success",
  "refund_ref_id": "59bd63fea5455"
}
```

---

## 6. Refund Status Query API

- **Endpoint:** `/validator/api/merchantTransIDvalidationAPI.php`
- **HTTP Method:** `GET`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|:---:|---|
| `refund_ref_id` | String(50) | Yes | Gateway refund reference ID |
| `store_id` | String(30) | Yes | Merchant Store ID |
| `store_passwd` | String(30) | Yes | Merchant Store Password |
| `format` | String(10) | Yes | `json` |

### Response Structure (JSON)

```json
{
  "APIConnect": "DONE",
  "bank_tran_id": "1709162345070ANJdZV8LyI4cMw",
  "trans_id": "ANG-261120-1001",
  "initiated_on": "2026-11-20 21:00:00",
  "refunded_on": "2026-11-20 21:15:00",
  "status": "refunded",
  "refund_ref_id": "59bd63fea5455"
}
```
