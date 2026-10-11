import fs from 'fs';
import path from 'path';
const media = JSON.parse(fs.readFileSync('data/wp-media.json', 'utf8'));
const urls = [...new Set(media.map((m) => m.source_url).filter(Boolean))];
fs.mkdirSync('media', { recursive: true });
let i = 0, ok = 0, fail = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < urls.length) {
    const u = urls[i++];
    const file = path.join('media', new URL(u).pathname.split('/').slice(-3).join('_'));
    if (fs.existsSync(file)) { ok++; continue; }
    try {
      const r = await fetch(u);
      if (!r.ok) throw new Error(r.status);
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      ok++;
    } catch { fail++; }
  }
}));
console.log('media', urls.length, 'ok', ok, 'fail', fail);
