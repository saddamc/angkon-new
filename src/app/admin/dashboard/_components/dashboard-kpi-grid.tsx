import { Banknote, Wallet, ShoppingCart, AlertTriangle } from "lucide-react";
import type { DashboardKpiItem } from "../_types/dashboard.types";

const ICON_MAP = {
  Banknote,
  Wallet,
  ShoppingCart,
  AlertTriangle,
};

export function DashboardKpiGrid({ kpis }: { kpis: DashboardKpiItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {kpis.map((item) => {
        const Icon = ICON_MAP[item.iconName] || Banknote;
        return (
          <div
            key={item.label}
            className="rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-500">{item.label}</p>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-[20px] font-bold tracking-tight text-gray-900 tabular-nums">
              {item.value}
            </p>
            <p className="truncate text-[10px] text-gray-400">{item.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
