# ANGKON — Production VPS Deployment Runbook

> **Target Platform:** Linux VPS (Ubuntu 22.04 / 24.04 LTS)  
> **Application Stack:** Next.js 16 (Node.js 22 LTS), Nginx Reverse Proxy, systemd Process Supervisor, MongoDB Atlas  
> **Status:** Plan and runbook validated; **no deployment has been performed yet**.

---

## Table of Contents
1. [Phase 1 — Prepare VPS & Security Hardening](#phase-1--prepare-vps--security-hardening)
2. [Phase 2 — DNS Configuration & HTTPS (Certbot)](#phase-2--dns-configuration--https-certbot)
3. [Phase 3 — Application Deployment & Directory Layout](#phase-3--application-deployment--directory-layout)
4. [Phase 4 — Production Environment Configuration](#phase-4--production-environment-configuration)
5. [Phase 5 — Process Management with systemd](#phase-5--process-management--with-systemd)
6. [Phase 6 — Nginx Reverse Proxy Configuration](#phase-6--nginx-reverse-proxy-configuration)
7. [Phase 7 — VPS Scheduled Jobs (systemd Timers)](#phase-7--vps-scheduled-jobs-systemd-timers)
8. [Phase 8 — Database Preparation & Atlas Hardening](#phase-8--database-preparation--atlas-hardening)
9. [Phase 9 — Staging Sandbox Acceptance Testing](#phase-9--staging-sandbox-acceptance-testing)
10. [Phase 10 — Production Live Acceptance Testing](#phase-10--production-live-acceptance-testing)
11. [Phase 11 — Production Telemetry & Log Monitoring](#phase-11--production-telemetry--log-monitoring)
12. [Phase 12 — Emergency Incident Response & Rollback Runbook](#phase-12--emergency-incident-response--rollback-runbook)

---

## Phase 1 — Prepare VPS & Security Hardening

### 1.1 Operating System & Runtime
- **OS:** Clean installation of **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS**.
- **Node.js:** Node.js **22 LTS** via NodeSource or NVM.
- **Package Manager:** `npm` v10+.

### 1.2 Dedicated Deployment User
Never run the Node.js application or web servers as `root`:
```bash
# 1. Create a dedicated deploy user with a locked home directory
sudo adduser --gecos "" angkon
sudo usermod -aG sudo angkon

# 2. Set up SSH key authentication for the angkon user
sudo mkdir -p /home/angkon/.ssh
sudo cp ~/.ssh/authorized_keys /home/angkon/.ssh/
sudo chown -R angkon:angkon /home/angkon/.ssh
sudo chmod 700 /home/angkon/.ssh
sudo chmod 600 /home/angkon/.ssh/authorized_keys
```

### 1.3 SSH & Firewall Hardening
```bash
# 1. Restrict SSH configuration
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# 2. Configure UFW (Uncomplicated Firewall)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP (Certbot & redirect)'
sudo ufw allow 443/tcp comment 'HTTPS'
# Port 3001 is deliberately kept PRIVATE (accessible only via 127.0.0.1)
sudo ufw enable

# 3. Install fail2ban & automatic security updates
sudo apt update && sudo apt install -y fail2ban unattended-upgrades
sudo systemctl enable --now fail2ban
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Phase 2 — DNS Configuration & HTTPS (Certbot)

### 2.1 DNS Records
Point both root and `www` domains to your VPS public IPv4 address:
```text
angkon.net       A      <VPS_PUBLIC_IPV4>
www.angkon.net   A      <VPS_PUBLIC_IPV4>
```

### 2.2 Canonical Hostname & Gateway Redirects
- Canonical Domain: **`https://angkon.net`** (all `www` traffic permanently redirects to apex).
- **Critical Requirement:** SSLCOMMERZ gateway verification must reach these live public callback endpoints:
  - `https://angkon.net/api/payments/sslcommerz/success`
  - `https://angkon.net/api/payments/sslcommerz/fail`
  - `https://angkon.net/api/payments/sslcommerz/cancel`
  - `https://angkon.net/api/payments/sslcommerz/ipn`

### 2.3 SSL/TLS Certificate Provisioning
```bash
# 1. Install Certbot with the Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# 2. Obtain Let's Encrypt certificate (after Nginx server block is enabled)
sudo certbot --nginx -d angkon.net -d www.angkon.net --agree-tos -m admin@angkon.net --no-eff-email

# 3. Verify automatic renewal timer
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## Phase 3 — Application Deployment & Directory Layout

### 3.1 Recommended Zero-Downtime Directory Structure
```text
/var/www/angkon/
├── current -> /var/www/angkon/releases/20261123_v1.0.0  # Symlink to active release
├── releases/                                           # Versioned immutable releases
│   ├── 20261123_v1.0.0
│   └── 20261122_v0.9.0
├── shared/
│   └── .env                                            # Production environment file (chmod 600)
└── /var/backups/angkon/                                # Database & asset snapshots
```

### 3.2 Directory Initialization
```bash
sudo mkdir -p /var/www/angkon/{releases,shared} /var/backups/angkon
sudo chown -R angkon:angkon /var/www/angkon /var/backups/angkon
sudo chmod 750 /var/www/angkon
```

### 3.3 Deploying a Release
As the `angkon` user:
```bash
# 1. Create a versioned release folder
RELEASE_DIR="/var/www/angkon/releases/$(date +%Y%m%d_%H%M%S)"
git clone --branch main <REPOSITORY_GIT_URL> "$RELEASE_DIR"
cd "$RELEASE_DIR"

# 2. Install production dependencies and verify compilation
npm ci
npm run typecheck
npm run lint
npm run build

# 3. Link shared environment file
ln -s /var/www/angkon/shared/.env "$RELEASE_DIR/.env"

# 4. Atomic symlink switch to the new release
ln -sfn "$RELEASE_DIR" /var/www/angkon/current

# 5. Restart application
sudo systemctl restart angkon
```
> [!CAUTION]
> **Never copy local development `.env` into production.** The production `.env` must be authored directly in `/var/www/angkon/shared/.env` with production keys and secrets.

---

## Phase 4 — Production Environment Configuration

File location: `/var/www/angkon/shared/.env`  
Permissions: `chmod 600 /var/www/angkon/shared/.env` (owned by `angkon:angkon`)

```env
# ==============================================================================
# ANGKON PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================

# Core Application & Isolation
NODE_ENV=production
APP_ENVIRONMENT=production
PORT=3001
HOSTNAME=127.0.0.1
NEXT_PUBLIC_SITE_URL=https://angkon.net
NEXT_PUBLIC_APP_URL=https://angkon.net

# Database: MongoDB Atlas Production Cluster
# STRICT RULE: Must connect to production database 'angkon', never 'angkon_dev'
DATABASE_URL=mongodb+srv://<prod_db_user>:<prod_db_password>@cluster0.sdaudkh.mongodb.net/angkon?retryWrites=true&w=majority&appName=Cluster0
MONGODB_MAX_POOL_SIZE=30
MONGODB_MIN_POOL_SIZE=5
MONGODB_MAX_IDLE_TIME_MS=30000

# High-Entropy Security Secrets (minimum 64 characters random)
JWT_SECRET=<GENERATE_SECURE_512_BIT_SECRET_OPENSSL_HEX_64>
CRON_SECRET=<GENERATE_SECURE_RANDOM_CRON_TOKEN_64>
INTERNAL_TOKEN_KEY=<GENERATE_32_BYTE_HEX_KEY>

# SSLCOMMERZ Hosted Payment Gateway (LIVE Production Credentials)
# STRICT RULE: Never use SSLCOMMERZ_MODE=sandbox in production
SSLCOMMERZ_MODE=live
SSLCOMMERZ_IS_LIVE=true
SSLCOMMERZ_LIVE_STORE_ID=<LIVE_STORE_ID_FROM_SSLCOMMERZ>
SSLCOMMERZ_LIVE_STORE_PASSWORD=<LIVE_STORE_PASSWORD_FROM_SSLCOMMERZ>
SSLCOMMERZ_BASE_URL=https://securepay.sslcommerz.com

# Steadfast Courier (LIVE Logistics Credentials)
# STRICT RULE: Never use COURIER_MODE=mock in production
COURIER_MODE=live
STEADFAST_LIVE_BOOKING_ENABLED=true
STEADFAST_API_KEY=<LIVE_API_KEY_FROM_STEADFAST>
STEADFAST_SECRET_KEY=<LIVE_SECRET_KEY_FROM_STEADFAST>
STEADFAST_WEBHOOK_SECRET=<CONFIGURED_WEBHOOK_SECRET>
STEADFAST_BASE_URL=https://portal.packzy.com/api/v1
FORCE_LIVE_COURIER_TEST=false

# Media Storage (Production Cloudinary Bucket)
CLOUDINARY_CLOUD_NAME=<PRODUCTION_CLOUD_NAME>
CLOUDINARY_API_KEY=<PRODUCTION_API_KEY>
CLOUDINARY_API_SECRET=<PRODUCTION_API_SECRET>

# Transactional Email (Resend Live Domain)
RESEND_API_KEY=<PRODUCTION_RESEND_API_KEY>
ENABLE_REAL_EMAIL=true
EMAIL_FROM=ANGKON <orders@angkon.net>

# Meta Suite (CAPI & Pixel)
META_ACCESS_TOKEN=<PRODUCTION_SYSTEM_USER_TOKEN>
META_PIXEL_ID=<PRODUCTION_DATASET_ID>
META_CAPI_TEST_CODE=
```

---

## Phase 5 — Process Management with systemd

Create systemd service file: `/etc/systemd/system/angkon.service`
```ini
[Unit]
Description=ANGKON Luxury E-Commerce Next.js Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=angkon
Group=angkon
WorkingDirectory=/var/www/angkon/current
EnvironmentFile=/var/www/angkon/shared/.env
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5s
TimeoutStopSec=30s

# Security Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now angkon
sudo systemctl status angkon
```

---

## Phase 6 — Nginx Reverse Proxy Configuration

Create site configuration: `/etc/nginx/sites-available/angkon`
```nginx
# 1. Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name angkon.net www.angkon.net;
    return 301 https://angkon.net$request_uri;
}

# 2. Redirect www.angkon.net to canonical apex https://angkon.net
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.angkon.net;

    ssl_certificate /etc/letsencrypt/live/angkon.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/angkon.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://angkon.net$request_uri;
}

# 3. Canonical HTTPS Application Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name angkon.net;

    # SSL Certificates managed by Certbot
    ssl_certificate /etc/letsencrypt/live/angkon.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/angkon.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Client payload & buffer constraints
    client_max_body_size 50M;
    client_body_buffer_size 128k;

    # Timeouts for heavy report generations and image syncs
    proxy_connect_timeout 60s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;

    # Security Headers (Supplements Next.js headers)
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static Assets Caching (Next.js immutable hashed chunks)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_cache_bypass $http_upgrade;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # All Public Traffic & SSLCOMMERZ Callback Proxying
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Standard Forwarding Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Disable buffering for real-time streaming & IPN responses
        proxy_buffering off;
    }
}
```

Enable site and test configuration:
```bash
sudo ln -sfn /etc/nginx/sites-available/angkon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Phase 7 — VPS Scheduled Jobs (systemd Timers)

Vercel Cron does not execute on a VPS. We run background tasks using secured systemd service units triggered on timers with `Authorization: Bearer <CRON_SECRET>`.

### 7.1 Payment Reconciliation Timer (`angkon-payment-reconcile`)
Runs every 10 minutes to query unreturned SSLCOMMERZ transactions.

Create `/etc/systemd/system/angkon-payment-reconcile.service`:
```ini
[Unit]
Description=ANGKON Payment Reconciliation Job
After=angkon.service

[Service]
Type=oneshot
User=angkon
EnvironmentFile=/var/www/angkon/shared/.env
ExecStart=/usr/bin/curl -fsS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  http://127.0.0.1:3001/api/payments/reconcile
```

Create `/etc/systemd/system/angkon-payment-reconcile.timer`:
```ini
[Unit]
Description=Trigger ANGKON Payment Reconciliation every 10 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=10min
Persistent=true

[Install]
WantedBy=timers.target
```

### 7.2 Courier Status Sync Timer (`angkon-courier-sync`)
Runs every 30 minutes to synchronize active Steadfast delivery tracking.

Create `/etc/systemd/system/angkon-courier-sync.service`:
```ini
[Unit]
Description=ANGKON Courier Status Sync Job
After=angkon.service

[Service]
Type=oneshot
User=angkon
EnvironmentFile=/var/www/angkon/shared/.env
ExecStart=/usr/bin/curl -fsS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  http://127.0.0.1:3001/api/cron/courier-sync
```

Create `/etc/systemd/system/angkon-courier-sync.timer`:
```ini
[Unit]
Description=Trigger Courier Sync every 30 minutes

[Timer]
OnBootSec=10min
OnUnitActiveSec=30min
Persistent=true

[Install]
WantedBy=timers.target
```

Activate timers:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now angkon-payment-reconcile.timer
sudo systemctl enable --now angkon-courier-sync.timer
systemctl list-timers --all | grep angkon
```

---

## Phase 8 — Database Preparation & Atlas Hardening

Before opening production traffic:

1. **MongoDB Atlas Network Access**: Add the VPS static public IPv4 address to the MongoDB Atlas IP Access List (`Network Access` in Atlas Console).
2. **Production Database Verification**: Ensure connection string uses database name `angkon`.
3. **Index Migration Verification**:
   ```bash
   cd /var/www/angkon/current
   # Run index migration in dry-run mode
   npm run verify:atlas-credentials
   ```
4. **`autoIndex` Verification**: Production strictly disables `autoIndex` at runtime (`src/lib/mongodb.ts`) to avoid locking collections during customer checkouts.
5. **Pre-Flight Backup Snapshot**: In MongoDB Atlas, click **`Take Snapshot Now`** under Backup.

---

## Phase 9 — Staging Sandbox Acceptance Testing

On the staging environment prior to switching production live:
- Database: `angkon_dev` / `angkon_staging` (never production `angkon`).
- Gateways: `SSLCOMMERZ_MODE=sandbox`, `COURIER_MODE=mock`.
- Email: `ENABLE_REAL_EMAIL=false`.

Execute test checklist:
- [x] Succeeded sandbox payment verified via `validationserverAPI.php`.
- [x] Bank decline / OTP timeout handled cleanly (`returned_failed`).
- [x] Customer cancellation (`returned_cancelled`) restores cart inventory.
- [x] Simulating customer internet loss preserves pending state and resolves via reconciler.
- [x] Duplicate IPN delivery rejected with SHA-256 fingerprint acknowledgment.
- [x] Partial and full refunds calculate correct remaining balances.

---

## Phase 10 — Production Live Acceptance Testing

After deploying production credentials:

1. **Checkout Gateway Availability**:
   ```bash
   curl -s https://angkon.net/api/checkout/config | grep '"onlinePaymentAvailable":true'
   ```
2. **SSLCOMMERZ Callback Registration**: Verify merchant portal has registered callback URLs pointing to `https://angkon.net/api/payments/sslcommerz/*`.
3. **Steadfast API Key & Balance Verification**: Confirm read-only balance API query responds without authentication errors.
4. **First Live Canary Transaction**:
   - Create a live order for a test product priced at ৳10.
   - Pay using a real Visa / Mastercard or bKash account.
   - Confirm customer redirect to `https://angkon.net/checkout/payment-status/*`.
   - **Verification Invariants:**
     - Exactly one order record marked `paid`.
     - Stock deducted exactly once.
     - Customer receives official email receipt from `orders@angkon.net`.
     - Meta Conversions API receives single deduplicated `Purchase` event.
     - Refreshing page or replaying callback does not charge or re-commit stock.
5. **Live Courier Booking Canary**:
   - Select the canary order in `/admin/orders`.
   - Click **Book Steadfast**. Verify consignment ID and tracking code are returned from Steadfast.

---

## Phase 11 — Production Telemetry & Log Monitoring

Monitor the running system with these operational commands:

```bash
# 1. Real-time application logs
sudo journalctl -u angkon -f

# 2. Payment reconciliation logs
sudo journalctl -u angkon-payment-reconcile -n 50 --no-pager

# 3. Nginx error & access logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log | grep "/api/payments/"

# 4. Process and memory footprint
systemctl status angkon
top -p $(pgrep -f "node.*start")
```

---

## Phase 12 — Emergency Incident Response & Rollback Runbook

If an anomaly occurs during or immediately after deployment:

### Instant Fallback to Safety (Zero Code Changes)
If live payment or courier issues occur, immediately switch modes safely in `/var/www/angkon/shared/.env`:
```bash
# Temporarily revert to COD-only while investigating
sudo sed -i 's/SSLCOMMERZ_IS_LIVE=true/SSLCOMMERZ_IS_LIVE=false/' /var/www/angkon/shared/.env
sudo sed -i 's/STEADFAST_LIVE_BOOKING_ENABLED=true/STEADFAST_LIVE_BOOKING_ENABLED=false/' /var/www/angkon/shared/.env
sudo systemctl restart angkon
```

### Full Release Rollback
If the new software release exhibits critical regressions:
```bash
# 1. Identify previous release directory
PREV_RELEASE=$(ls -td /var/www/angkon/releases/* | sed -n 2p)
echo "Rolling back to: $PREV_RELEASE"

# 2. Point current symlink to previous release
ln -sfn "$PREV_RELEASE" /var/www/angkon/current

# 3. Restart application
sudo systemctl restart angkon

# 4. Verify healthy status
sudo systemctl status angkon
curl -I https://angkon.net/
```

> [!IMPORTANT]
> **Data Preservation Invariant**: Never drop, restore over, or delete MongoDB collections during an application rollback. All orders and payment records created during the deployment window must remain intact.
