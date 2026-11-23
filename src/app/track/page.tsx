"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPaymentMethodLabel } from "@/lib/payment-methods";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertCircle,
  Loader2,
  ShieldCheck,
  MapPin,
  Calendar,
} from "lucide-react";

interface TrackingData {
  orderNumber: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  shipmentStatus: string;
  courier: string | null;
  trackingCode: string | null;
  consignmentId: string | null;
  trackingUrl: string | null;
  isMock?: boolean;
  recipient: {
    maskedName: string;
    city: string;
  };
  financials: {
    total: number;
    paidAmount: number;
    outstandingCod: number;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image: string | null;
  }>;
  events?: Array<{
    status: string;
    note?: string;
    at: string;
  }>;
}

function formatBDT(amount: number) {
  return "৳" + Number(amount || 0).toLocaleString("en-BD");
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function TrackForm() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("orderNumber") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackingData | null>(null);

  const fetchTracking = async (ordNum: string, ph: string) => {
    if (!ordNum.trim() || !ph.trim()) {
      setError("Please enter both Order Number and Phone Number.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(ordNum.trim())}&phone=${encodeURIComponent(
          ph.trim()
        )}`
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "No order found matching these details. Please verify and retry.");
        setData(null);
        return;
      }
      setData(json.tracking);
    } catch {
      setError("Unable to connect to tracking service. Please try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initOrd = searchParams.get("orderNumber");
    const initPhone = searchParams.get("phone");
    if (initOrd && initPhone) {
      void fetchTracking(initOrd, initPhone);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchTracking(orderNumber, phone);
  };

  // Determine stage in progress
  const getStageStatus = () => {
    if (!data) return 0;
    const s = (data.shipmentStatus || "").toLowerCase();
    const ord = (data.orderStatus || "").toLowerCase();
    if (s === "delivered" || ord === "delivered") return 4;
    if (["in_transit", "out_for_delivery", "picked_up"].includes(s)) return 3;
    if (data.trackingCode || s === "in_review" || s === "hold" || ["confirmed", "processing"].includes(ord)) return 2;
    return 1;
  };

  const currentStage = getStageStatus();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Track Your Order
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Enter your order number and billing phone number to see live courier tracking and delivery updates.
        </p>
      </div>

      {/* Search Box */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm mb-8 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Order Number
            </label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. ANG-261122-0001"
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm font-medium text-stone-900 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm font-medium text-stone-900 outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-purple-800 disabled:opacity-50 cursor-pointer transition"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span>{loading ? "Tracking Order..." : "Track Order"}</span>
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Lookup Unsuccessful</p>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Tracking Result View */}
      {data && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-stone-500">Order Number</span>
                <p className="font-mono text-lg font-bold text-stone-900">#{data.orderNumber}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-stone-500">Placed on</span>
                <p className="text-sm font-medium text-stone-700">{formatDate(data.createdAt)}</p>
              </div>
            </div>

            {/* Stepper */}
            <div className="pt-6 pb-2">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { stage: 1, label: "Order Placed", icon: Package },
                  { stage: 2, label: "Confirmed", icon: ShieldCheck },
                  { stage: 3, label: "In Transit", icon: Truck },
                  { stage: 4, label: "Delivered", icon: CheckCircle2 },
                ].map((st) => {
                  const isCompleted = currentStage >= st.stage;
                  const isCurrent = currentStage === st.stage;
                  const Icon = st.icon;
                  return (
                    <div key={st.stage} className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                          isCompleted
                            ? "bg-purple-700 text-white shadow-xs"
                            : "border-2 border-stone-200 bg-stone-50 text-stone-400"
                        } ${isCurrent ? "ring-4 ring-purple-100" : ""}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`mt-2 text-xs font-semibold ${
                          isCompleted ? "text-stone-900" : "text-stone-400"
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier Dispatch Badge & Live Tracking Link */}
            {data.trackingCode && (
              <div className="mt-6 rounded-xl border border-purple-100 bg-purple-50/50 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 block">
                    Courier: {data.courier || "Steadfast"}
                  </span>
                  <p className="font-mono text-sm font-bold text-stone-900 mt-0.5">
                    Tracking Code: {data.trackingCode}
                  </p>
                </div>
                {data.trackingUrl && (
                  <a
                    href={data.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-800 transition"
                  >
                    <span>Track on Steadfast</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Items & Payment Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Items */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 border-b border-stone-100 pb-2">
                Order Items ({data.items.length})
              </h2>
              <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto pr-1">
                {data.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-3">
                    {item.image ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-stone-100 bg-stone-50">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-stone-900 truncate">{item.name}</p>
                      <p className="text-xs text-stone-500">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-stone-900">
                      {formatBDT(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials & Delivery Info */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-800 border-b border-stone-100 pb-2">
                Payment & Delivery
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Customer:</span>
                  <span className="font-semibold text-stone-900">{data.recipient.maskedName}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Destination:</span>
                  <span className="font-semibold text-stone-900">{data.recipient.city}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Payment Method:</span>
                  <span className="font-bold uppercase text-stone-900">
                    {getPaymentMethodLabel(data.paymentMethod)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Total Amount:</span>
                  <span className="font-bold text-stone-900">{formatBDT(data.financials.total)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Paid Amount:</span>
                  <span className="font-bold text-emerald-700">
                    {formatBDT(data.financials.paidAmount)}
                  </span>
                </div>
                <div className="pt-2 border-t border-stone-100 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-stone-800">
                    Amount to Pay on Delivery:
                  </span>
                  <span className="text-base font-black text-purple-700">
                    {formatBDT(data.financials.outstandingCod)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-6 w-6 animate-spin text-purple-700" />
        </div>
      }
    >
      <TrackForm />
    </Suspense>
  );
}
