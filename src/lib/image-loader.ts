'use client';

import { normalizeKnownCloudinaryProductUrl } from "./cloudinary-tawakkal-assets";

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
export function normalizeDeliveryDomain(domain?: string | null): string | null {
  if (!domain || typeof domain !== "string") return null;
  const trimmed = domain.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Checks whether an image URL originates from Cloudinary.
 */
export function isCloudinaryUrl(url: string, customDomain?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  if (url.includes("res.cloudinary.com") || url.includes("cloudinary.com")) return true;
  const cleanDomain = normalizeDeliveryDomain(customDomain);
  if (cleanDomain && url.includes(cleanDomain)) return true;
  // Also recognize img.angkon.net if present in source URLs from prior configuration
  if (url.includes("img.angkon.net")) return true;
  return false;
}

/**
 * Builds a clean, optimized Cloudinary delivery URL:
 * - If customDomainEnv is configured and non-empty, uses https://${customDomain}.
 * - Otherwise defaults to Cloudinary's standard delivery hostname https://res.cloudinary.com.
 * - Preserves cloud name, upload marker, asset version, folder hierarchy, and filename.
 * - Replaces or injects responsive f_auto,q_auto,dpr_auto,w_*,c_limit transformations.
 * - Prevents duplicate hostnames, duplicate /image/upload/ markers, and malformed slashes.
 */
export function buildCloudinaryDeliveryUrl(
  src: string,
  width: number,
  quality?: number,
  customDomainEnv?: string | null
): string {
  const normalized = normalizeKnownCloudinaryProductUrl(src);
  const customDomain = normalizeDeliveryDomain(customDomainEnv);
  const host = customDomain ? `https://${customDomain}` : "https://res.cloudinary.com";

  const safeWidth = Math.min(width, 1600);
  const qualityParam = quality && quality !== 75 ? `q_${quality}` : "q_auto";
  const transform = `f_auto,${qualityParam},dpr_auto,w_${safeWidth},c_limit`;

  try {
    const url = new URL(normalized);

    // Locate the upload marker (/image/upload/ or /upload/)
    let marker = "";
    let markerIdx = url.pathname.indexOf("/image/upload/");
    if (markerIdx !== -1) {
      marker = "/image/upload/";
    } else {
      markerIdx = url.pathname.indexOf("/upload/");
      if (markerIdx !== -1) marker = "/upload/";
    }

    if (markerIdx === -1) {
      // Not a standard Cloudinary upload path; return normalized
      return normalized;
    }

    let prefix = url.pathname.slice(0, markerIdx);
    const rest = url.pathname.slice(markerIdx + marker.length);

    // If prefix is missing (e.g. source was a CNAME root like https://img.angkon.net/image/upload/...)
    // and we are delivering via standard res.cloudinary.com, inject fallback cloud name so it doesn't 404
    if (!prefix && host.includes("res.cloudinary.com")) {
      const fallbackCloud =
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
        process.env.CLOUDINARY_CLOUD_NAME ||
        "drtzgyetn";
      prefix = `/${fallbackCloud}`;
    }

    // Check if the rest path starts with an existing transformation segment
    const segments = rest.split("/");
    let cleanRest = rest;
    if (
      segments.length > 1 &&
      /(?:^|,)(?:w_\d+|c_[a-z]+|q_[a-z0-9]+|f_[a-z0-9]+|dpr_[a-z0-9.]+)/i.test(segments[0])
    ) {
      cleanRest = segments.slice(1).join("/");
    }

    return `${host}${prefix}${marker}${transform}/${cleanRest}`;
  } catch {
    return normalized;
  }
}

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  const normalizedSrc = normalizeKnownCloudinaryProductUrl(src);
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
