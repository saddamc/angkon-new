export interface RecentOrder {
  orderNumber?: string;
  customer?: { fullName?: string };
  total?: number;
  orderStatus?: string;
  createdAt?: string | Date;
}

export interface StockProduct {
  id?: number;
  name?: string;
  images?: { src?: string }[];
  stock_quantity?: number | null;
  total_sales?: number;
}

export interface DailySalesBucket {
  key: string;
  label: string;
  revenue: number;
  count: number;
}

export interface DashboardKpiItem {
  label: string;
  value: string;
  sub: string;
  tone: string;
  iconName: "Banknote" | "Wallet" | "ShoppingCart" | "AlertTriangle";
}

export interface RevenueDonutItem {
  title: string;
  revenue: number;
  paid: number;
  pending: number;
  color: string;
  orders: number;
}

export interface PipelineItem {
  key: string;
  label: string;
  value: number;
  tone: string;
  href: string;
}

export interface DashboardData {
  totalRevenue: number;
  paidRevenue: number;
  outstanding: number;
  totalOrders: number;
  total7d: number;
  totalPrev7d: number;
  needsAction: number;
  paymentIssues: number;
  discrepancy: number;
  revenueDonuts: RevenueDonutItem[];
  days: DailySalesBucket[];
  maxRevenue: number;
  weekRevenue: number;
  weekOrders: number;
  pipeline: PipelineItem[];
  recentOrders: RecentOrder[];
  lowStock: StockProduct[];
  topProducts: StockProduct[];
}
