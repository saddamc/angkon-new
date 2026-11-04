import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Visual check for the orders list (size + truthful payment badge) and the
 * status dialog (header, close button, Escape).
 */

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "orders-modal");
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
await page.waitForTimeout(2500);

await shoot(page, "01-orders-list");

// Does the row show a size?
const sizeText = await page.locator("text=/Size[s]?:/").first().innerText().catch(() => "");
console.log("size text:", JSON.stringify(sizeText));

// Payment badge in the first row
const paid = await page.locator("button, span").filter({ hasText: /^Paid$|^Unpaid$/ }).count();
console.log("payment badges found:", paid);

// Open the status dialog from the first NON-FINAL row — those spans carry a
// "Click to change status" tooltip; final statuses are intentionally locked.
const statusTrigger = page.locator('span[title="Click to change status"]').first();
await statusTrigger.click({ timeout: 15000 });
await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
await page.waitForTimeout(400);
await shoot(page, "02-status-dialog");

const hasCloseLabel = await page.locator('[role="dialog"] button[aria-label="Close dialog"]').count();
console.log("close button with aria-label:", hasCloseLabel);

await page.keyboard.press("Escape");
await page.waitForTimeout(400);
const stillOpen = await page.locator('[role="dialog"]').count();
console.log("dialog open after Escape:", stillOpen);

await shoot(page, "03-after-escape");

await browser.close();
console.log(JSON.stringify({ shots, errors, sizeText, hasCloseLabel, stillOpen }, null, 2));
