import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "size-modal");
fs.mkdirSync(OUT, { recursive: true });

const env = fs.readFileSync(".env", "utf-8");
const secret = (env.match(/JWT_SECRET=([^\r\n]+)/) || [])[1].trim();
async function token() {
  const p = { sub: "saddam13bd@gmail.com", name: "S", role: "superadmin", authorizedTenants: ["primary_store"], defaultTenant: "primary_store", exp: Math.floor(Date.now() / 1000) + 3600 };
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const b = Buffer.from(JSON.stringify(p)).toString("base64");
  const d = `${h}.${b}`;
  const crypto = await import("crypto");
  return `${d}.${crypto.createHmac("sha256", secret).update(d).digest("base64")}`;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: Number(process.env.VIEW_W || 1440), height: Number(process.env.VIEW_H || 900) } });
await ctx.addCookies([{ name: "nb_admin_token", value: await token(), domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

await page.goto("http://localhost:3001/admin/products/228017/edit", { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(2500);

const trigger = page.locator("button", { hasText: /Setup Sizes & Measurements|Configure Sizes & Specs/ }).first();
await trigger.click();
await page.waitForSelector('[role="dialog"]', { timeout: 20000 });
await page.waitForTimeout(1200);

const saveBtn = page.locator('button', { hasText: "Save Measurements" }).first();
const before = await saveBtn.boundingBox();
await page.screenshot({ path: path.join(OUT, "01-before-scroll.png") });

// Scroll every scrollable container inside the dialog to the bottom.
const scrolled = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('[role="dialog"] *').forEach((el) => {
    const s = getComputedStyle(el);
    if ((s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 4) {
      el.scrollTop = el.scrollHeight;
      results.push({ tag: el.tagName, cls: el.className.slice(0, 60), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
    }
  });
  return results;
});
await page.waitForTimeout(600);

const after = await saveBtn.boundingBox();
await page.screenshot({ path: path.join(OUT, "02-after-scroll.png") });

console.log("save button before scroll:", before);
console.log("save button after  scroll:", after);
console.log("moved by (px):", before && after ? { y: Math.round(after.y - before.y) } : "n/a");
console.log("scrollable containers:", scrolled.length);
for (const s of scrolled) console.log("  ", JSON.stringify(s));

const layout = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('[role="dialog"] button')].find((b) =>
    (b.textContent || "").includes("Save Measurements")
  );
  const bar = btn?.parentElement?.parentElement;
  return {
    pageScrollWidth: document.documentElement.scrollWidth,
    pageClientWidth: document.documentElement.clientWidth,
    barScrollWidth: bar ? bar.scrollWidth : null,
    barClientWidth: bar ? bar.clientWidth : null,
    inViewport: btn ? btn.getBoundingClientRect().bottom <= window.innerHeight + 1 : null,
  };
});
console.log("layout:", JSON.stringify(layout));

await browser.close();
