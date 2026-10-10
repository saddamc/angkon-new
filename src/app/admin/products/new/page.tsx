"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  const router = useRouter();

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
            <Plus className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Add New Product
            </h1>
            <p className="text-[12px] text-gray-400">
              Fill in the details below to create a new product
            </p>
          </div>
        </div>
      </div>

      <ProductForm onSuccess={() => router.push("/admin/products")} />
    </div>
  );
}
