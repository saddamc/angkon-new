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
          className="h-9 w-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 hover:text-[#400604] hover:bg-stone-200 transition"
          title="Back to products"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-[#400604]/10 border border-[#E1B76F]/30 flex items-center justify-center">
            <Plus className="h-5 w-5 text-[#400604]" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1A0302]">
              Add New Product
            </h1>
            <p className="text-[12px] text-stone-500">
              Create an exclusive fashion piece with cloud media and measurements
            </p>
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
