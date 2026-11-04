import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Verifies:
 *  - a delivered (completed) order is no longer locked
 *  - selecting "Delivered" on an unpaid order opens the payment confirmation
 *  - the dialog is accessible and Escape closes it
 *
 * Nothing is submitted: the script opens the confirmation and backs out.
 */

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "orders-payment-modal");
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
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:3001/admin/orders", { waitUntil: "networkidle", timeout: 120000 });
await page.waitForSelector("text=ORDER NO & DATE", { timeout: 60000 });
await page.waitForTimeout(2000);

// Every status pill with a "Click to change status" tooltip is editable —
// this now includes delivered orders.
const editable = await page.locator('span[title="Click to change status"]').count();
const locked = await page.locator('span[title^="Status is locked"]').count();
console.log("editable status pills:", editable, "| locked:", locked);

// Open the unpaid (pending) order's status dialog
await page
  .locator('span[title="Click to change status"]')
  .filter({ hasText: /^pending$/i })
  .first()
  .click();
await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
await page.waitForTimeout(300);

// Choose Delivered
await page.locator('[role="dialog"] button', { hasText: /Delivered/ }).first().click();
await page.waitForTimeout(200);

// Confirm -> must open the payment confirmation, not apply the change
await page.locator('[role="dialog"] button', { hasText: /Confirm Status Change/ }).click();
await page.waitForSelector('[role="alertdialog"]', { timeout: 15000 });
await page.waitForTimeout(400);

const alertTitle = await page.locator("#payment-modal-title").innerText().catch(() => "");
console.log("alert dialog title:", JSON.stringify(alertTitle));
await shoot(page, "01-payment-required");

// Back out — no data is changed
await page.locator('[role="alertdialog"] button', { hasText: /Go back/ }).click();
await page.waitForTimeout(300);
const alertsLeft = await page.locator('[role="alertdialog"]').count();
console.log("alert dialogs after Go back:", alertsLeft);

// Close the status dialog with Escape
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
const dialogsLeft = await page.locator('[role="dialog"]').count();
console.log("dialogs after Escape:", dialogsLeft);

await shoot(page, "02-closed");

await browser.close();
console.log(JSON.stringify({ shots, errors, editable, locked, alertTitle, alertsLeft, dialogsLeft }, null, 2));
