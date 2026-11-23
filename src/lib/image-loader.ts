'use client';

import { normalizeKnownCloudinaryProductUrl } from "./cloudinary-tawakkal-assets";

// Custom Next.js image loader — routes remote (WordPress) images through the
// free wsrv.nl image CDN, which resizes + converts to WebP on the fly.
//
// Why: the WordPress origin (netbazarbd.net) serves large, slow images
// (~1MB PNGs at ~150KB/s). Instead of Next.js downloading the full original
// server-side to resize it (which timed out → 500), wsrv.nl fetches the
// original once, caches it, and returns a tiny optimized image. A 1MB PNG
// asked for at 48px comes back as a ~500-byte WebP.
//
// Local /public assets and localhost URLs are returned untouched — the CDN
// can't reach them, and they're already small.

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  const normalizedSrc = normalizeKnownCloudinaryProductUrl(src);
  const q = quality ?? 75;

  // Only proxy publicly reachable remote images through the CDN.
  const isRemote = /^https?:\/\//i.test(normalizedSrc);
  const isLocalhost = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\./.test(normalizedSrc);

  // Cloudinary images: use native Cloudinary on-the-fly resizing and auto-format (WebP/AVIF)
  if (normalizedSrc.includes("res.cloudinary.com")) {
    const safeWidth = Math.min(width, 1600);
    if (!normalizedSrc.includes("/w_") && normalizedSrc.includes("/upload/")) {
      return normalizedSrc.replace("/upload/", `/upload/w_${safeWidth},q_${q},f_auto/`);
    }
    return normalizedSrc.replace(/\/w_\d+/, `/w_${safeWidth}`);
  }

  if (isRemote && !isLocalhost) {
    // wsrv.nl expects the target URL without its own protocol prefix.
    const target = normalizedSrc.replace(/^https?:\/\//i, "");
    // Cap width at 1080 to prevent requesting massive 4K (3840px) upscales that take 1.8s+ to process
    const safeWidth = Math.min(width, 1080);
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=${safeWidth}&q=${q}&output=webp`;
  }

  // Local/public or dev-network image — served directly, but the width must
  // still be reflected in the URL or Next.js can't confirm the loader
  // actually resizes per-width and logs a "missing loader width" warning.
  const separator = normalizedSrc.includes("?") ? "&" : "?";
  return `${normalizedSrc}${separator}w=${width}`;
}
