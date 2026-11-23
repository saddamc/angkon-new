import Link from "next/link";
import { AlertTriangle, Banknote, Truck, Users } from "lucide-react";

const QUICK_ACTIONS = [
  { href: "/admin/orders?status=needs_action", label: "Needs Action", icon: AlertTriangle, sub: "Resolve payment / booking" },
  { href: "/admin/couriers", label: "Couriers", icon: Truck, sub: "Steadfast operations" },
  { href: "/admin/customers", label: "Customers", icon: Users, sub: "Profiles & history" },
  { href: "/admin/reports", label: "Reports", icon: Banknote, sub: "Revenue & performance" },
];

export function DashboardQuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {QUICK_ACTIONS.map((q) => {
        const Icon = q.icon;
        return (
          <Link
            key={q.href}
            href={q.href}
            className="group flex items-center gap-2.5 rounded-2xl border border-stone-200/90 bg-white p-3 shadow-xs transition hover:border-purple-300 hover:shadow-sm"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition group-hover:scale-105">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-bold text-gray-800">{q.label}</span>
              <span className="block truncate text-[10px] text-gray-400">{q.sub}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
