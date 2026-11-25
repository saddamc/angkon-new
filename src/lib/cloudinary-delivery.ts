import { normalizeKnownCloudinaryProductUrl } from "./cloudinary-tawakkal-assets";

const KNOWN_CUSTOM_DELIVERY_DOMAINS = new Set([
  "img.angkon.net",
  "images.angkon.net",
  "images.nexcraftly.com",
]);

export function normalizeDeliveryDomain(domain?: string | null): string | null {
  if (!domain || typeof domain !== "string") return null;
  const cleaned = domain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return cleaned || null;
}

export function isCloudinaryUrl(url: string, customDomain?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  if (url.includes("res.cloudinary.com") || url.includes("cloudinary.com")) return true;
  const hostname = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  const configured = normalizeDeliveryDomain(customDomain)?.toLowerCase();
  return Boolean(hostname && (hostname === configured || KNOWN_CUSTOM_DELIVERY_DOMAINS.has(hostname)));
}

/** Build one safe, responsive Cloudinary delivery URL without changing its public ID. */
export function buildCloudinaryDeliveryUrl(
  src: string,
  width: number,
  quality?: number,
  customDomainEnv?: string | null,
): string {
  const normalized = normalizeKnownCloudinaryProductUrl(src);
  const customDomain = normalizeDeliveryDomain(customDomainEnv);
  const host = customDomain ? `https://${customDomain}` : "https://res.cloudinary.com";
  const safeWidth = Math.min(Math.max(Math.round(width) || 1, 1), 1600);
  const qualityParam = quality && quality !== 75 ? `q_${quality}` : "q_auto";
  const transform = `f_auto,${qualityParam},dpr_auto,w_${safeWidth},c_limit`;

  try {
    const url = new URL(normalized);
    const markerMatch = url.pathname.match(/\/image\/upload\//) || url.pathname.match(/\/upload\//);
    if (!markerMatch || markerMatch.index === undefined) return normalized;

    const marker = markerMatch[0];
    const markerIdx = markerMatch.index;
    const sourcePrefix = url.pathname.slice(0, markerIdx);
    const rest = url.pathname.slice(markerIdx + marker.length);
    // Custom delivery hostnames use /image/upload/... and do not include the cloud name.
    // Standard res.cloudinary.com URLs require /<cloud_name>/image/upload/....
    let prefix = customDomain ? "" : sourcePrefix;
    if (!customDomain && !prefix) {
      const cloudName =
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
        process.env.CLOUDINARY_CLOUD_NAME?.trim();
      if (!cloudName) return normalized;
      prefix = `/${cloudName}`;
    }

    const segments = rest.split("/");
    const cleanRest =
      segments.length > 1 && /(?:^|,)(?:w_\d+|c_[a-z]+|q_[a-z0-9]+|f_[a-z0-9]+|dpr_[a-z0-9.]+)/i.test(segments[0])
        ? segments.slice(1).join("/")
        : rest;

    return `${host}${prefix}${marker}${transform}/${cleanRest}`;
  } catch {
    return normalized;
  }
}
