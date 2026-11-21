"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

interface ProductThumbnailProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  iconClassName?: string;
}

/**
 * Handles product thumbnails gracefully.
 * If an image fails to load (HTTP 404, Cloudinary error, deleted asset, etc.),
 * it catches onError and renders a clean, branded purple placeholder.
 */
export function ProductThumbnail({
  src,
  alt,
  size = 36,
  className = "h-9 w-9",
  iconClassName = "h-3.5 w-3.5",
}: ProductThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever the image source URL changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const validSrc = src && typeof src === "string" && src.trim().length > 0 ? src.trim() : null;

  if (!validSrc || hasError) {
    return (
      <div
        className={`${className} rounded-lg bg-purple-50/60 border border-purple-100/80 flex items-center justify-center text-purple-400 shrink-0 select-none shadow-2xs`}
        title={alt || "Product image placeholder"}
        aria-label={alt || "Product image placeholder"}
      >
        <Package className={`${iconClassName} stroke-[1.75]`} />
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-lg overflow-hidden bg-stone-50 border border-stone-200/90 shrink-0 relative`}
    >
      <Image
        src={validSrc}
        alt={alt || "Product thumbnail"}
        width={size}
        height={size}
        className="h-full w-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
