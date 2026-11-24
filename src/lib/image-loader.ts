'use client';

import { normalizeKnownCloudinaryProductUrl } from "./cloudinary-tawakkal-assets";

// Custom Next.js image loader — routes remote (WordPress) images through the
// free wsrv.nl image CDN, which resizes + converts to WebP on the fly.
//
// Cloudinary images use native Cloudinary on-the-fly transformations:
// f_auto,q_auto,dpr_auto,w_${safeWidth},c_limit
//
// Supports optional custom branded delivery domain (e.g. img.angkon.net).
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
  const customDomain = process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN?.trim();
  const isCloudinary =
    normalizedSrc.includes("res.cloudinary.com") ||
    normalizedSrc.includes("img.angkon.net") ||
    Boolean(customDomain && normalizedSrc.includes(customDomain));

  if (isCloudinary) {
    const safeWidth = Math.min(width, 1600);
    // Explicit quality override (e.g. 95 for hero) or perceptual q_auto
    const qualityParam = quality && quality !== 75 ? `q_${quality}` : "q_auto";
    const transform = `f_auto,${qualityParam},dpr_auto,w_${safeWidth},c_limit`;

    let transformedUrl = normalizedSrc;

    if (!transformedUrl.includes("/w_") && transformedUrl.includes("/upload/")) {
      transformedUrl = transformedUrl.replace("/upload/", `/upload/${transform}/`);
    } else if (transformedUrl.includes("/upload/")) {
      transformedUrl = transformedUrl.replace(/\/upload\/[^/]+\//, `/upload/${transform}/`);
    }

    // Rewrite to custom delivery domain if configured and verified
    if (customDomain && transformedUrl.includes("res.cloudinary.com")) {
      transformedUrl = transformedUrl.replace(
        /^https?:\/\/res\.cloudinary\.com\/[^/]+/,
        `https://${customDomain}`
      );
    }

    return transformedUrl;
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
