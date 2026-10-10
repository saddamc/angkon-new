import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: false,
  },
};

export default nextConfig;
