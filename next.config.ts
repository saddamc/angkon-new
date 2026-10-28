import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://wsrv.nl https://images.unsplash.com https://*.fbcdn.net https://*.facebook.com https://*.google-analytics.com https://*.googletagmanager.com https://*.google.com https://*.googleapis.com https://*.gstatic.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://res.cloudinary.com https://api.resend.com https://www.facebook.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.google.com",
              "frame-src 'self' https://www.google.com https://maps.google.com https://*.google.com https://*.facebook.com",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/men", destination: "/product-category/men", permanent: false },
      { source: "/men/:subcategory", destination: "/product-category/men/:subcategory", permanent: false },
      { source: "/category/:slug", destination: "/product-category/:slug", permanent: true },
    ];
  },
  images: {
    // Custom loader: remote WordPress images are resized + converted to WebP
    // on the fly by the free wsrv.nl CDN (see src/lib/image-loader.ts).
    // This avoids Next.js downloading the full ~1MB original server-side to
    // resize it, which was slow and returned 500s. A 48px thumbnail now comes
    // back as a ~500-byte WebP instead of a 1MB PNG.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // Qualities the app is allowed to request via <Image quality={...}> (homepage hero uses 95).
    qualities: [75, 95],
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: false,
  },
};

export default nextConfig;
