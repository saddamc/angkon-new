import Link from "next/link";
import { Package } from "lucide-react";
import type { StockProduct } from "../_types/dashboard.types";

export function InventoryAlertsCard({
  lowStock,
  topProducts,
}: {
  lowStock: StockProduct[];
  topProducts: StockProduct[];
}) {
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-gray-800">Low stock</h2>
        <Link href="/admin/products" className="text-[11px] font-bold text-purple-700 hover:underline">
          Manage
        </Link>
      </div>
      {lowStock.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-gray-400">
          All tracked products are healthy.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {lowStock.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-xl border border-stone-100 px-2 py-1.5"
            >
              {p.images?.[0]?.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0].src} alt="" className="h-7 w-7 rounded-lg object-cover" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                  <Package className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-gray-700">
                {p.name}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                  (p.stock_quantity ?? 0) <= 0
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {(p.stock_quantity ?? 0) <= 0 ? "Out" : `${p.stock_quantity} left`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-stone-100 pt-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
          Top sellers
        </h3>
        <ul className="mt-2 space-y-1">
          {topProducts.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 text-[11.5px]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-50 text-[9.5px] font-bold text-purple-700">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-gray-700">{p.name}</span>
              <span className="text-[10px] font-bold tabular-nums text-gray-400">
                {p.total_sales || 0} sold
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
