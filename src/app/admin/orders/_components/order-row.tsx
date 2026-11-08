"use client";

import Image from "next/image";
import {
  Users,
  Mail,
  Phone,
  MapPin,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Copy,
} from "lucide-react";
import {
  STATUS_BADGE,
  FINAL_STATUSES,
  formatBDT,
  type WCOrder,
} from "../_types/orders.types";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface OrderRowProps {
  order: WCOrder;
  idx: number;
  state: AdminOrdersHookReturn;
}

export function OrderRow({ order, idx, state }: OrderRowProps) {
  const {
    copyValue,
    setInfoModal,
    setSelectedStatus,
    setStatusModal,
    updating,
    handleTogglePayment,
  } = state;

  const custName =
    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
    "Guest";
  const statusColor =
    STATUS_BADGE[order.status] ?? "bg-gray-50 text-gray-600 border-gray-200";
  const firstItem = order.line_items?.[0];
  const productName = firstItem?.name ?? "—";
  const productQty = (order.line_items || []).reduce(
    (sum, li) => sum + (li.quantity || 1),
    0
  );
  // Distinct, non-empty sizes across every line item (ignores "Standard" placeholder on products with no sizes)
  const productSizes = Array.from(
    new Set(
      (order.line_items || [])
        .map((li) => (li.size || "").trim())
        .filter((s) => Boolean(s) && s.toLowerCase() !== "standard")
    )
  );
  // Distinct, non-empty colors across every line item
  const productColors = Array.from(
    new Set(
      (order.line_items || [])
        .map((li) => (li.color || "").trim())
        .filter(Boolean)
    )
  );
  const thumb = firstItem?.image?.src;
  const rawAddress = order.billing?.address_1 || "";
  const city = order.billing?.city || "";
  const fullAddress =
    city && !rawAddress.toLowerCase().includes(city.toLowerCase())
      ? `${rawAddress}, ${city}`.replace(/^,\s*/, "")
      : rawAddress;

  const openCustomerDetails = () =>
    setInfoModal({
      title: "Customer details",
      subtitle: `Order #${order.number || order.id}`,
      fields: [
        { label: "Name", value: custName },
        ...(order.billing?.email
          ? [{ label: "Email", value: order.billing.email, mono: true }]
          : []),
        ...(order.billing?.phone
          ? [{ label: "Phone", value: order.billing.phone, mono: true }]
          : []),
        ...(fullAddress ? [{ label: "Address", value: fullAddress }] : []),
      ],
    });

  const openProductDetails = () =>
    setInfoModal({
      title: "Product details",
      subtitle: `Order #${order.number || order.id}`,
      fields: [
        { label: "Product", value: productName },
        { label: "Quantity", value: String(productQty) },
        ...(productSizes.length
          ? [
              {
                label: productSizes.length === 1 ? "Size" : "Sizes",
                value: productSizes.join(", "),
                mono: true,
              },
            ]
          : []),
        ...(productColors.length
          ? [
              {
                label: productColors.length === 1 ? "Color" : "Colors",
                value: productColors.join(", "),
                mono: true,
              },
            ]
          : []),
      ],
    });

  const paymentStatus = (
    order.payment_status ||
    order.paymentStatus ||
    ""
  ).toLowerCase();
  const isPaid = paymentStatus === "paid";
  const isCancelled = order.status === "cancelled" || order.status === "failed";

  return (
    <div className="group">
      {/* Summary row */}
      <div className="w-full grid grid-cols-[auto_1fr] lg:grid-cols-[45px_150px_minmax(190px,1.4fr)_minmax(180px,1.2fr)_120px_100px_90px_105px] items-center gap-3 px-5 py-4 text-left hover:bg-purple-50/40 transition">
        {/* SL */}
        <span className="hidden lg:block text-[12px] text-gray-400 font-bold">
          {idx + 1}
        </span>

        {/* Order No & Date */}
        <div className="min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void copyValue(`#${order.number || order.id}`, "Order number");
            }}
            className="group/ord flex max-w-full items-center gap-1 rounded text-left font-mono text-[12px] font-bold tracking-tight text-purple-600 transition hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
            title="Click to copy the order number"
          >
            <span className="truncate">#{order.number || order.id}</span>
            <Copy className="h-3 w-3 shrink-0 opacity-0 transition group-hover/ord:opacity-100" />
          </button>
          <p className="text-[11px] text-gray-500">
            {order.date_created
              ? new Date(order.date_created).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </p>
          <span className="mt-1 inline-block rounded border border-purple-200/60 bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wider text-purple-700">
            Online
          </span>
        </div>

        {/* Customer Info */}
        <div className="min-w-0 space-y-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openCustomerDetails();
            }}
            className="flex w-full min-w-0 items-center gap-1.5 rounded text-left transition hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
            title="View full customer details"
          >
            <Users className="h-3 w-3 flex-shrink-0 text-gray-400" />
            <span className="truncate text-[12px] font-semibold text-gray-800">
              {custName}
            </span>
          </button>
          {order.billing?.email && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCustomerDetails();
              }}
              className="flex w-full min-w-0 items-center gap-1.5 rounded text-left transition hover:text-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
              title={`${order.billing.email} — click for details`}
            >
              <Mail className="h-3 w-3 flex-shrink-0 text-gray-400" />
              <span className="truncate text-[11px] text-gray-500">
                {order.billing.email}
              </span>
            </button>
          )}
          {order.billing?.phone && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCustomerDetails();
              }}
              className="flex w-full min-w-0 items-center gap-1.5 rounded text-left transition hover:text-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
              title={`${order.billing.phone} — click for details`}
            >
              <Phone className="h-3 w-3 flex-shrink-0 text-gray-400" />
              <span className="truncate font-mono text-[11px] text-gray-500">
                {order.billing.phone}
              </span>
            </button>
          )}
          {order.billing?.address_1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCustomerDetails();
              }}
              className="flex w-full min-w-0 items-center gap-1.5 rounded text-left transition hover:text-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
              title={`${fullAddress} — click for details`}
            >
              <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
              <span className="truncate text-[11px] text-gray-500">
                {order.billing.address_1}
              </span>
            </button>
          )}
          {/* Mobile Row Info */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap lg:hidden">
            <span className="text-[11px] font-bold text-gray-900">
              {formatBDT(order.total)}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (!FINAL_STATUSES.includes(order.status)) {
                  setSelectedStatus(null);
                  setStatusModal(order);
                }
              }}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold capitalize cursor-pointer ${statusColor}`}
            >
              {order.status.replace("-", " ")}
            </span>
            {isCancelled ? (
              <span className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                Void
              </span>
            ) : isPaid ? (
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                ✓ Paid
              </span>
            ) : (
              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                ⏳ Unpaid
              </span>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="hidden lg:flex items-center gap-2.5 min-w-0">
          {thumb ? (
            <div className="h-10 w-10 rounded-lg overflow-hidden bg-purple-50/50 flex-shrink-0 border border-purple-100">
              <Image
                src={thumb}
                alt={productName}
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-lg bg-purple-50/50 flex-shrink-0 border border-purple-100 flex items-center justify-center text-purple-300">
              <ShoppingCart className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openProductDetails();
              }}
              className="block w-full truncate rounded text-left text-[12px] font-semibold text-gray-800 transition hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
              title={`${productName} — click for details`}
            >
              {productName}
            </button>
            <p className="text-[11px] font-medium text-gray-700">
              Qty: {productQty}
              {productSizes.length > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-gray-900">
                    {productSizes.length === 1 ? "Size" : "Sizes"}:{" "}
                    {productSizes.join(", ")}
                  </span>
                </>
              )}
              {productColors.length > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-gray-900">
                    {productColors.length === 1 ? "Color" : "Colors"}:{" "}
                    {productColors.join(", ")}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Payment & Collection Status */}
        <div className="hidden lg:flex flex-col items-start gap-1">
          <span
            className="text-[11px] font-medium text-gray-600 truncate max-w-[110px]"
            title={order.payment_method_title || order.paymentMethod || "COD"}
          >
            {order.payment_method_title || order.paymentMethod || "COD"}
          </span>
          {isCancelled ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
              Void
            </span>
          ) : isPaid ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleTogglePayment(order.id, "paid");
              }}
              disabled={updating === order.id}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-100 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-60 cursor-pointer"
              title="Payment received. Click to switch to Unpaid."
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              Paid
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleTogglePayment(order.id, "pending");
              }}
              disabled={updating === order.id}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[9px] font-bold text-amber-700 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:opacity-60 cursor-pointer"
              title="Pending collection / COD. Click to mark Paid."
            >
              <Clock className="h-2.5 w-2.5" />
              Unpaid
            </button>
          )}
        </div>

        {/* Total Price */}
        <span className="hidden text-[13px] font-bold tabular-nums text-gray-900 lg:block">
          {formatBDT(order.total)}
        </span>

        {/* Due */}
        <div className="hidden lg:block">
          {isCancelled ? (
            <span className="text-[11px] font-medium text-gray-400">Void</span>
          ) : isPaid ? (
            <span className="text-[12px] font-bold tabular-nums text-emerald-600">
              ৳ 0
            </span>
          ) : (
            <span className="text-[13px] font-bold tabular-nums text-purple-700">
              {formatBDT(order.total)}
            </span>
          )}
        </div>

        {/* Status Button */}
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (!FINAL_STATUSES.includes(order.status)) {
              setSelectedStatus(null);
              setStatusModal(order);
            }
          }}
          className={`hidden lg:inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize transition ${
            FINAL_STATUSES.includes(order.status)
              ? "opacity-75 cursor-not-allowed"
              : "cursor-pointer hover:shadow-sm"
          } ${statusColor}`}
          title={
            FINAL_STATUSES.includes(order.status)
              ? `Status is locked (${order.status})`
              : "Click to change status"
          }
        >
          {order.status.replace("-", " ")}
        </span>
      </div>
    </div>
  );
}
