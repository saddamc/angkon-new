import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowUpRight, ShoppingCart } from "lucide-react";
import { getDashboardData } from "./_lib/dashboard-data";
import { RevenueDonutsSection } from "./_components/revenue-donut-card";
import { DashboardKpiGrid } from "./_components/dashboard-kpi-grid";
import { SalesChartCard } from "./_components/sales-chart-card";
import { OrderPipelineCard } from "./_components/order-pipeline-card";
import { RecentOrdersCard } from "./_components/recent-orders-card";
import { InventoryAlertsCard } from "./_components/inventory-alerts-card";
import { DashboardQuickActions } from "./_components/dashboard-quick-actions";
import type { DashboardKpiItem } from "./_types/dashboard.types";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return `৳${Math.round(n).toLocaleString("en-BD")}`;
}

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  if (!cookieStore.get("nb_admin_token")?.value) {
    redirect("/login");
  }

  const data = await getDashboardData();

  const kpis: DashboardKpiItem[] = [
    {
      label: "Total Revenue",
      value: fmt(data.totalRevenue),
      sub: `Paid ${fmt(data.paidRevenue)}`,
      iconName: "Banknote",
      tone: "bg-purple-100 text-purple-600",
    },
    {
      label: "Outstanding",
      value: fmt(data.outstanding),
      sub: "Awaiting collection",
      iconName: "Wallet",
      tone: "bg-amber-100 text-amber-700",
    },
    {
      label: "Orders",
      value: data.totalOrders.toLocaleString("en-BD"),
      sub: `${data.total7d} in the last 7 days${
        data.totalPrev7d > 0
          ? ` · ${Math.round(((data.total7d - data.totalPrev7d) / data.totalPrev7d) * 100)}% vs prev`
          : ""
      }`,
      iconName: "ShoppingCart",
      tone: "bg-blue-100 text-blue-600",
    },
    {
      label: "Needs Action",
      value: data.needsAction.toLocaleString("en-BD"),
      sub: "Payment or booking required",
      iconName: "AlertTriangle",
      tone: "bg-rose-100 text-rose-600",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-100/80 bg-purple-50 text-purple-600 shadow-sm">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="text-[12.5px] text-gray-500">
              Store health, orders and courier activity at a glance.
            </p>
          </div>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-purple-200 transition hover:bg-purple-700"
        >
          View Orders <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Revenue Progress Donut Charts */}
      <RevenueDonutsSection items={data.revenueDonuts} />

      {/* KPI Metric Tiles */}
      <DashboardKpiGrid kpis={kpis} />

      {/* Sales Trend & Pipeline */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SalesChartCard
          days={data.days}
          maxRevenue={data.maxRevenue}
          weekRevenue={data.weekRevenue}
          weekOrders={data.weekOrders}
          total7d={data.total7d}
        />
        <OrderPipelineCard
          pipeline={data.pipeline}
          paymentIssues={data.paymentIssues}
          discrepancy={data.discrepancy}
        />
      </div>

      {/* Recent Orders & Inventory Alerts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RecentOrdersCard orders={data.recentOrders} />
        <InventoryAlertsCard lowStock={data.lowStock} topProducts={data.topProducts} />
      </div>

      {/* Bottom Quick Navigation */}
      <DashboardQuickActions />
    </div>
  );
}
