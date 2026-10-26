"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="h-9 w-9 rounded-xl bg-white border border-purple-100 flex items-center justify-center text-stone-600 hover:text-purple-600 hover:bg-purple-50 shadow-2xs transition"
          title="Back to products"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center">
            <Plus className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Add New Product
            </h1>
          </div>
        </div>
      </div>

      <ProductForm
        onSuccess={() => router.push("/admin/products")}
        onCancel={() => router.push("/admin/products")}
      />
    </div>
  );
}
