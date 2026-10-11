import fs from 'fs';
const base = 'https://gorurghash.com/wp-json';
const eps = {
  'wp-pages': '/wp/v2/pages',
  'wp-posts': '/wp/v2/posts',
  'wp-media': '/wp/v2/media',
  'wp-categories': '/wp/v2/categories',
};
for (const [name, ep] of Object.entries(eps)) {
  const all = [];
  try {
    for (let page = 1; page < 200; page++) {
      const r = await fetch(`${base}${ep}?per_page=100&page=${page}`);
      const t = await r.text();
      let j; try { j = JSON.parse(t); } catch { console.log(name, 'non-JSON', r.status, t.slice(0, 80).replace(/\s+/g,' ')); break; }
      if (!Array.isArray(j) || !j.length) break;
      all.push(...j);
      if (j.length < 100) break;
    }
  } catch (e) { console.log(name, 'err', String(e).slice(0, 100)); }
  if (all.length) fs.writeFileSync(`data/${name}.json`, JSON.stringify(all, null, 1));
  console.log(name, all.length);
}
