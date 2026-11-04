import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Verifies the four behaviours without touching the database:
 *  1. a normal status change closes the dialog automatically
 *  2. delivering an unpaid order asks for payment first
 *  3. moving a PAID order back to pending asks to undo the payment
 *  4. the dialogs are accessible and Escape works
 *
 * The orders API is mocked in the browser, so nothing is written anywhere.
 */

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "orders-dialogs");
fs.mkdirSync(OUT, { recursive: true });

const env = fs.readFileSync(".env", "utf-8");
const secret = (env.match(/JWT_SECRET=([^\r\n]+)/) || [])[1]?.trim() || "angkon_secure_jwt_secret_2026";

async function token() {
  const payload = {
    sub: "saddam13bd@gmail.com",
    name: "Saddam Superadmin",
    role: "superadmin",
    authorizedTenants: ["angkon-main", "primary_store"],
    defaultTenant: "primary_store",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const b = Buffer.from(JSON.stringify(payload)).toString("base64");
  const d = `${h}.${b}`;
  const crypto = await import("crypto");
  return `${d}.${crypto.createHmac("sha256", secret).update(d).digest("base64")}`;
}

const base = {
  date_created: "2026-11-02T10:00:00Z",
  payment_method_title: "Cash on Delivery",
  billing: { first_name: "Customer", last_name: "", email: "c@example.com", phone: "+8801700000000", address_1: "Road 1", city: "Dhaka" },
  line_items: [{ name: "Tawakkal Wada", quantity: 1, size: "M", price: "4500" }],
};

const MOCK = [
  { ...base, id: 9001, number: "ANG-9001", status: "completed", paymentStatus: "paid", payment_status: "paid", total: "8110", billing: { ...base.billing, first_name: "Paid Customer" } },
  { ...base, id: 9002, number: "ANG-9002", status: "pending", paymentStatus: "pending", payment_status: "pending", total: "4500", billing: { ...base.billing, first_name: "Unpaid Customer" } },
];

const shots = [];
async function shoot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  shots.push(file);
  console.log(`  saved ${file}`);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
await ctx.addCookies([{ name: "nb_admin_token", value: await token(), domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.route("**/api/admin/orders/*", async (route) => {
  if (route.request().method() === "PATCH") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  }
  return route.continue();
});

await page.route("**/api/admin/orders?*", async (route) => {
  if (route.request().method() !== "GET") return route.continue();
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ orders: MOCK, total: MOCK.length, totalPages: 1 }),
  });
});

async function reload() {
  await page.goto("http://localhost:3001/admin/orders", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector("text=ORDER NO & DATE", { timeout: 60000 });
  await page.waitForTimeout(1200);
}

async function openStatusFor(orderNumber) {
  const row = page.locator("div.group").filter({ hasText: orderNumber }).first();
  await row.locator('span[title="Click to change status"]').first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
  await page.waitForTimeout(250);
}

/* 1 — normal change auto-closes */
await reload();
await openStatusFor("ANG-9002");
await page.locator('[role="dialog"] button', { hasText: /^Confirmed/ }).first().click();
await page.locator('[role="dialog"] button', { hasText: "Update status" }).click();
await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 20000 });
console.log("1) normal change auto-closed the dialog: true");

/* 2 — delivering an unpaid order asks for payment */
await reload();
await openStatusFor("ANG-9002");
await page.locator('[role="dialog"] button', { hasText: /^Delivered/ }).first().click();
await page.locator('[role="dialog"] button', { hasText: "Update status" }).click();
await page.waitForSelector('[role="alertdialog"]', { timeout: 15000 });
const payTitle = await page.locator("#payment-modal-title").innerText();
console.log("2) payment dialog:", JSON.stringify(payTitle));
await shoot(page, "01-payment-required");
await page.locator('[role="alertdialog"] button', { hasText: "Go back" }).click();
await page.waitForTimeout(200);

/* 3 — paid order back to pending asks to undo payment */
await reload();
await openStatusFor("ANG-9001");
await page.locator('[role="dialog"] button', { hasText: /^Pending/ }).first().click();
await page.locator('[role="dialog"] button', { hasText: "Update status" }).click();
await page.waitForSelector('[role="alertdialog"]', { timeout: 15000 });
const revertTitle = await page.locator("#warning-modal-title").innerText();
const revertBody = await page.locator('[role="alertdialog"]').innerText();
console.log("3) revert dialog:", JSON.stringify(revertTitle));
console.log("   mentions undo:", /undo payment/i.test(revertBody));
await shoot(page, "02-undo-payment");
await page.locator('[role="alertdialog"] button', { hasText: "Go back" }).click();
await page.waitForTimeout(200);

/* 4 — Escape closes the status dialog */
const openAfterBack = await page.locator('[role="dialog"]').count();
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
const openAfterEsc = await page.locator('[role="dialog"]').count();
console.log("4) status dialog open before Escape:", openAfterBack, "after:", openAfterEsc);

await shoot(page, "03-status-dialog");

await browser.close();
console.log(JSON.stringify({ shots, errors, payTitle, revertTitle }, null, 2));
