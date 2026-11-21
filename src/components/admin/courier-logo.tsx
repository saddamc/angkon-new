import React from "react";

export type CourierProviderKey = "steadfast" | "pathao" | "redx" | "ecourier" | string;

export interface CourierLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  xs: "h-3.5 w-3.5",
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
};

/**
 * Authentic Steadfast Courier vector brand mark
 * Signature colors: Deep Indigo / Violet (#4F46E5, #6D28D9) with dynamic courier wing glyph
 */
export function SteadfastLogo({ size = "md", className = "", ...props }: CourierLogoProps) {
  const sizeClass = SIZE_MAP[size] || "h-8 w-8";
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} shrink-0 ${className}`}
      aria-label="Steadfast Courier Logo"
      role="img"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="url(#steadfast-grad)" />
      {/* Dynamic aerodynamic forward courier wings */}
      <path
        d="M9 25.5L18.5 13H31L22.5 25.5H9Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M13.5 28L20 18.5H29L22.5 28H13.5Z"
        fill="#A78BFA"
      />
      <circle cx="27" cy="14" r="2.5" fill="#34D399" />
      <defs>
        <linearGradient id="steadfast-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5B21B6" />
          <stop offset="0.5" stopColor="#6D28D9" />
          <stop offset="1" stopColor="#4C1D95" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Authentic Pathao vector brand mark
 * Signature colors: Pathao Red (#E62232 / #ED1C24) with iconic speed wing / helmet geometry
 */
export function PathaoLogo({ size = "md", className = "", ...props }: CourierLogoProps) {
  const sizeClass = SIZE_MAP[size] || "h-8 w-8";
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} shrink-0 ${className}`}
      aria-label="Pathao Logistics Logo"
      role="img"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="url(#pathao-grad)" />
      {/* Pathao dynamic kite / winged motion glyph */}
      <path
        d="M12 28.5L20 10.5L28 28.5L20 23.5L12 28.5Z"
        fill="white"
      />
      <path
        d="M20 10.5L28 28.5L20 23.5V10.5Z"
        fill="#FCA5A5"
        fillOpacity="0.85"
      />
      <defs>
        <linearGradient id="pathao-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EF4444" />
          <stop offset="0.6" stopColor="#E62232" />
          <stop offset="1" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Authentic RedX vector brand mark
 * Signature colors: Bold Black & RedX Vermillion (#DA291C) with dynamic winged "X"
 */
export function RedxLogo({ size = "md", className = "", ...props }: CourierLogoProps) {
  const sizeClass = SIZE_MAP[size] || "h-8 w-8";
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} shrink-0 ${className}`}
      aria-label="RedX Delivery Logo"
      role="img"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="#18181B" />
      {/* Stylized RedX dynamic 'X' courier wing */}
      <path
        d="M11 11L18 20L11 29H16.5L20.5 23.5L24.5 29H30L23 20L29.5 11H24L20.5 16.5L16.5 11H11Z"
        fill="url(#redx-grad)"
      />
      <path
        d="M20.5 16.5L24 11H29.5L23 20L20.5 16.5Z"
        fill="#EF4444"
      />
      <defs>
        <linearGradient id="redx-grad" x1="11" y1="11" x2="30" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3B30" />
          <stop offset="0.5" stopColor="#DA291C" />
          <stop offset="1" stopColor="#991B1B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * eCourier brand mark fallback
 */
export function EcourierLogo({ size = "md", className = "", ...props }: CourierLogoProps) {
  const sizeClass = SIZE_MAP[size] || "h-8 w-8";
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} shrink-0 ${className}`}
      aria-label="eCourier Logo"
      role="img"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="url(#ecourier-grad)" />
      <circle cx="20" cy="20" r="10" stroke="white" strokeWidth="2.5" />
      <path d="M16 20H24M20 16L24 20L20 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="ecourier-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284C7" />
          <stop offset="1" stopColor="#0369A1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Unified Courier Logo Component
 */
export function CourierLogo({
  provider,
  size = "md",
  className = "",
  ...props
}: {
  provider?: CourierProviderKey | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
} & React.SVGProps<SVGSVGElement>) {
  const norm = (provider || "").toLowerCase();

  switch (norm) {
    case "steadfast":
      return <SteadfastLogo size={size} className={className} {...props} />;
    case "pathao":
      return <PathaoLogo size={size} className={className} {...props} />;
    case "redx":
      return <RedxLogo size={size} className={className} {...props} />;
    case "ecourier":
      return <EcourierLogo size={size} className={className} {...props} />;
    default:
      return <SteadfastLogo size={size} className={className} {...props} />;
  }
}
