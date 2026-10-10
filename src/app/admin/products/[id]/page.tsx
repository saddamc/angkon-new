"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ProductForm } from "@/components/admin/product-form";

/* ─── Raw WC product shape (more fields than the mapped WooProduct) ── */
interface WCProductRaw {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  regular_price: string;
  sale_price: string;
  price: string;
  on_sale: boolean;
  stock_status: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  images: { id: number; src: string; alt: string }[];
  categories: { id: number; name: string; slug: string }[];
  attributes: { name: string; options: string[] }[];
  meta_data: { id?: number; key: string; value: any }[];
}

export default function EditProductPage() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<WCProductRaw | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        // Fetch raw WC product data directly
        const res = await authFetch(`/api/admin/products?per_page=100`);
        if (res.ok) {
          const data = await res.json();
          const list = data.products ?? data;
          const found = Array.isArray(list)
            ? list.find((p: WCProductRaw) => String(p.id) === id)
            : null;
          setProduct(found || null);
        }
      } finally {
        setLoading(false);
      }
    };
    void loadProduct();
  }, [authFetch, id]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
        <span className="ml-2 text-gray-400">Loading product…</span>
      </div>
    );

  if (!product)
    return (
      <div className="text-center py-20">
        <p className="text-red-500 font-medium">Product not found.</p>
        <Link
          href="/admin/products"
          className="text-purple-600 hover:underline text-sm mt-2 inline-block"
        >
          ← Back to products
        </Link>
      </div>
    );

  // Extract sizes from attributes
  const sizeAttr = product.attributes.find(
    (a) => a.name.toLowerCase() === "size"
  );

  const initialData = {
    id: product.id,
    name: product.name,
    sku: product.sku || "",
    shortDescription: product.short_description,
    description: product.description,
    regularPrice: product.regular_price,
    salePrice: product.sale_price,
    stockStatus: product.stock_status,
    stockQuantity: product.stock_quantity != null ? String(product.stock_quantity) : "",
    manageStock: product.manage_stock,
    categoryId: product.categories[0]?.id || 0,
    categoryName: product.categories[0]?.name || "",
    categorySlug: product.categories[0]?.slug || "",
    sizes: sizeAttr?.options || [],
    images: product.images.map((img) => ({
      src: img.src,
      alt: img.alt,
      wpId: img.id,
    })),
    deliveryInside: product.meta_data?.slice().reverse().find(m => m.key === "_delivery_inside")?.value || "50",
    deliveryInsideId: product.meta_data?.slice().reverse().find(m => m.key === "_delivery_inside")?.id,
    deliveryOutside: product.meta_data?.slice().reverse().find(m => m.key === "_delivery_outside")?.value || "80",
    deliveryOutsideId: product.meta_data?.slice().reverse().find(m => m.key === "_delivery_outside")?.id,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 hover:bg-purple-100 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Pencil className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Edit Product</h1>
            <p className="text-[12px] text-gray-400 truncate max-w-md">
              {product.name}
            </p>
          </div>
        </div>
      </div>

      <ProductForm
        initialData={initialData}
        onSuccess={() => router.push("/admin/products")}
      />
    </div>
  );
}
