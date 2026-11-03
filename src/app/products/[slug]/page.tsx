import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/services/products.service";
import { ProductDetailsView } from "@/components/product/product-details-view";
import { ProductSection } from "@/components/sections/product-section";
import { decodeEntities } from "@/utils/html";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { sanitizeProductHtml } from "@/lib/security/sanitize-product-html";
import { getProductSeo } from "@/config/product-seo";

export const revalidate = 60;

interface ProductDetailsProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailsProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | Angkon",
      description: "The requested luxury garment could not be found.",
    };
  }

  const seoEntry = getProductSeo(product);
  const primaryImage = product.images?.[0]?.src || "/banners/HERO1.webp";
  const ogImages =
    product.images && product.images.length > 0
      ? product.images.slice(0, 4).map((img, idx) => ({
          url: img.src,
          width: 1200,
          height: 1200,
          alt: idx === 0 ? seoEntry.imageAlt : img.alt || `${product.name} View ${idx + 1}`,
        }))
      : [{ url: primaryImage, width: 1200, height: 1200, alt: seoEntry.imageAlt }];

  const currentPrice = product.price || product.sale_price || product.regular_price || "0";

  return {
    title: {
      absolute: seoEntry.seoTitle,
    },
    description: seoEntry.seoDescription,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} — BDT ${currentPrice}`,
      description: seoEntry.seoDescription,
      url: `/products/${product.slug}`,
      siteName: "Angkon — House of Modern Heritage",
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — BDT ${currentPrice}`,
      description: seoEntry.seoDescription,
      images: [primaryImage],
    },
    other: {
      "product:price:amount": currentPrice,
      "product:price:currency": "BDT",
      "product:availability": product.stock_status === "instock" ? "in stock" : "out of stock",
      "product:retailer_item_id": String(product.id),
      "product:item_group_id": String(product.id),
    },
  };
}

export default async function ProductDetailsPage({ params }: ProductDetailsProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product);

  const primaryImage = product.images?.[0]?.src || "";
  const currentPrice = product.price || product.sale_price || product.regular_price || "0";
  const inStock = product.stock_status === "instock";

  const rawDescription = product.short_description || product.description || "";
  const cleanDescription = decodeEntities(
    rawDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  );

  const categoryName = product.categories?.[0]?.name || "Ethnic Wear";
  const categorySlug = product.categories?.[0]?.slug || "women/ethnic-wear";

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images?.map((img) => img.src) || [primaryImage],
    description: cleanDescription || product.name,
    productID: String(product.id),
    sku: String(product.id),
    mpn: product.sku || String(product.id),
    category: categoryName,
    brand: {
      "@type": "Brand",
      name: "ANGKON",
    },
    offers: {
      "@type": "Offer",
      url: `https://www.angkon.net/products/${product.slug}`,
      priceCurrency: "BDT",
      price: currentPrice,
      priceValidUntil: "2027-12-31",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "ANGKON",
        url: "https://www.angkon.net",
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BD",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 2,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "BDT",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "BD",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "d",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 5,
            unitCode: "d",
          },
        },
      },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.angkon.net",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryName,
        item: `https://www.angkon.net/product-category/${categorySlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `https://www.angkon.net/products/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      <ProductDetailsView
        product={{
          ...product,
          // Product copy is stored HTML rendered with dangerouslySetInnerHTML
          // inside the client view — sanitise it on the server so the browser
          // never receives markup we have not vetted.
          description: sanitizeProductHtml(product.description),
          short_description: sanitizeProductHtml(product.short_description),
        }}
      />
      {relatedProducts.length > 0 && (
        <div className="container pb-16">
          <h2 className="mb-8 font-heading text-2xl font-black uppercase text-white sm:text-3xl">
            You May Also Like
          </h2>
          <ProductSection title="" products={relatedProducts} />
        </div>
      )}
    </>
  );
}
