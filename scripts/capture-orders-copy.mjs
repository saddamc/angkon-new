import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Verifies the detail sheet + copy affordances against mocked orders:
 *  - clicking the order number copies it
 *  - clicking an email/phone/address opens the customer sheet
 *  - per-field copy writes the exact value
 *  - clicking the product name opens the product sheet
 */

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "orders-copy");
fs.mkdirSync(OUT, { recursive: true });

const env = fs.readFileSync(".env", "utf-8");
const secret = (env.match(/JWT_SECRET=([^\r\n]+)/) || [])[1]?.trim() || "angkon_secure_jwt_secret_2026";

async function token() {
  const payload = {
    sub: "saddam13bd@gmail.com", name: "S", role: "superadmin",
    authorizedTenants: ["angkon-main", "primary_store"], defaultTenant: "primary_store",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const b = Buffer.from(JSON.stringify(payload)).toString("base64");
  const d = `${h}.${b}`;
  const crypto = await import("crypto");
  return `${d}.${crypto.createHmac("sha256", secret).update(d).digest("base64")}`;
}

const EMAIL = "nowshin.tabassum.rahman.37@gmail.com";
const PHONE = "+8801329962414";
const ADDRESS = "Mymensingh, Shankipara, Cantonment College Road, House 12, Block C";
const ORDER = "ANG-890952-275";
const PRODUCT = "Tawakkal Wada – Deep Raspberry Magenta Premium Embroidered Suit";

const mock = [{
  id: 9101,
  number: ORDER,
  status: "pending",
  paymentStatus: "pending",
  payment_status: "pending",
  date_created: "2026-11-03T10:00:00Z",
  total: "8110",
  payment_method_title: "Cash on Delivery",
  billing: {
    first_name: "Nowshin Tabassum Rahman Chowdhury", last_name: "",
    email: EMAIL, phone: PHONE, address_1: ADDRESS, city: "Mymensingh",
  },
  line_items: [{ name: PRODUCT, quantity: 1, size: "M", price: "8110" }],
}];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 800 }, permissions: ["clipboard-read", "clipboard-write"] });
await ctx.addCookies([{ name: "nb_admin_token", value: await token(), domain: "localhost", path: "/" }]);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.route("**/api/admin/orders?*", async (route) => {
  if (route.request().method() !== "GET") return route.continue();
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: mock, total: 1, totalPages: 1 }) });
});

await page.goto("http://localhost:3001/admin/orders", { waitUntil: "networkidle", timeout: 120000 });
await page.waitForSelector("text=ORDER NO & DATE", { timeout: 60000 });
await page.waitForTimeout(1200);

const shots = [];
const shoot = async (name) => {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  shots.push(file);
};

await shoot("01-row");

/* 1 — order number copy */
await page.locator('button[title="Click to copy the order number"]').first().click();
await page.waitForTimeout(500);
const clipOrder = await page.evaluate(() => navigator.clipboard.readText());
const toastOrder = await page.locator("text=Order number copied").count();
console.log("1) order number clipboard:", JSON.stringify(clipOrder), "| toast:", toastOrder);

/* 2 — customer sheet */
await page.locator('button[title*="click for details"]').first().click();
await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
await page.waitForTimeout(300);
const custTitle = await page.locator("#info-modal-title").innerText();
const fieldLabels = await page.locator('[role="dialog"] .uppercase').allInnerTexts();
console.log("2) customer sheet title:", JSON.stringify(custTitle), "| fields:", JSON.stringify(fieldLabels));
await shoot("02-customer-sheet");

/* 3 — copy email from the sheet */
await page.locator('[role="dialog"] button[aria-label="Copy Email"]').click();
await page.waitForTimeout(400);
const clipEmail = await page.evaluate(() => navigator.clipboard.readText());
console.log("3) email clipboard matches:", clipEmail === EMAIL, JSON.stringify(clipEmail));

await page.keyboard.press("Escape");
await page.waitForTimeout(300);

/* 4 — product sheet */
await page.locator("button", { hasText: "Tawakkal Wada" }).first().click();
await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
await page.waitForTimeout(300);
const prodTitle = await page.locator("#info-modal-title").innerText();
const prodBody = await page.locator('[role="dialog"]').innerText();
console.log("4) product sheet title:", JSON.stringify(prodTitle), "| shows full name:", prodBody.includes(PRODUCT));
await shoot("03-product-sheet");

await browser.close();
console.log(JSON.stringify({ shots, errors }, null, 2));
