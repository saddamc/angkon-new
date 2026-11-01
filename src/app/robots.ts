import type { MetadataRoute } from "next";

/**
 * Production Robots Configuration for ANGKON E-Commerce
 * Canonical Production Host: https://www.angkon.net
 * Reference: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.angkon.net";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api",
          "/api/",
          "/cart",
          "/cart/",
          "/cart-2",
          "/checkout",
          "/checkout/",
          "/checkout-2",
          "/my-account",
          "/my-account/",
          "/my-account-2",
          "/thankyou-for-shopping",
          "/search",
          "/search/",
          "/wishlist",
          "/wishlist/",
          "/*?*test_event_code=*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
