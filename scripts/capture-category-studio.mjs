import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "studio");
fs.mkdirSync(OUT, { recursive: true });

const env = fs.readFileSync(".env", "utf-8");
const secret = (env.match(/JWT_SECRET=([^\r\n]+)/) || [])[1].trim();
const p = { sub: "saddam13bd@gmail.com", name: "S", role: "superadmin", authorizedTenants: ["primary_store"], defaultTenant: "primary_store", exp: Math.floor(Date.now() / 1000) + 3600 };
const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
const b = Buffer.from(JSON.stringify(p)).toString("base64");
const d = `${h}.${b}`;
const crypto = await import("crypto");
const token = `${d}.${crypto.createHmac("sha256", secret).update(d).digest("base64")}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "nb_admin_token", value: token, domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

await page.goto("http://localhost:3001/admin/categories", { waitUntil: "networkidle", timeout: 180000 });
await page.waitForTimeout(2500);

await page.locator("text=Men").first().click();
await page.waitForTimeout(2000); // allow the smooth scrollIntoView to settle

async function snapshot() {
  return page.evaluate(() => {
    const saves = [...document.querySelectorAll("button")].filter((b) => /Save Changes|Create Category/.test(b.textContent || ""));
    const panel = [...document.querySelectorAll("div")].find((el) => (el.className || "").includes("sticky") && (el.className || "").includes("rounded-2xl"));
    const footerBtn = saves[saves.length - 1];
    const r = footerBtn ? footerBtn.getBoundingClientRect() : null;
    const pr = panel ? panel.getBoundingClientRect() : null;
    return {
      saveButtons: saves.length,
      panelTop: pr ? Math.round(pr.top) : null,
      panelHeight: pr ? Math.round(pr.height) : null,
      footerTop: r ? Math.round(r.top) : null,
      footerBottom: r ? Math.round(r.bottom) : null,
      viewportH: window.innerHeight,
      footerVisible: r ? r.bottom <= window.innerHeight + 1 && r.top >= 0 : null,
    };
  });
}

const onOpen = await snapshot();
await page.screenshot({ path: path.join(OUT, "01-open.png") });

// Scroll the inner content of the studio to force its body to scroll
await page.evaluate(() => {
  const panel = [...document.querySelectorAll("div")].find((el) => (el.className || "").includes("sticky") && (el.className || "").includes("rounded-2xl"));
  const body = panel?.querySelector(".overflow-y-auto");
  if (body) body.scrollTop = body.scrollHeight;
});
await page.waitForTimeout(600);
const afterInnerScroll = await snapshot();
await page.screenshot({ path: path.join(OUT, "02-inner-scroll.png") });

// Scroll the page/main container too
await page.evaluate(() => {
  document.querySelector("main")?.scrollTo(0, 99999);
});
await page.waitForTimeout(600);
const afterPageScroll = await snapshot();

console.log(JSON.stringify({ onOpen, afterInnerScroll, afterPageScroll }, null, 2));
await browser.close();
