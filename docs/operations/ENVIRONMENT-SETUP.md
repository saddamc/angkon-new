# Environment Setup Guide — ANGKON

## 1. Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string (including replica set & DB name) |
| `JWT_SECRET` | Yes | — | Secret string for signing customer & admin authentication tokens |
| `CRON_SECRET` | Yes | — | Secret bearer token authorizing Vercel cron reconciliation jobs |
| `NEXT_PUBLIC_BASE_URL` | Yes | `http://localhost:3001` | Public origin URL for redirects and webhooks |
| `SSLCOMMERZ_STORE_ID` | Yes | — | Store ID from SSLCOMMERZ Merchant Portal |
| `SSLCOMMERZ_STORE_PASSWORD` | Yes | — | Store Password from SSLCOMMERZ Merchant Portal |
| `SSLCOMMERZ_IS_SANDBOX` | Yes | `true` | `true` for sandbox testing, `false` for live production |
| `COURIER_MODE` | No | `mock` | `mock` for local development, `live` for production |
| `STEADFAST_LIVE_BOOKING_ENABLED`| No | `false`| Must be `true` to enable real Steadfast parcel creation |
| `STEADFAST_BASE_URL` | No | `https://portal.packzy.com/api/v1` | Base URL for Steadfast API |
| `STEADFAST_API_KEY` | If live | — | Merchant API key from Steadfast portal |
| `STEADFAST_SECRET_KEY` | If live | — | Merchant secret key from Steadfast portal |
| `STEADFAST_WEBHOOK_SECRET` | If live | — | Webhook signing secret from Steadfast |
| `CLOUDINARY_CLOUD_NAME` | Yes | — | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | Yes | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | — | Cloudinary API secret |

---

## 2. Environment Verification

Validate your local environment setup with:
```powershell
npm run probe:integrations
```
This script validates:
* Database connectivity
* JWT & CRON secrets
* Gateway & courier credentials
* Rate limiting configurations
* Endpoint health
