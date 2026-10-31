import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/services/products.service";
import { ProductDetailsView } from "@/components/product/product-details-view";
import { ProductSection } from "@/components/sections/product-section";
import { decodeEntities } from "@/utils/html";

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

  const rawDescription = product.short_description || product.description || "";
  const cleanDescription =
    decodeEntities(rawDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 160) ||
    `Discover ${product.name} at Angkon. Authentic luxury ethnic wear crafted with premium fabrics and modern heritage craftsmanship.`;

  const primaryImage = product.images?.[0]?.src || "/banners/HERO1.webp";
  const ogImages =
    product.images && product.images.length > 0
      ? product.images.slice(0, 4).map((img) => ({
          url: img.src,
          width: 1200,
          height: 1200,
          alt: img.alt || product.name,
        }))
      : [{ url: primaryImage, width: 1200, height: 1200, alt: product.name }];

  const currentPrice = product.price || product.sale_price || product.regular_price || "0";

  return {
    title: `${product.name} | Angkon`,
    description: cleanDescription,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} — BDT ${currentPrice}`,
      description: cleanDescription,
      url: `/products/${product.slug}`,
      siteName: "Angkon — House of Modern Heritage",
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — BDT ${currentPrice}`,
      description: cleanDescription,
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images?.map((img) => img.src) || [primaryImage],
    description: cleanDescription || product.name,
    productID: String(product.id),
    sku: String(product.id),
    mpn: product.sku || undefined,
    brand: {
      "@type": "Brand",
      name: "Angkon",
    },
    offers: {
      "@type": "Offer",
      url: `https://www.angkon.net/products/${product.slug}`,
      priceCurrency: "BDT",
      price: currentPrice,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "Angkon",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailsView product={product} />
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
