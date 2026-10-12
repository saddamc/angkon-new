"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ProductForm } from "@/components/admin/product-form";
import { ProductFormSkeleton } from "@/components/admin/product-form-skeleton";
import { getSizeChartFromMeta, emptySizeChart } from "@/utils/size-chart";

/* ─── Raw WC / MongoDB product shape ── */
interface WCProductRaw {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  regular_price: string;
  sale_price: string;
  buy_price?: string;
  price: string;
  on_sale: boolean;
  stock_status: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  images: { id: number; src: string; alt: string }[];
  categories: { id: number; name: string; slug: string; parent?: number }[];
  attributes: { name: string; options: string[]; visible?: boolean; variation?: boolean; id?: number }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta_data: { id?: number; key: string; value: any }[];
}

export default function EditProductBySlugPage() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<WCProductRaw | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const loadProduct = async () => {
      try {
        const res = await authFetch(
          `/api/admin/products/${encodeURIComponent(slug)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as WCProductRaw;
          setProduct(data?.id ? data : null);
        } else {
          setProduct(null);
        }
      } finally {
        setLoading(false);
      }
    };
    void loadProduct();
  }, [authFetch, slug]);

  // Canonicalize /admin/products/{id}/edit → /admin/products/{slug}/edit
  useEffect(() => {
    if (!product?.slug) return;
    if (slug === product.slug) return;
    router.replace(
      `/admin/products/${encodeURIComponent(product.slug)}/edit`,
    );
  }, [product, slug, router]);

  if (loading) {
    return (
      <ProductFormSkeleton
        title="Loading garment details"
        subtitle="Loading product details…"
      />
    );
  }

  if (!product)
    return (
      <div className="mx-auto max-w-md text-center py-20">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100">
          <Pencil className="h-6 w-6 text-rose-500" />
        </div>
        <p className="text-[15px] font-serif font-bold text-stone-800">Product not found</p>
        <p className="mt-1.5 text-[13px] text-stone-500 leading-relaxed">
          This product may have been removed or relocated in the catalog.
        </p>
        <Link
          href="/admin/products"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#400604] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#250302] transition shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
      </div>
    );

  const sizeAttr = product.attributes?.find(
    (a) => a.name.toLowerCase() === "size",
  );
  const colorAttr = product.attributes?.find((a) => {
    const n = a.name.toLowerCase();
    return n === "color" || n === "colour";
  });

  const { chart: sizeChart, metaId: sizeChartMetaId } = getSizeChartFromMeta(
    product.meta_data,
  );

  const initialData = {
    id: product.id,
    name: product.name,
    slug: product.slug || "",
    sku: product.sku || "",
    shortDescription: product.short_description || "",
    description: product.description || "",
    regularPrice: product.regular_price || "",
    salePrice: product.sale_price || "",
    buyPrice:
      product.buy_price ||
      (product.meta_data?.slice().reverse().find((m) => m.key === "_buy_price")
        ?.value ?? ""),
    stockStatus: product.stock_status || "instock",
    stockQuantity:
      product.stock_quantity != null ? String(product.stock_quantity) : "",
    manageStock: Boolean(product.manage_stock),
    categoryId: product.categories?.[0]?.id || 0,
    categoryName: product.categories?.[0]?.name || "",
    categorySlug: product.categories?.[0]?.slug || "",
    categoryParent: product.categories?.[0]?.parent || 0,
    sizes: sizeAttr?.options || [],
    colors: colorAttr?.options || [],
    sizeChart: sizeChart ?? emptySizeChart(),
    sizeChartMetaId,
    otherAttributes: (product.attributes || []).filter((a) => {
      const n = a.name.toLowerCase();
      return n !== "size" && n !== "color" && n !== "colour";
    }),
    images: (product.images || []).map((img) => ({
      src: img.src,
      alt: img.alt || "",
      wpId: img.id,
    })),
    deliveryInside:
      product.meta_data?.slice().reverse().find((m) => m.key === "_delivery_inside")
        ?.value ?? "",
    deliveryInsideId: product.meta_data
      ?.slice()
      .reverse()
      .find((m) => m.key === "_delivery_inside")?.id,
    deliveryOutside:
      product.meta_data?.slice().reverse().find((m) => m.key === "_delivery_outside")
        ?.value ?? "",
    deliveryOutsideId: product.meta_data
      ?.slice()
      .reverse()
      .find((m) => m.key === "_delivery_outside")?.id,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="h-9 w-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 hover:text-[#400604] hover:bg-stone-200 transition"
          title="Back to products"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-[#400604]/10 border border-[#E1B76F]/30 flex items-center justify-center">
            <Pencil className="h-5 w-5 text-[#400604]" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1A0302]">Edit Product</h1>
          </div>
        </div>
      </div>

      <ProductForm
        initialData={initialData}
        onSuccess={() => router.push("/admin/products")}
        onCancel={() => router.push("/admin/products")}
      />
    </div>
  );
}
