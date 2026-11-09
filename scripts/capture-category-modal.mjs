import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Visual check for the Create Main Category modal.
 * Opens the modal and measures it — never submits, so no records change.
 */

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "cat-modal");
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

async function run(width, height, tag) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addCookies([{ name: "nb_admin_token", value: token, domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();

  await page.goto("http://localhost:3001/admin/categories", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(2000);

  await page.locator("button", { hasText: "Add Category" }).first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 20000 });
  await page.waitForTimeout(600);

  const dialog = page.locator('[role="dialog"]').first();
  const box = await dialog.boundingBox();

  const kids = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return null;
    const r = dlg.getBoundingClientRect();
    const body = dlg.querySelector(".overflow-y-auto");
    const footer = dlg.querySelector("footer") ||
      [...dlg.querySelectorAll("div")].find((el) => el.className.includes("border-t") && el.className.includes("shrink-0"));
    return {
      dialog: { w: Math.round(r.width), h: Math.round(r.height) },
      viewport: { w: window.innerWidth, h: window.innerHeight },
      bodyScrolls: body ? body.scrollHeight > body.clientHeight + 2 : null,
      footerVisible: footer ? footer.getBoundingClientRect().bottom <= window.innerHeight + 1 : null,
      hasSlug: /url slug/i.test(dlg.innerText),
      hasOrder: /display order/i.test(dlg.innerText),
    };
  });

  const file = path.join(OUT, `${tag}.png`);
  await page.screenshot({ path: file });

  // Expand the optional SEO block for a second shot
  await page.locator('[role="dialog"] button', { hasText: "Description / SEO subtitle" }).first().click();
  await page.waitForTimeout(400);
  const seoFile = path.join(OUT, `${tag}-seo.png`);
  await page.screenshot({ path: seoFile });

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const closed = (await page.locator('[role="dialog"]').count()) === 0;

  await ctx.close();
  return { tag, box, ...kids, closedByEscape: closed, files: [file, seoFile] };
}

const desktop = await run(1440, 900, "desktop");
const mobile = await run(430, 820, "mobile");

console.log(JSON.stringify({ desktop, mobile }, null, 2));
await browser.close();
