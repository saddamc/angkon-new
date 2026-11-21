# Local Development Guide — ANGKON

## 1. Prerequisites
* **Node.js:** v20.x or higher
* **npm:** v10.x or higher
* **MongoDB:** Atlas cloud cluster or local replica set
* **Git:** v2.30+

---

## 2. Quick Start

1. **Clone & Install Dependencies:**
   ```powershell
   git clone <repository_url>
   cd "Agkon-New"
   npm install
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env`:
   ```powershell
   cp .env.example .env
   ```
   Fill in your `MONGODB_URI`, `JWT_SECRET`, and sandbox credentials.

3. **Verify Configuration:**
   ```powershell
   npm run probe:integrations
   ```

4. **Start Development Server:**
   ```powershell
   npm run dev
   ```
   Open `http://localhost:3001` in your browser.

---

## 3. Running Automated Tests

* **All Core Tests:**
  ```powershell
  npx tsx --test tests/payments/*.test.ts tests/orders-payment-courier-workflow.test.ts tests/steadfast-modes.test.ts
  ```
* **TypeScript Type Checking:**
  ```powershell
  npm run typecheck
  ```
* **ESLint Code Quality:**
  ```powershell
  npm run lint
  ```
* **Production Build Verification:**
  ```powershell
  npm run build
  ```
