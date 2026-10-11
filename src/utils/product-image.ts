/** Portrait-friendly remote resize for product cards / galleries (3:4 cover, not 1:1). */

export function productImageSrc(
  src: string,
  opts: { width?: number; height?: number; fit?: "cover" | "contain" } = {},
): string {
  const width = opts.width ?? 640;
  const height = opts.height ?? Math.round((width * 4) / 3);
  const fit = opts.fit ?? "cover";

  if (!src || !/^https?:\/\//i.test(src)) return src;
  if (/localhost|127\.0\.0\.1|192\.168\.|10\.\d+\./.test(src)) return src;
  if (/placehold\.co/i.test(src)) return src;
  if (/wsrv\.nl/i.test(src)) return src;

  const target = src.replace(/^https?:\/\//i, "");
  const params = new URLSearchParams({
    url: target,
    w: String(width),
    h: String(height),
    fit,
    a: "top",
    q: "80",
    output: "webp",
  });
  return `https://wsrv.nl/?${params.toString()}`;
}

export function rawProductImageSrc(src: string | undefined | null, fallback?: string): string {
  return src || fallback || "https://placehold.co/800x1000/f3f4f6/999.png?text=Product";
}
