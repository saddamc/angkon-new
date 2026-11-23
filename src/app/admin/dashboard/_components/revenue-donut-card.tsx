import type { RevenueDonutItem } from "../_types/dashboard.types";

function fmt(n: number) {
  return `৳${Math.round(n).toLocaleString("en-BD")}`;
}

export function DonutChart({
  value,
  max,
  color,
  size = 140,
  label = "COLLECTED",
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  label?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f0ebff"
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-800">{pct.toFixed(0)}%</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {label}
        </span>
      </div>
    </div>
  );
}

export function RevenueDonutsSection({ items }: { items: RevenueDonutItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.title}
          className="flex flex-col items-center rounded-2xl border border-purple-100/70 bg-white p-6 shadow-xs transition-shadow duration-300 hover:shadow-md"
        >
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
            {item.title}
          </h3>
          <DonutChart
            value={item.paid}
            max={item.revenue || 1}
            color={item.color}
            label="COLLECTED"
          />
          <div className="mt-5 w-full space-y-2 text-[12.5px]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              <span className="text-gray-500">Gross Sales</span>
              <span className="ml-auto font-bold text-gray-800">{fmt(item.revenue)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-500">Payment Received</span>
              <span className="ml-auto font-bold text-emerald-600">{fmt(item.paid)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-gray-500">Pending (COD)</span>
              <span className="ml-auto font-semibold text-amber-600">{fmt(item.pending)}</span>
            </div>
            <div className="flex items-center gap-2 border-t border-purple-50 pt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="text-gray-500">Orders</span>
              <span className="ml-auto font-semibold text-gray-700">{item.orders}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
