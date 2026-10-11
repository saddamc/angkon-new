import fs from 'fs';
const base = 'https://gorurghash.com/wp-json';
const eps = {
  'wc-products': '/wc/store/v1/products',
  'wc-categories': '/wc/store/v1/products/categories',
  'wc-tags': '/wc/store/v1/products/tags',
  'wc-brands': '/wc/store/v1/products/brands',
  'wp-pages': '/wp/v2/pages',
  'wp-posts': '/wp/v2/posts',
  'wp-media': '/wp/v2/media',
  'wp-categories': '/wp/v2/categories',
  'wp-menus': '/wp/v2/menu-items',
};
for (const [name, ep] of Object.entries(eps)) {
  const all = [];
  for (let page = 1; page < 200; page++) {
    const r = await fetch(`${base}${ep}?per_page=100&page=${page}`);
    if (!r.ok) break;
    const j = await r.json();
    if (!Array.isArray(j) || !j.length) break;
    all.push(...j);
    if (j.length < 100) break;
  }
  fs.writeFileSync(`data/${name}.json`, JSON.stringify(all, null, 1));
  console.log(name, all.length);
}
