import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "cat-thumbs");
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

const thumbs = await page.evaluate(() =>
  [...document.querySelectorAll("img")]
    .filter((img) => img.currentSrc.includes("/banners/"))
    .map((img) => ({
      src: img.currentSrc.replace(location.origin, ""),
      loaded: img.complete && img.naturalWidth > 0,
      box: `${img.clientWidth}x${img.clientHeight}`,
    }))
);
console.log("banner thumbnails:", JSON.stringify(thumbs, null, 2));

const file = path.join(OUT, "categories-thumbs.png");
await page.screenshot({ path: file, clip: { x: 250, y: 90, width: 900, height: 520 } });
console.log("screenshot:", file);

await browser.close();
