"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ProductFormSkeleton } from "@/components/admin/product-form-skeleton";

/**
 * Handles shorthand URLs:
 *   /admin/products/171          → /admin/products/{slug}/edit
 *   /admin/products/cuban-shirt   → /admin/products/cuban-shirt/edit
 */
export default function ProductSlugRedirectPage() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug || slug === "new") return;

    const run = async () => {
      try {
        const res = await authFetch(
          `/api/admin/products/${encodeURIComponent(slug)}`,
        );
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = (await res.json()) as { slug?: string };
        if (data?.slug) {
          router.replace(
            `/admin/products/${encodeURIComponent(data.slug)}/edit`,
          );
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    };
    void run();
  }, [authFetch, slug, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-md text-center py-20">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100">
          <Package className="h-6 w-6 text-rose-500" />
        </div>
        <p className="text-[15px] font-bold text-gray-800">Product not found</p>
        <p className="mt-1.5 text-[13px] text-stone-500 leading-relaxed">
          This product may have been removed or relocated in the catalog.
        </p>
        <Link
          href="/admin/products"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-purple-700 shadow-md shadow-purple-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <ProductFormSkeleton
      title="Opening luxury product editor"
      subtitle="Resolving garment details from catalog…"
    />
  );
}
