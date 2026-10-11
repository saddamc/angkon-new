import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const types = ['page', 'post', 'product_cat', 'product', 'product_tag', 'category'];
const CONCURRENCY = 4;

const slugFor = (u) => {
  const p = new URL(u).pathname.replace(/^\/|\/$/g, '') || 'home';
  return p.replace(/[^\w-]+/g, '_');
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const log = [];

async function shoot(type, url) {
  const dir = path.join('site', type);
  fs.mkdirSync(dir, { recursive: true });
  const name = slugFor(url);
  if (fs.existsSync(path.join(dir, name + '.png'))) return;
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    // trigger lazy-loaded images
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    fs.writeFileSync(path.join(dir, name + '.html'), await page.content());
    await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: true });
    log.push({ type, url, ok: true });
  } catch (e) {
    log.push({ type, url, ok: false, error: String(e).slice(0, 200) });
  } finally {
    await page.close();
  }
}

for (const type of types) {
  const urls = [...new Set(fs.readFileSync(`urls-${type}.txt`, 'utf8').split('\n').filter(Boolean))];
  console.log(type, urls.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < urls.length) {
        const u = urls[i++];
        await shoot(type, u);
        if (i % 20 === 0) console.log(`  ${type} ${i}/${urls.length}`);
      }
    })
  );
}
fs.writeFileSync('crawl-log.json', JSON.stringify(log, null, 2));
console.log('done', log.filter((l) => !l.ok).length, 'failed');
await browser.close();
