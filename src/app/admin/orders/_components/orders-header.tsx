"use client";

import { ShoppingCart } from "lucide-react";

export function OrdersHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Orders Processing</h1>
        </div>
      </div>
    </div>
  );
}
