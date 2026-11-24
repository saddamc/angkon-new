"use client";

import { normalizeKnownCloudinaryProductUrl } from "./cloudinary-tawakkal-assets";
import {
  buildCloudinaryDeliveryUrl,
  isCloudinaryUrl,
  normalizeDeliveryDomain,
} from "./cloudinary-delivery";

export { buildCloudinaryDeliveryUrl, isCloudinaryUrl, normalizeDeliveryDomain } from "./cloudinary-delivery";

// Custom Next.js image loader — routes remote (WordPress) images through the
// free wsrv.nl image CDN, which resizes + converts to WebP on the fly.
//
// Cloudinary images use native Cloudinary on-the-fly transformations:
// f_auto,q_auto,dpr_auto,w_${safeWidth},c_limit
//
// Supports optional custom branded delivery domain (e.g. img.angkon.net).
// When NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN is unset or empty, Cloudinary's
// standard delivery hostname (https://res.cloudinary.com) is used.
//
// Local /public assets and localhost URLs are returned untouched — the CDN
// can't reach them, and they're already small.

export interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

/**
 * Normalizes a custom delivery domain string:
 * - Returns null if undefined, empty, or whitespace-only.
 * - Strips leading protocols (http:// or https://) and trailing slashes.
 */
export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  const normalizedSrc = normalizeKnownCloudinaryProductUrl(src);
  if (normalizedSrc.startsWith("blob:") || normalizedSrc.startsWith("data:")) {
    return normalizedSrc;
  }
  const q = quality ?? 75;

  // Only proxy publicly reachable remote images through the CDN.
  const isRemote = /^https?:\/\//i.test(normalizedSrc);
  const isLocalhost = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\./.test(normalizedSrc);

  const customDomainEnv = process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN;

  // Cloudinary images: use native Cloudinary on-the-fly resizing and auto-format (WebP/AVIF)
  if (isCloudinaryUrl(normalizedSrc, customDomainEnv)) {
    return buildCloudinaryDeliveryUrl(normalizedSrc, width, quality, customDomainEnv);
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
