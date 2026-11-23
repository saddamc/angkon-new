import Link from "next/link";
import type { RecentOrder } from "../_types/dashboard.types";

function fmt(n: number) {
  return `৳${Math.round(n).toLocaleString("en-BD")}`;
}

function statusTone(status: string): string {
  const s = String(status || "").toLowerCase();
  if (["delivered", "completed"].includes(s))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["shipped", "in_transit"].includes(s))
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (["processing", "confirmed", "ready_to_ship"].includes(s))
    return "bg-blue-50 text-blue-700 border-blue-200";
  if (["pending", "on-hold"].includes(s)) return "bg-amber-50 text-amber-800 border-amber-200";
  if (["cancelled", "failed", "returned", "refunded"].includes(s))
    return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-stone-50 text-stone-700 border-stone-200";
}

export function RecentOrdersCard({ orders }: { orders: RecentOrder[] }) {
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs xl:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-gray-800">Recent orders</h2>
        <Link href="/admin/orders" className="text-[11px] font-bold text-purple-700 hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-2 divide-y divide-stone-200/60">
        {orders.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-gray-400">No orders yet.</p>
        ) : (
          orders.map((o) => {
            const customer = o.customer?.fullName || "Customer";
            return (
              <Link
                key={o.orderNumber}
                href={`/admin/orders?search=${encodeURIComponent(o.orderNumber || "")}`}
                className="flex items-center gap-3 py-2 transition hover:bg-purple-50/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[10px] font-bold text-purple-700">
                  {(customer[0] || "C").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-gray-800">
                    #{o.orderNumber} · {customer}
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    {String(o.orderStatus || "").replace(/_/g, " ")}
                  </span>
                </span>
                <span className="text-[12px] font-bold tabular-nums text-gray-900">
                  {fmt(Number(o.total || 0))}
                </span>
                <span
                  className={`hidden rounded-full border px-2 py-0.5 text-[9.5px] font-bold capitalize sm:inline ${statusTone(
                    String(o.orderStatus || "")
                  )}`}
                >
                  {String(o.orderStatus || "").replace(/_/g, " ")}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
