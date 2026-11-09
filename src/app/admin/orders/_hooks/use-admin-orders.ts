"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import type {
  WCOrder,
  InfoModalData,
  WarningModalData,
  PaymentModalData,
  ToastData,
} from "../_types/orders.types";

const REFRESH_INTERVAL = 30_000;

/* ─── Client Cache for Instant Tab Switching ──────────────────────── */
let cachedOrdersAll: WCOrder[] | null = null;
let cachedOrdersFiltered: WCOrder[] | null = null;

export function useAdminOrders() {
  const { authFetch } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "any";

  const [orders, setOrders] = useState<WCOrder[]>(cachedOrdersFiltered || cachedOrdersAll || []);
  const [allOrders, setAllOrders] = useState<WCOrder[]>(cachedOrdersAll || []);
  const [loading, setLoading] = useState(!cachedOrdersAll);
  const [updating, setUpdating] = useState<string | number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & toasts
  const [statusModal, setStatusModal] = useState<WCOrder | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [warningModal, setWarningModal] = useState<WarningModalData | null>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModalData | null>(null);
  const [infoModal, setInfoModal] = useState<InfoModalData | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Escape closes the top-most dialog and background scrolling is locked while open
  useEffect(() => {
    if (!statusModal && !warningModal && !paymentModal && !infoModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (infoModal) {
        setInfoModal(null);
        return;
      }
      if (paymentModal) {
        setPaymentModal(null);
        return;
      }
      if (warningModal) {
        setWarningModal(null);
        return;
      }
      setStatusModal(null);
      setSelectedStatus(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [statusModal, warningModal, paymentModal, infoModal]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const copyValue = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied`, "success");
    } catch {
      showToast("Clipboard access was blocked by the browser", "error");
    }
  }, [showToast]);

  const load = useCallback(
    async (status = "any", showSpinner = !cachedOrdersAll) => {
      if (showSpinner) setLoading(true);
      try {
        const query = status && status !== "any" ? `?status=${status}&per_page=100` : "?per_page=100";
        const res = await authFetch(`/api/admin/orders${query}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.orders ?? [];
          cachedOrdersFiltered = list;
          setOrders(list);
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  const loadAllCounts = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin/orders?per_page=200&status=any");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.orders ?? [];
        cachedOrdersAll = list;
        setAllOrders(list);
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  useEffect(() => {
    void load(initialStatus);
    void loadAllCounts();
  }, [load, loadAllCounts, initialStatus]);

  // Auto-refresh every 30 seconds only when tab is visible
  useEffect(() => {
    const refresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      void load(filterStatus, false);
      void loadAllCounts();
    };

    const timer = setInterval(refresh, REFRESH_INTERVAL);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load(filterStatus, false);
        void loadAllCounts();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load, loadAllCounts, filterStatus]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { any: allOrders.length };
    allOrders.forEach((o) => {
      map[o.status] = (map[o.status] ?? 0) + 1;
    });
    return map;
  }, [allOrders]);

  const handleStatusChange = async (
    orderId: string | number,
    newStatus: string,
    options: { revertPayment?: boolean } = {}
  ): Promise<boolean> => {
    setUpdating(orderId);
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (newStatus === "completed") payload.paymentStatus = "paid";
      if (options.revertPayment) payload.paymentStatus = "pending";

      const res = await authFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        showToast(`Failed to update order #${orderId}`, "error");
        return false;
      }

      await res.json();

      const nextPayment =
        newStatus === "completed" ? "paid" : options.revertPayment ? "pending" : undefined;

      const apply = (o: WCOrder): WCOrder =>
        o.id === orderId || o.number === String(orderId)
          ? {
              ...o,
              status: newStatus,
              ...(nextPayment
                ? { payment_status: nextPayment, paymentStatus: nextPayment }
                : {}),
            }
          : o;

      setOrders((prev) => prev.map(apply));
      setAllOrders((prev) => prev.map(apply));
      setStatusModal((prev) => (prev ? apply(prev) : null));

      showToast(`Order #${orderId} marked ${newStatus.replace("-", " ")}`, "success");
      return true;
    } catch {
      showToast("Network error — please try again", "error");
      return false;
    } finally {
      setUpdating(null);
    }
  };

  const handleTogglePayment = async (orderId: string | number, currentPaymentStatus?: string) => {
    const isPaid = currentPaymentStatus === "paid";
    const nextStatus = isPaid ? "pending" : "paid";
    setUpdating(orderId);
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.number === String(orderId)
              ? { ...o, payment_status: nextStatus, paymentStatus: nextStatus }
              : o
          )
        );
        setAllOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.number === String(orderId)
              ? { ...o, payment_status: nextStatus, paymentStatus: nextStatus }
              : o
          )
        );
        showToast(`Order #${orderId} payment marked as ${nextStatus.toUpperCase()}`, "success");
      } else {
        showToast("Failed to update payment status", "error");
      }
    } catch {
      showToast("Network error — please try again", "error");
    } finally {
      setUpdating(null);
    }
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    void load(status);
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o) => {
      const name = `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.toLowerCase();
      return (
        name.includes(q) ||
        String(o.number || o.id).includes(q) ||
        o.billing?.phone?.includes(q) ||
        o.billing?.email?.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  return {
    orders,
    allOrders,
    loading,
    updating,
    filterStatus,
    searchQuery,
    setSearchQuery,
    statusCounts,
    filteredOrders,
    statusModal,
    setStatusModal,
    selectedStatus,
    setSelectedStatus,
    warningModal,
    setWarningModal,
    paymentModal,
    setPaymentModal,
    infoModal,
    setInfoModal,
    toast,
    setToast,
    load,
    handleStatusChange,
    handleTogglePayment,
    handleFilterChange,
    copyValue,
    showToast,
  };
}

export type AdminOrdersHookReturn = ReturnType<typeof useAdminOrders>;
