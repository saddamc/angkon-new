import type { DailySalesBucket } from "../_types/dashboard.types";

function fmt(n: number) {
  return `৳${Math.round(n).toLocaleString("en-BD")}`;
}

export function SalesChartCard({
  days,
  maxRevenue,
  weekRevenue,
  weekOrders,
  total7d,
}: {
  days: DailySalesBucket[];
  maxRevenue: number;
  weekRevenue: number;
  weekOrders: number;
  total7d: number;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs xl:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-bold text-gray-800">Sales — last 7 days</h2>
          <p className="text-[10.5px] text-gray-400">
            {fmt(weekRevenue)} from {weekOrders} orders
          </p>
        </div>
        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
          {total7d} new
        </span>
      </div>

      <div className="mt-4 flex h-44 gap-2">
        {days.map((d) => {
          const height = Math.max(4, Math.round((d.revenue / maxRevenue) * 100));
          return (
            <div key={d.key} className="flex h-full flex-1 flex-col gap-1.5">
              <div className="flex min-h-0 w-full flex-1 items-end">
                <div
                  className="group relative w-full rounded-t-lg bg-gradient-to-t from-purple-600 to-purple-400 transition-all hover:from-purple-700 hover:to-purple-500"
                  style={{ height: `${height}%` }}
                  title={`${d.label}: ${fmt(d.revenue)} · ${d.count} order${d.count === 1 ? "" : "s"}`}
                >
                  <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-1.5 py-0.5 text-[9px] font-bold text-white group-hover:block">
                    {fmt(d.revenue)}
                  </span>
                </div>
              </div>
              <span className="text-center text-[9.5px] font-semibold text-gray-400">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
