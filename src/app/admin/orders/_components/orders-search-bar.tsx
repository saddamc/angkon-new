"use client";

import { useState } from "react";
import {
  RefreshCw,
  Truck,
  X,
  Download,
  Calendar,
  Filter,
} from "lucide-react";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface OrdersSearchBarProps {
  state: AdminOrdersHookReturn;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function OrdersSearchBar({ state }: OrdersSearchBarProps) {
  const {
    searchQuery,
    load,
    filterStatus,
    paymentFilter,
    handlePaymentFilterChange,
    shipmentFilter,
    handleShipmentFilterChange,
    courierFilter,
    handleCourierFilterChange,
    dateFrom,
    dateTo,
    handleDateRangeChange,
    clearAllFilters,
    exportOrdersCsv,
    loading,
    selectedOrderIds,
    clearSelection,
    setBulkModalOpen,
    courierProviders,
  } = state;

  const [datePreset, setDatePreset] = useState<string>(() =>
    dateFrom || dateTo ? "custom" : "all"
  );

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = toIsoDate(now);
    if (preset === "all") {
      handleDateRangeChange("", "");
    } else if (preset === "today") {
      handleDateRangeChange(todayStr, todayStr);
    } else if (preset === "7d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      handleDateRangeChange(toIsoDate(start), todayStr);
    } else if (preset === "30d") {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      handleDateRangeChange(toIsoDate(start), todayStr);
    } else if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      handleDateRangeChange(toIsoDate(start), todayStr);
    }
  };

  const hasActiveFilters =
    filterStatus !== "any" ||
    paymentFilter !== "any" ||
    shipmentFilter !== "any" ||
    courierFilter !== "any" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(searchQuery.trim());

  const steadfastReady =
    Boolean(courierProviders.steadfast.configured) &&
    courierProviders.steadfast.enabled !== false;

  return (
    <div className="space-y-3">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200/90 bg-white p-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Preset Selector */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-gray-700 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition">
            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <select
              aria-label="Filter by date range"
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-transparent text-[12px] font-medium text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Date: All Time</option>
              <option value="today">Date: Today</option>
              <option value="7d">Date: Last 7 Days</option>
              <option value="30d">Date: Last 30 Days</option>
              <option value="month">Date: This Month</option>
              <option value="custom">Date: Custom Range…</option>
            </select>
          </div>

          {datePreset === "custom" && (
            <div className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/40 px-2.5 py-1.5 text-[11px] text-gray-700">
              <input
                type="date"
                aria-label="Date from"
                value={dateFrom}
                onChange={(e) => handleDateRangeChange(e.target.value, dateTo)}
                className="bg-transparent text-[11px] font-medium text-gray-700 focus:outline-none cursor-pointer"
              />
              <span className="text-[10px] text-gray-400">to</span>
              <input
                type="date"
                aria-label="Date to"
                value={dateTo}
                onChange={(e) => handleDateRangeChange(dateFrom, e.target.value)}
                className="bg-transparent text-[11px] font-medium text-gray-700 focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Payment Status Filter */}
          <select
            aria-label="Filter by payment status"
            value={paymentFilter}
            onChange={(e) => handlePaymentFilterChange(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition cursor-pointer shrink-0"
          >
            <option value="any">Payment: All</option>
            <option value="issues">Payment Issues (Unresolved Online)</option>
            <option value="pending">Payment: Pending</option>
            <option value="partially_paid">Payment: Partially Paid</option>
            <option value="paid">Payment: Paid</option>
            <option value="failed">Payment: Failed</option>
            <option value="refunded">Payment: Refunded</option>
            <option value="partially_refunded">Payment: Part Refunded</option>
          </select>

          {/* Courier Provider Filter */}
          <select
            aria-label="Filter by courier"
            value={courierFilter}
            onChange={(e) => handleCourierFilterChange(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition cursor-pointer shrink-0"
          >
            <option value="any">Courier: All</option>
            <option value="unassigned">Courier: Unassigned</option>
            <option value="steadfast">Courier: Steadfast</option>
            <option value="pathao" disabled>
              Courier: Pathao (Soon)
            </option>
          </select>

          {/* Shipment Status Filter */}
          <select
            aria-label="Filter by shipment status"
            value={shipmentFilter}
            onChange={(e) => handleShipmentFilterChange(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition cursor-pointer shrink-0"
          >
            <option value="any">Shipment: All</option>
            <option value="none">Shipment: Not Booked</option>
            <option value="created">Created</option>
            <option value="pending">Pending Pickup</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Booking Failed</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setDatePreset("all");
              clearAllFilters();
            }}
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11.5px] font-semibold transition cursor-pointer shrink-0 ${
              hasActiveFilters
                ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            }`}
            title="Reset filters"
          >
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            {hasActiveFilters && <span>Reset</span>}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Courier sync lives once, in the page header ("Sync Status"), so
              this toolbar no longer carries a duplicate button. */}

          <button
            type="button"
            onClick={() => void load(filterStatus, true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-stone-200 bg-white text-stone-600 hover:border-purple-300 hover:text-purple-700 transition cursor-pointer"
            title="Reload orders"
            aria-label="Reload orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={exportOrdersCsv}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-purple-200 hover:bg-purple-700 transition cursor-pointer"
            title="Export filtered orders to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Bulk Dispatch Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-purple-50/90 px-4 py-2.5 shadow-sm">
          <span className="text-[12.5px] font-bold text-purple-900">
            {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!steadfastReady}
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              title={
                steadfastReady
                  ? "Open bulk booking pre-flight audit for selected orders"
                  : "Enable and configure Steadfast credentials first"
              }
            >
              <Truck className="h-3.5 w-3.5" />
              Send to Steadfast
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-purple-700 hover:bg-purple-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
