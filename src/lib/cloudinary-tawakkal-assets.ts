/**
 * Current Cloudinary public IDs for the Tawakkal Wada product galleries.
 *
 * Older catalog records point at a deleted `ANGKON/WOMEN/ETHNIC/.../N.jpg`
 * hierarchy. The current assets were re-uploaded under
 * `ANGKON/ETHNIC_WEAR/TAWAKKAL_WADA/<slug>/file_*.webp`.
 */
const CURRENT_ASSET_BY_LEGACY_IMAGE: Record<string, Record<string, string>> = {
  "tawakkal-wada-midnight-black": {
    "1": "file_ckspkm",
    "3": "file_rlbrdo",
    "4": "file_a8tmjy",
    "5": "file_dfjumo",
    "6": "file_r1smmx",
    "7": "file_sksnxg",
  },
  "tawakkal-wada-deep-emerald-green": {
    "1": "file_xzi44h",
    "2": "file_aobxcj",
    "3": "file_jit2td",
    "4": "file_mheez4",
    "5": "file_hmj1oi",
  },
  "tawakkal-wada-dark-coffee-brown": {
    "1": "file_x3xe7t",
    "2": "file_xjzh73",
    "3": "file_ifz0b1",
    "4": "file_mopmi1",
    "5": "file_qy5dnf",
  },
  "tawakkal-wada-royal-navy-blue": {
    "1": "file_ztvclh",
    "2": "file_fkykan",
    "3": "file_fyhrvm",
    "4": "file_mkk70s",
    "5": "file_nxdlak",
  },
  "tawakkal-wada-deep-plum-purple": {
    "1": "file_zgjz1y",
    "2": "file_m7dssn",
    "3": "file_po9f9r",
    "4": "file_e2jndi",
    "5": "file_fsxg7i",
    "6": "file_otlpdu",
    "7": "file_r5b3nv",
  },
  "tawakkal-wada-deep-teal-blue": {
    "1": "file_vx4rih",
    "2": "file_lawaqx",
    "3": "file_jooyuw",
    "4": "file_wlh78q",
    "5": "file_cda7ap",
    "6": "file_ry2apk",
  },
  "tawakkal-wada-deep-raspberry-magenta": {
    "1": "file_htdfwj",
    "2": "file_sfzo6k",
  },
};

function getAsset(slug: string, imageNumber: string): string | null {
  return CURRENT_ASSET_BY_LEGACY_IMAGE[slug.toLowerCase()]?.[imageNumber] ?? null;
}

function canonicalAssetUrl(source: string, slug: string, assetId: string): string {
  const cloudName = source.match(/^https?:\/\/res\.cloudinary\.com\/([^/]+)\//i)?.[1];
  if (!cloudName) return source;
  return `https://res.cloudinary.com/${cloudName}/image/upload/ANGKON/ETHNIC_WEAR/TAWAKKAL_WADA/${slug}/${assetId}.webp`;
}

/** Rewrites a legacy versioned Tawakkal Wada URL when it references a moved asset. */
export function normalizeKnownCloudinaryProductUrl(source: string): string {
  if (!source || !source.includes("res.cloudinary.com")) return source;
  const match = source.match(/\/(tawakkal-wada-[a-z0-9-]+)\/(\d+)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  if (!match) return source;
  const slug = match[1].toLowerCase();
  const assetId = getAsset(slug, match[2]);
  return assetId ? canonicalAssetUrl(source, slug, assetId) : source;
}

/** Normalizes a product image and its optional public_id using the product slug. */
export function normalizeTawakkalWadaImageReference<T extends { src: string; public_id?: string }>(
  slugInput: string,
  image: T
): T {
  const slug = String(slugInput || "").toLowerCase();
  const images = CURRENT_ASSET_BY_LEGACY_IMAGE[slug];
  if (!images) return image;

  const legacyReference = String(image.public_id || image.src || "");
  const match = legacyReference.match(/(?:^|\/)(\d+)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  if (!match) return image;

  const assetId = getAsset(slug, match[1]);
  if (!assetId) return image;

  const source = image.src || image.public_id || "";
  const src = canonicalAssetUrl(source, slug, assetId);
  const public_id = `ANGKON/ETHNIC_WEAR/TAWAKKAL_WADA/${slug}/${assetId}`;
  return { ...image, src, ...(image.public_id !== undefined ? { public_id } : {}) };
}
