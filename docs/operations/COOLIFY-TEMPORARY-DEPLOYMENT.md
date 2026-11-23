# Temporary Coolify deployment

This application has one production-container port: **3000**.

Configure the temporary Coolify application as follows before deploying:

| Coolify setting | Required value |
| --- | --- |
| Build pack | Dockerfile |
| Dockerfile | `./Dockerfile` |
| Ports Exposes | `3000` |
| Temporary-domain destination port | `3000` |
| Healthcheck path | `/api/health` |
| Healthcheck URL | `http://localhost:3000/api/health` |

The Docker image has its own `curl` healthcheck. Coolify may use its configured
client instead, but either check must target the same loopback URL above.

## Temporary environment safety gate

Set these values in the **temporary application only**. Do not copy its values
to the live application and do not change Production or DNS.

```dotenv
APP_ENVIRONMENT=development
DATABASE_URL=<existing URI ending in /angkon_dev>
SSLCOMMERZ_MODE=sandbox
SSLCOMMERZ_IS_LIVE=false
COURIER_MODE=mock
STEADFAST_LIVE_BOOKING_ENABLED=false
```

Retain the existing MongoDB credentials; only verify that the database path is
`angkon_dev` rather than `angkon`. Never place a production database URI or
live payment/courier values in this temporary deployment.

## Post-deploy verification

1. Confirm the deployment log reports `Ready` on `http://0.0.0.0:3000`.
2. In the running container, run `curl -i http://localhost:3000/api/health`.
   It must return `HTTP/1.1 200` with `{"status":"ok"}`.
3. Confirm the Coolify container health is `healthy` after at least three
   healthcheck intervals, with no rollback.
4. Request the temporary domain over both HTTP and HTTPS and confirm both
   return an application response (HTTPS must have a valid certificate).
