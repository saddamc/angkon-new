# Deployment & Preflight Checklist: ANGKON

Store: **ANGKON — House of Modern Heritage**  
Date: 2026-10-10  
Platform: Next.js 16.2 Turbopack on Vercel / Node.js Production Server  
Status: **Preflight Gate Passed — Ready for Production Deployment**

---

## 1. Preflight Verification Gate (All Passed)

- [x] **Test suite green**: 12 of 12 test cases passed (`replica/test-plan.md`).
- [x] **Zero open blocker bugs**: 0 open S1, 0 open S2 bugs (`replica/bugs.md`).
- [x] **Feature parity**: 13 of 13 must-haves completed, **100.0 / 100** feature score (`parity.py`).
- [x] **Rebrand sweep clean**: `sweep.py` exit code `0` (`Clean. Nothing of the original's name, domain or colours found.`).
- [x] **Store listings valid**: `listing.py` exit code `0` (App Store and Google Play metadata linted with 0 errors).
- [x] **Production build passes**: `npm run build` compiled all 25 routes cleanly with **exit code 0**.
- [x] **Accessibility compliance**: 8.99:1 WCAG AAA contrast ratio passed on Royal Maroon (`#400604`) and Heritage Gold (`#E1B76F`).
- [x] **Store identity & assets**: Page titles, OpenGraph metadata, Niketan showroom address, WhatsApp, and TikTok channels verified.

---

## 2. Production Service Configuration

### Environment Variables (.env.production):
Configure these variables in your hosting provider (Vercel Project Settings > Environment Variables):

| Variable | Description | Source |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_WC_API_URL` | WordPress / WooCommerce base URL | Your live WP domain |
| `NEXT_PUBLIC_WC_CONSUMER_KEY` | Public Read Key for product catalog | WP WooCommerce REST API Keys |
| `NEXT_PUBLIC_WC_CONSUMER_SECRET` | Public Read Secret | WP WooCommerce REST API Keys |
| `WC_ORDERS_CONSUMER_KEY` | Server-only Write Key for orders | WP WooCommerce REST API Keys |
| `WC_ORDERS_CONSUMER_SECRET` | Server-only Write Secret | WP WooCommerce REST API Keys |
| `ADMIN_JWT_SECRET` | Secret key for admin authentication | Secure random string (64 chars) |

---

## 3. Domain & DNS Records

Connect your custom domain (e.g., `angkon.com` or `angkonbd.com`):

### Storefront Web Traffic:
| Type | Host / Name | Value / Destination | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` (Vercel Apex IP) | Automatic / 300 |
| **CNAME** | `www` | `cname.vercel-dns.com` | Automatic / 300 |

### Transactional Email Records (Resend / Google Workspace):
| Type | Host / Name | Value | Purpose |
| :--- | :--- | :--- | :--- |
| **TXT** | `@` | `v=spf1 include:spf.protection.outlook.com ~all` (or provider SPF) | SPF Authentication |
| **CNAME** | `resend._domainkey` | `dkim.resend.com` | DKIM Signing |
| **TXT** | `_dmarc` | `v=DMARC1; p=none; rua=mailto:angkonofficial08@gmail.com` | DMARC Protection |

---

## 4. Post-Launch Monitoring & Watchlist

- [ ] **Realtime Uptime**: Set up UptimeRobot or BetterStack monitoring on `https://your-domain.com` and `https://your-domain.com/api/products`.
- [ ] **Order Notification Hook**: Verify WhatsApp or SMS notification triggers immediately when a customer submits Cash on Delivery checkout.
- [ ] **First Order Smoke Test**: Execute one real order on mobile (390px viewport) selecting Dhaka (৳60) and verify the order appears in the WooCommerce administrative dashboard.
