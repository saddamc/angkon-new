import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts, getProductReviews } from "@/services/products.service";
import { ProductDetailsView } from "@/components/product/product-details-view";
import { ProductSection } from "@/components/sections/product-section";

export const dynamic = "force-dynamic";

interface ProductDetailsProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailsPage({ params }: ProductDetailsProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [relatedProducts, reviews] = await Promise.all([
    getRelatedProducts(product),
    getProductReviews(product.id),
  ]);

  return (
    <>
      <ProductDetailsView product={product} reviews={reviews} />
      {relatedProducts.length > 0 && (
        <div className="container pb-16">
          <h2 className="mb-8 font-heading text-2xl font-black uppercase text-[#E1B76F] sm:text-3xl">You May Also Like</h2>
          <ProductSection title="" products={relatedProducts} />
        </div>
      )}
    </>
  );
}
