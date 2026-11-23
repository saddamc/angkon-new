# Coolify Deployment Runbook — Port 3000 & Healthcheck Standardization

This runbook documents the configuration required to deploy ANGKON on Coolify without healthcheck timeouts, 502 errors, or rollback loops.

---

## 1. Root Cause Summary of Previous 502 / Rollback

- **Coolify healthcheck target**: `http://localhost:3000/api/health`
- **Previous Next.js start command**: `next start -H 0.0.0.0 -p 3001`
- **Symptom**: The container started on port `3001`, but Coolify probed port `3000`. Probing an unoccupied port failed with exit code 1 (`connection refused`).
- **Coolify Behavior**: After 3 failed healthcheck attempts, Coolify automatically aborted the deployment, initiated rollback, and returned a Traefik 502 Bad Gateway.

---

## 2. Standardized Configuration

### 2.1 Package Start Script (`package.json`)
The production start script is standardized on port **3000**:
```json
{
  "scripts": {
    "start": "next start -H 0.0.0.0 -p 3000"
  }
}
```

### 2.2 Healthcheck Endpoint (`/api/health`)
A dedicated, lightweight, force-dynamic healthcheck route exists at [src/app/api/health/route.ts](file:///d:/Client%20Project/✅%20Agkon-New/src/app/api/health/route.ts):
- Responds to `GET` and `HEAD` with `HTTP 200 OK`.
- Returns `{ "status": "ok", "uptime": <seconds>, "timestamp": "<ISO>", "port": 3000 }`.
- Sets `Cache-Control: no-store, max-age=0`.
- Independent of database latency to prevent premature container terminations during cold starts.

### 2.3 Container & Image Configuration
Both Dockerfile and Nixpacks build methods are equipped with healthcheck clients (`curl` and `wget`):

- **Dockerfile**:
  - Base image: `node:22-alpine`
  - Installs: `apk add --no-cache curl wget libc6-compat`
  - Exposes: `EXPOSE 3000`
  - Environment: `PORT=3000`, `HOSTNAME=0.0.0.0`, `NODE_ENV=production`
  - Healthcheck: `HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 CMD curl -f http://localhost:3000/api/health || wget -qO- http://localhost:3000/api/health || exit 1`
  - Command: `CMD ["npm", "run", "start"]`

- **nixpacks.toml**:
  - `nixPkgs = ["nodejs_22", "curl", "wget"]`
  - `PORT = "3000"`, `HOSTNAME = "0.0.0.0"`
  - `cmd = "npm run start"`

- **.dockerignore**: Excludes `.git`, `node_modules`, `.next`, and logs to ensure clean and fast builds.

---

## 3. Coolify UI Settings Checklist

When configuring the application in Coolify:

| Setting Field | Expected Value | Purpose |
| :--- | :--- | :--- |
| **Ports Exposes** | `3000` | Informs Traefik which internal port to route container traffic to |
| **Healthcheck Path** | `/api/health` | HTTP probe endpoint |
| **Healthcheck Port** | `3000` | Port probed by Coolify orchestrator |
| **Healthcheck Method** | `GET` | Standard HTTP probe |
| **Healthcheck Start Period** | `30` seconds | Grace period allowing Next.js to compile pages before healthcheck fires |
| **Healthcheck Interval** | `10` seconds | Probe frequency |
| **Healthcheck Retries** | `3` | Attempts before triggering rollback |

---

## 4. Safety Invariants

- **Database**: Temporary deployment uses `angkon_dev` replica set, strictly avoiding production `angkon`.
- **Payment Gateway**: SSLCOMMERZ runs in Sandbox mode (`SSLCOMMERZ_MODE=sandbox`, `SSLCOMMERZ_IS_LIVE=false`).
- **Courier**: Steadfast operates in Mock mode (`COURIER_MODE=mock`, `STEADFAST_LIVE_BOOKING_ENABLED=false`).
- **Production DNS**: Unaffected.
