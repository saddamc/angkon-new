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
