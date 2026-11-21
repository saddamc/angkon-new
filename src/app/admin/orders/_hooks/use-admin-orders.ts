"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import type {
  WCOrder,
  InfoModalData,
  WarningModalData,
  PaymentModalData,
  PaymentDetailsData,
  ShipmentRecord,
  CourierProvidersState,
  CourierOverviewData,
  ApiCourierKey,
  CreateShipmentOptions,
  OrdersSummaryStats,
  OrderDetailsPayload,
  ComputedOrderFinancialsUI,
  ToastData,
  OrderParcelWeightSummaryUI,
  PackagingPresetUI,
} from "../_types/orders.types";
import { getCourierLabel } from "@/server/courier/tracking";

const REFRESH_INTERVAL = 30_000;
const PER_PAGE = 25;

const DEFAULT_SUMMARY: OrdersSummaryStats = {
  totalOrders: 0,
  pendingCount: 0,
  readyToShipCount: 0,
  shippedCount: 0,
  deliveredCount: 0,
  cancelledReturnedCount: 0,
  activeShipments: 0,
  totalRevenue: 0,
  paidRevenue: 0,
  outstandingBalance: 0,
  codCollectedAwaitingSettlement: 0,
  codCollectedCount: 0,
  discrepancyCount: 0,
  paymentIssuesCount: 0,
  needsActionCount: 0,
};

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

  // Filters & Pagination (Stage 1)
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus);
  const [paymentFilter, setPaymentFilter] = useState<string>("any");
  const [shipmentFilter, setShipmentFilter] = useState<string>("any");
  const [courierFilter, setCourierFilter] = useState<string>("any");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [serverStatusCounts, setServerStatusCounts] = useState<Record<string, number> | null>(null);
  const [summary, setSummary] = useState<OrdersSummaryStats>(DEFAULT_SUMMARY);

  // Modals, Drawer & Toasts
  const [statusModal, setStatusModal] = useState<WCOrder | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [warningModal, setWarningModal] = useState<WarningModalData | null>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModalData | null>(null);
  const [infoModal, setInfoModal] = useState<InfoModalData | null>(null);
  const [paymentDetailsModal, setPaymentDetailsModal] = useState<WCOrder | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetailsData | null>(null);
  const [paymentDetailsLoading, setPaymentDetailsLoading] = useState(false);
  const [paymentDetailsError, setPaymentDetailsError] = useState<string | null>(null);

  // Order Details Drawer (Stage 2)
  const [detailsOrderNumber, setDetailsOrderNumber] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<OrderDetailsPayload | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Shipment Modal (Stage 4)
  const [shipmentModal, setShipmentModal] = useState<WCOrder | null>(null);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [shipmentConfigured, setShipmentConfigured] = useState(false);
  const [shipmentEligibility, setShipmentEligibility] = useState<{
    ok: boolean;
    code?: string;
    reason?: string;
  } | null>(null);
  const [shipmentFinancials, setShipmentFinancials] =
    useState<ComputedOrderFinancialsUI | null>(null);
  const [shipmentWeightData, setShipmentWeightData] =
    useState<OrderParcelWeightSummaryUI | null>(null);
  const [shipmentPackagingPresets, setShipmentPackagingPresets] = useState<PackagingPresetUI[]>([]);
  const [shipmentBookingState, setShipmentBookingState] = useState<string>("not_booked");
  const [courierOperatingMode, setCourierOperatingMode] = useState<"mock" | "live">("mock");
  const [courierProviders, setCourierProviders] = useState<CourierProvidersState>({
    steadfast: { configured: false, enabled: true, supported: true, label: "Steadfast Courier" },
    pathao: {
      configured: false,
      enabled: false,
      supported: false,
      disabledReason: "Pathao integration will be enabled in a future release.",
      label: "Pathao Courier",
    },
  });
  const [courierOverview, setCourierOverview] = useState<CourierOverviewData | null>(null);
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [shipmentError, setShipmentError] = useState<string | null>(null);
  const [shipmentBusy, setShipmentBusy] = useState(false);
  const [syncingShipments, setSyncingShipments] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [codFallbackModal, setCodFallbackModal] = useState<WCOrder | null>(null);
  const [codFallbackBusy, setCodFallbackBusy] = useState(false);
  const [whatsappModal, setWhatsappModal] = useState<WCOrder | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Escape closes the top-most dialog and locks background scrolling
  useEffect(() => {
    if (
      !statusModal &&
      !warningModal &&
      !paymentModal &&
      !infoModal &&
      !paymentDetailsModal &&
      !shipmentModal &&
      !detailsOrderNumber &&
      !bulkModalOpen &&
      !codFallbackModal &&
      !whatsappModal
    ) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (whatsappModal) {
        setWhatsappModal(null);
        return;
      }
      if (shipmentModal) {
        setShipmentModal(null);
        return;
      }
      if (paymentDetailsModal) {
        setPaymentDetailsModal(null);
        return;
      }
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
      if (statusModal) {
        setStatusModal(null);
        setSelectedStatus(null);
        return;
      }
      if (detailsOrderNumber) {
        setDetailsOrderNumber(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [
    statusModal,
    warningModal,
    paymentModal,
    infoModal,
    paymentDetailsModal,
    shipmentModal,
    detailsOrderNumber,
    bulkModalOpen,
    codFallbackModal,
    whatsappModal,
  ]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const copyValue = useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value);
        showToast(`${label} copied`, "success");
      } catch {
        showToast("Clipboard access was blocked by the browser", "error");
      }
    },
    [showToast]
  );

  const [refreshingBalance, setRefreshingBalance] = useState(false);

  const loadCourierOverview = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshingBalance(true);
      try {
        const res = await authFetch("/api/admin/couriers/overview");
        if (!res.ok) {
          if (isManual) showToast("Failed to fetch courier status", "error");
          return;
        }
        const data = (await res.json()) as CourierOverviewData;
        setCourierOverview(data);
        if (data?.providers) {
          setCourierProviders(data.providers);
        }
        if (isManual) {
          if (data.balances?.steadfast?.error) {
            showToast(`Steadfast: ${data.balances.steadfast.error}`, "error");
          } else {
            showToast("Steadfast Account Balance refreshed", "success");
          }
        }
      } catch {
        if (isManual) showToast("Connection error fetching courier status", "error");
      } finally {
        if (isManual) setRefreshingBalance(false);
      }
    },
    [authFetch, showToast]
  );

  const buildFilterQuery = useCallback(
    (overrides?: {
      status?: string;
      courier?: string;
      payment?: string;
      shipment?: string;
      from?: string;
      to?: string;
      search?: string;
      targetPage?: number;
      perPage?: number;
    }) => {
      const params = new URLSearchParams();
      params.set("per_page", String(overrides?.perPage ?? PER_PAGE));
      params.set("page", String(overrides?.targetPage ?? page));

      const s = overrides?.status ?? filterStatus;
      const c = overrides?.courier ?? courierFilter;
      const p = overrides?.payment ?? paymentFilter;
      const sh = overrides?.shipment ?? shipmentFilter;
      const df = overrides?.from ?? dateFrom;
      const dt = overrides?.to ?? dateTo;
      const q = overrides?.search ?? searchQuery;

      if (s && s !== "any") params.set("status", s);
      if (c && c !== "any") params.set("courier", c);
      if (p && p !== "any") params.set("payment_status", p);
      if (sh && sh !== "any") params.set("shipment_status", sh);
      if (df) params.set("date_from", df);
      if (dt) params.set("date_to", dt);
      if (q.trim()) params.set("search", q.trim());

      return params;
    },
    [page, filterStatus, courierFilter, paymentFilter, shipmentFilter, dateFrom, dateTo, searchQuery]
  );

  const load = useCallback(
    async (
      status = filterStatus,
      showSpinner = !cachedOrdersAll,
      courier = courierFilter,
      targetPage = page,
      extra?: { payment?: string; shipment?: string; from?: string; to?: string; search?: string }
    ) => {
      if (showSpinner) setLoading(true);
      try {
        const params = buildFilterQuery({
          status,
          courier,
          targetPage,
          payment: extra?.payment,
          shipment: extra?.shipment,
          from: extra?.from,
          to: extra?.to,
          search: extra?.search,
        });
        const res = await authFetch(`/api/admin/orders?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.orders ?? [];
          cachedOrdersFiltered = list;
          cachedOrdersAll = list;
          setOrders(list);
          setAllOrders(list);
          setTotalCount(Number(data?.total ?? list.length));
          setTotalPages(Number(data?.totalPages ?? 1));
          if (data?.statusCounts) {
            setServerStatusCounts(data.statusCounts);
          }
          if (data?.summary) {
            setSummary(data.summary);
          }
          if (data?.courierProviders) {
            setCourierProviders((prev) => ({
              steadfast: {
                ...prev.steadfast,
                configured: Boolean(data.courierProviders?.steadfast?.configured),
                enabled: data.courierProviders?.steadfast?.enabled ?? prev.steadfast.enabled,
              },
              pathao: {
                ...prev.pathao,
                configured: false,
                enabled: false,
                supported: false,
              },
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    },
    [authFetch, buildFilterQuery, courierFilter, filterStatus, page]
  );

  useEffect(() => {
    void load(initialStatus, !cachedOrdersAll, "any", 1);
    void loadCourierOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced server-side search trigger when typing search query
  useEffect(() => {
    const timer = setTimeout(() => {
      void load(filterStatus, false, courierFilter, 1, { search: searchQuery });
    }, 280);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Auto-refresh every 30s while tab visible
  useEffect(() => {
    const refresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      void load(filterStatus, false);
    };

    const timer = setInterval(refresh, REFRESH_INTERVAL);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load(filterStatus, false);
        void loadCourierOverview();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load, loadCourierOverview, filterStatus]);

  const statusCounts = useMemo(() => {
    if (serverStatusCounts) {
      // Combine legacy completed into delivered for clean pill count
      return {
        ...serverStatusCounts,
        delivered:
          (serverStatusCounts.delivered ?? 0) + (serverStatusCounts.completed ?? 0),
        returned:
          (serverStatusCounts.returned ?? 0) + (serverStatusCounts.refunded ?? 0),
      };
    }
    const map: Record<string, number> = { any: allOrders.length };
    allOrders.forEach((o) => {
      map[o.status] = (map[o.status] ?? 0) + 1;
    });
    return map;
  }, [serverStatusCounts, allOrders]);

  const fetchOrderDetails = useCallback(
    async (orderIdOrNumber: string | number) => {
      setDetailsLoading(true);
      setDetailsError(null);
      try {
        const res = await authFetch(`/api/admin/orders/${orderIdOrNumber}/details`);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setDetailsError(d.error || "Could not load full order details.");
          return;
        }
        setDetailsData(await res.json());
      } catch {
        setDetailsError("Network error while loading order details.");
      } finally {
        setDetailsLoading(false);
      }
    },
    [authFetch]
  );

  const openOrderDetails = useCallback(
    (orderIdOrNumber: string | number) => {
      const key = String(orderIdOrNumber);
      setDetailsOrderNumber(key);
      setDetailsData(null);
      void fetchOrderDetails(key);
    },
    [fetchOrderDetails]
  );

  const closeOrderDetails = useCallback(() => {
    setDetailsOrderNumber(null);
    setDetailsData(null);
    setDetailsError(null);
  }, []);

  const handleStatusChange = async (
    orderId: string | number,
    newStatus: string,
    options: { revertPayment?: boolean; reason?: string } = {}
  ): Promise<boolean> => {
    setUpdating(orderId);
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (options.reason) payload.reason = options.reason;
      if (options.revertPayment) payload.paymentStatus = "pending";

      const res = await authFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body.error || `Failed to update order #${orderId}`, "error");
        return false;
      }

      if (body?.autoBook?.booked) {
        showToast(
          `Order #${orderId} updated & auto-booked via ${getCourierLabel(body.autoBook.courier)} (${body.autoBook.trackingCode || "active"})`,
          "success"
        );
      } else {
        showToast(`Order #${orderId} marked ${newStatus.replace(/_/g, " ")}`, "success");
      }

      await load(filterStatus, false);
      if (detailsOrderNumber === String(orderId)) {
        void fetchOrderDetails(orderId);
      }
      return true;
    } catch {
      showToast("Network error — please try again", "error");
      return false;
    } finally {
      setUpdating(null);
    }
  };

  const reopenOrder = useCallback(
    async (orderId: string | number, reason: string): Promise<boolean> => {
      setUpdating(orderId);
      try {
        const res = await authFetch(`/api/admin/orders/${orderId}/reopen`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(data.error || `Could not reopen order #${orderId}`, "error");
          return false;
        }
        showToast(data.message || `Order #${orderId} successfully reopened.`, "success");
        await load(filterStatus, false);
        if (detailsOrderNumber === String(orderId)) {
          void fetchOrderDetails(orderId);
        }
        return true;
      } catch {
        showToast("Network error while reopening order.", "error");
        return false;
      } finally {
        setUpdating(null);
      }
    },
    [authFetch, detailsOrderNumber, fetchOrderDetails, filterStatus, load, showToast]
  );

  const handleTogglePayment = async (orderId: string | number, currentPaymentStatus?: string) => {
    const isPaid = currentPaymentStatus === "paid";
    const nextStatus = isPaid ? "pending" : "paid";
    setUpdating(orderId);
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`Order #${orderId} payment marked as ${nextStatus.toUpperCase()}`, "success");
        await load(filterStatus, false);
        if (detailsOrderNumber === String(orderId)) {
          void fetchOrderDetails(orderId);
        }
      } else {
        showToast(body.error || "Failed to update payment status", "error");
      }
    } catch {
      showToast("Network error — please try again", "error");
    } finally {
      setUpdating(null);
    }
  };

  const addAdminNote = useCallback(
    async (orderId: string | number, text: string) => {
      try {
        const res = await authFetch(`/api/admin/orders/${orderId}/notes`, {
          method: "POST",
          body: JSON.stringify({ text }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(data.error || "Could not add admin note.", "error");
          return false;
        }
        showToast("Admin note saved", "success");
        void fetchOrderDetails(orderId);
        return true;
      } catch {
        showToast("Network error while saving note.", "error");
        return false;
      }
    },
    [authFetch, fetchOrderDetails, showToast]
  );

  const reconcileSettlement = useCallback(
    async (
      orderId: string | number,
      payload: {
        collectedCodAmount?: number;
        settledCodAmount: number;
        courierCharge: number;
        settlementNote?: string;
        markSettled?: boolean;
      }
    ) => {
      try {
        const res = await authFetch(`/api/admin/orders/${orderId}/settlement`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(data.error || "Failed to save COD settlement.", "error");
          return false;
        }
        showToast(
          data.codSettlementStatus === "discrepancy"
            ? "Settlement saved — Discrepancy flagged for audit"
            : "COD settlement reconciled",
          "success"
        );
        await load(filterStatus, false);
        void fetchOrderDetails(orderId);
        return true;
      } catch {
        showToast("Network error while updating settlement.", "error");
        return false;
      }
    },
    [authFetch, fetchOrderDetails, filterStatus, load, showToast]
  );

  const recordManualPayment = useCallback(
    async (
      orderId: string | number,
      payload: {
        action: "advance" | "refund";
        amount: number;
        method?: string;
        reference?: string;
        note?: string;
      }
    ) => {
      try {
        const res = await authFetch(`/api/admin/orders/${orderId}/payments/manual`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(data.error || "Failed to record payment entry.", "error");
          return false;
        }
        showToast(
          payload.action === "refund"
            ? "Refund recorded & audited"
            : "Payment recorded & COD updated",
          "success"
        );
        await load(filterStatus, false);
        void fetchOrderDetails(orderId);
        return true;
      } catch {
        showToast("Network error while recording payment.", "error");
        return false;
      }
    },
    [authFetch, fetchOrderDetails, filterStatus, load, showToast]
  );

  const fetchPaymentDetails = useCallback(
    async (order: WCOrder) => {
      setPaymentDetailsLoading(true);
      setPaymentDetailsError(null);
      try {
        const res = await authFetch(`/api/admin/orders/${order.id}/payments`);
        if (!res.ok) {
          setPaymentDetailsError("Could not load payment history for this order.");
          return;
        }
        setPaymentDetails(await res.json());
      } catch {
        setPaymentDetailsError("Network error while loading payment history.");
      } finally {
        setPaymentDetailsLoading(false);
      }
    },
    [authFetch]
  );

  const openPaymentDetails = useCallback(
    (order: WCOrder) => {
      setPaymentDetailsModal(order);
      setPaymentDetails(null);
      setPaymentDetailsError(null);
      void fetchPaymentDetails(order);
    },
    [fetchPaymentDetails]
  );

  const reconcilePayments = useCallback(
    async (orderNumber: string, orderId?: string | number) => {
      setUpdating(orderId ?? orderNumber);
      try {
        const res = await authFetch("/api/payment/sslcommerz/reconcile", {
          method: "POST",
          body: JSON.stringify({ orderNumber }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          showToast(data.error || "Payment reconciliation failed", "error");
          return false;
        }
        showToast(
          `Reconciled: ${data.settled} settled · ${data.rejected} rejected · ${data.skipped} pending`,
          data.rejected > 0 ? "error" : "success"
        );
        if (paymentDetailsModal) void fetchPaymentDetails(paymentDetailsModal);
        if (detailsOrderNumber === orderNumber) void fetchOrderDetails(orderNumber);
        await load(filterStatus, false);
        return true;
      } catch {
        showToast("Network error while reconciling payments", "error");
        return false;
      } finally {
        setUpdating(null);
      }
    },
    [
      authFetch,
      detailsOrderNumber,
      fetchOrderDetails,
      fetchPaymentDetails,
      filterStatus,
      load,
      paymentDetailsModal,
      showToast,
    ]
  );

  const fetchShipments = useCallback(
    async (order: WCOrder) => {
      setShipmentLoading(true);
      setShipmentError(null);
      try {
        const res = await authFetch(`/api/admin/orders/${order.id}/shipment`);
        if (!res.ok) {
          setShipmentError("Could not load shipment history for this order.");
          return;
        }
        const data = await res.json();
        setShipments(Array.isArray(data.shipments) ? data.shipments : []);
        setShipmentConfigured(Boolean(data.configured));
        setShipmentEligibility(data.eligibility || null);
        setShipmentFinancials(data.financials || null);
        setShipmentWeightData(data.weightSummary || null);
        setShipmentPackagingPresets(
          Array.isArray(data.packagingPresets) ? data.packagingPresets : []
        );
        setShipmentBookingState(data.shipmentBookingState || "not_booked");
        if (data.courierOperatingMode) {
          setCourierOperatingMode(data.courierOperatingMode);
        }
      } catch {
        setShipmentError("Network error while loading shipment history.");
      } finally {
        setShipmentLoading(false);
      }
    },
    [authFetch]
  );

  const openShipment = useCallback(
    (order: WCOrder) => {
      setShipmentModal(order);
      setShipments([]);
      setShipmentError(null);
      setShipmentEligibility(null);
      setShipmentFinancials(null);
      setShipmentWeightData(null);
      setShipmentPackagingPresets([]);
      void fetchShipments(order);
    },
    [fetchShipments]
  );

  const createShipment = useCallback(
    async (
      order: WCOrder,
      note: string,
      provider: ApiCourierKey = "steadfast",
      options?: CreateShipmentOptions
    ) => {
      setShipmentBusy(true);
      setShipmentError(null);
      setShipmentBookingState("booking_in_progress");
      try {
        const res = await authFetch(`/api/admin/orders/${order.id}/shipment`, {
          method: "POST",
          body: JSON.stringify({
            note,
            provider,
            ...(options?.recipient ? { recipient: options.recipient } : {}),
            ...(options?.providerMeta ? { providerMeta: options.providerMeta } : {}),
            ...(options?.allowCodFallback ? { allowCodFallback: true } : {}),
            ...(options?.confirmLiveBooking ? { confirmLiveBooking: true } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          setShipmentBookingState("booking_failed");
          setShipmentError(data.error || "Could not create the courier consignment.");
          showToast(data.error || "Could not create the courier consignment.", "error");
          return false;
        }
        const label = getCourierLabel(provider);
        showToast(
          data.existing
            ? `${label} consignment already assigned (${data.shipment?.trackingCode || data.shipment?.consignmentId || "active"})`
            : `Order #${order.number || order.id} booked with ${label}`,
          "success"
        );
        await fetchShipments(order);
        await load(filterStatus, false);
        if (detailsOrderNumber === String(order.id)) void fetchOrderDetails(order.id);
        void loadCourierOverview();
        return true;
      } catch {
        setShipmentBookingState("booking_failed");
        setShipmentError("Network error while creating the consignment.");
        showToast("Network error while creating the consignment.", "error");
        return false;
      } finally {
        setShipmentBusy(false);
      }
    },
    [
      authFetch,
      detailsOrderNumber,
      fetchOrderDetails,
      fetchShipments,
      filterStatus,
      load,
      loadCourierOverview,
      showToast,
    ]
  );

  const cancelShipment = useCallback(
    async (order: WCOrder, reason?: string) => {
      setShipmentBusy(true);
      setShipmentError(null);
      setShipmentBookingState("cancellation_pending");
      try {
        const res = await authFetch(`/api/admin/orders/${order.id}/shipment`, {
          method: "DELETE",
          body: JSON.stringify({ reason }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          setShipmentBookingState("booked");
          setShipmentError(data.error || "Could not cancel the courier consignment.");
          showToast(data.error || "Could not cancel the courier consignment.", "error");
          return false;
        }
        showToast(`Consignment cancelled for #${order.number || order.id}`, "success");
        await fetchShipments(order);
        await load(filterStatus, false);
        if (detailsOrderNumber === String(order.id)) void fetchOrderDetails(order.id);
        return true;
      } catch {
        setShipmentBookingState("booked");
        setShipmentError("Network error while cancelling consignment.");
        return false;
      } finally {
        setShipmentBusy(false);
      }
    },
    [authFetch, detailsOrderNumber, fetchOrderDetails, fetchShipments, filterStatus, load, showToast]
  );

  const saveProductWeight = useCallback(
    async (
      productId: number,
      weight: number,
      weightUnit: "g" | "kg" = "kg",
      shippingCategory?: string
    ) => {
      try {
        const res = await authFetch(`/api/admin/products/${productId}/shipping-weight`, {
          method: "PATCH",
          body: JSON.stringify({ weight, weightUnit, shippingCategory }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          showToast(data.error || "Could not save product weight.", "error");
          return false;
        }
        showToast(data.message || "Product weight saved.", "success");
        if (shipmentModal) {
          void fetchShipments(shipmentModal);
        }
        return true;
      } catch {
        showToast("Network error while saving product weight.", "error");
        return false;
      }
    },
    [authFetch, showToast, shipmentModal, fetchShipments]
  );

  const saveManualDelivery = useCallback(
    async (order: WCOrder, courier: string, trackingCode: string) => {
      setShipmentBusy(true);
      setShipmentError(null);
      try {
        const res = await authFetch(`/api/admin/orders/${order.id}/shipment`, {
          method: "PATCH",
          body: JSON.stringify({ courier, trackingCode }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          setShipmentError(data.error || "Could not save delivery information.");
          showToast(data.error || "Could not save delivery information.", "error");
          return false;
        }
        showToast(`Delivery info saved for #${order.number || order.id}`, "success");
        await fetchShipments(order);
        await load(filterStatus, false);
        if (detailsOrderNumber === String(order.id)) void fetchOrderDetails(order.id);
        return true;
      } catch {
        setShipmentError("Network error while saving delivery information.");
        showToast("Network error while saving delivery information.", "error");
        return false;
      } finally {
        setShipmentBusy(false);
      }
    },
    [authFetch, detailsOrderNumber, fetchOrderDetails, fetchShipments, filterStatus, load, showToast]
  );

  const syncActiveShipments = useCallback(async () => {
    setSyncingShipments(true);
    try {
      const res = await authFetch("/api/admin/shipments/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        showToast(data.error || "Could not sync courier statuses.", "error");
        return false;
      }
      if (data.scanned === 0) {
        showToast("No active shipments pending sync", "success");
      } else {
        showToast(
          `Synced ${data.synced}/${data.scanned} shipments (${data.changed} updated)`,
          data.failed > 0 ? "error" : "success"
        );
      }
      await load(filterStatus, false);
      void loadCourierOverview();
      return true;
    } catch {
      showToast("Network error while syncing courier statuses.", "error");
      return false;
    } finally {
      setSyncingShipments(false);
    }
  }, [authFetch, filterStatus, load, loadCourierOverview, showToast]);

  const toggleSelectOrder = useCallback((orderId: string | number) => {
    const key = String(orderId);
    setSelectedOrderIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedOrderIds([]);
  }, []);

  const bulkSendToCourier = useCallback(
    async (provider: ApiCourierKey = "steadfast") => {
      if (selectedOrderIds.length === 0) return;
      setBulkSending(true);
      let sent = 0;
      let skipped = 0;
      let lastError = "";

      for (const id of selectedOrderIds) {
        const order = orders.find((o) => String(o.id) === id);
        if (!order || ["cancelled", "refunded", "failed", "pending"].includes(order.status)) {
          skipped += 1;
          lastError = "Only Confirmed/Processing/Ready-to-Ship orders can be bulk booked.";
          continue;
        }
        try {
          const res = await authFetch(`/api/admin/orders/${order.id}/shipment`, {
            method: "POST",
            body: JSON.stringify({ provider, note: "" }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok !== false) {
            sent += 1;
          } else {
            skipped += 1;
            lastError = data.error || lastError;
          }
        } catch {
          skipped += 1;
          lastError = "Network error";
        }
      }

      setBulkSending(false);
      setSelectedOrderIds([]);
      const label = getCourierLabel(provider);
      if (sent > 0) {
        showToast(
          `Booked ${sent} order${sent > 1 ? "s" : ""} via ${label}${skipped > 0 ? ` (${skipped} skipped)` : ""}`,
          "success"
        );
      } else {
        showToast(lastError || "No selected orders were eligible for courier booking.", "error");
      }
      await load(filterStatus, false);
      void loadCourierOverview();
    },
    [authFetch, filterStatus, load, loadCourierOverview, orders, selectedOrderIds, showToast]
  );

  const applyCodFallback = useCallback(
    async (orderId: string | number, reason: string, customerAgreed: boolean) => {
      setCodFallbackBusy(true);
      try {
        const res = await authFetch(`/api/admin/orders/${orderId}/payment/cod-fallback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, customerAgreed }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          showToast(data.error || "Failed to switch order to COD", "error");
          return false;
        }
        showToast(data.message || "Order switched to Cash on Delivery", "success");
        setCodFallbackModal(null);
        await load(filterStatus, false);
        if (detailsOrderNumber === String(orderId)) {
          void fetchOrderDetails(orderId);
        }
        return true;
      } catch {
        showToast("Network error applying COD fallback", "error");
        return false;
      } finally {
        setCodFallbackBusy(false);
      }
    },
    [authFetch, detailsOrderNumber, fetchOrderDetails, filterStatus, load, showToast]
  );

  const refreshShipment = useCallback(
    async (shipmentId: string) => {
      setShipmentBusy(true);
      setShipmentError(null);
      try {
        const res = await authFetch(`/api/admin/shipments/${shipmentId}/refresh`, {
          method: "POST",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          setShipmentError(data.error || "Could not refresh the courier status.");
          showToast(data.error || "Could not refresh the courier status.", "error");
          return false;
        }
        showToast(`Courier status: ${data.shipment?.status || "updated"}`, "success");
        if (shipmentModal) await fetchShipments(shipmentModal);
        if (detailsOrderNumber) void fetchOrderDetails(detailsOrderNumber);
        await load(filterStatus, false);
        return true;
      } catch {
        setShipmentError("Network error while refreshing the courier status.");
        showToast("Network error while refreshing the courier status.", "error");
        return false;
      } finally {
        setShipmentBusy(false);
      }
    },
    [
      authFetch,
      detailsOrderNumber,
      fetchOrderDetails,
      fetchShipments,
      filterStatus,
      load,
      shipmentModal,
      showToast,
    ]
  );

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setPage(1);
    void load(status, true, courierFilter, 1);
  };

  const handleCourierFilterChange = (courier: string) => {
    setCourierFilter(courier);
    setPage(1);
    void load(filterStatus, true, courier, 1);
  };

  const handlePaymentFilterChange = (payment: string) => {
    setPaymentFilter(payment);
    setPage(1);
    void load(filterStatus, true, courierFilter, 1, { payment });
  };

  const handleShipmentFilterChange = (shipment: string) => {
    setShipmentFilter(shipment);
    setPage(1);
    void load(filterStatus, true, courierFilter, 1, { shipment });
  };

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
    void load(filterStatus, true, courierFilter, 1, { from, to });
  };

  const clearAllFilters = () => {
    setFilterStatus("any");
    setPaymentFilter("any");
    setShipmentFilter("any");
    setCourierFilter("any");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setPage(1);
    void load("any", true, "any", 1, {
      payment: "any",
      shipment: "any",
      from: "",
      to: "",
      search: "",
    });
  };

  const goToPage = (targetPage: number) => {
    const safePage = Math.max(1, Math.min(totalPages, targetPage));
    setPage(safePage);
    void load(filterStatus, true, courierFilter, safePage);
  };

  const exportOrdersCsv = () => {
    const params = buildFilterQuery();
    params.set("export", "csv");
    window.open(`/api/admin/orders?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o) => {
      const name = `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.toLowerCase();
      return (
        name.includes(q) ||
        String(o.number || o.id).toLowerCase().includes(q) ||
        o.billing?.phone?.includes(q) ||
        o.billing?.email?.toLowerCase().includes(q) ||
        o.trackingCode?.toLowerCase().includes(q) ||
        o.consignmentId?.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  const toggleSelectAllVisible = useCallback(() => {
    const visibleIds = filteredOrders.map((o) => String(o.id));
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedOrderIds.includes(id));
    setSelectedOrderIds(allSelected ? [] : visibleIds);
  }, [filteredOrders, selectedOrderIds]);

  const openWhatsApp = useCallback((order: WCOrder) => {
    setWhatsappModal(order);
  }, []);

  const closeWhatsApp = useCallback(() => {
    setWhatsappModal(null);
  }, []);

  return {
    orders,
    allOrders,
    loading,
    updating,
    filterStatus,
    paymentFilter,
    shipmentFilter,
    courierFilter,
    dateFrom,
    dateTo,
    page,
    totalPages,
    totalCount,
    summary,
    handleCourierFilterChange,
    handlePaymentFilterChange,
    handleShipmentFilterChange,
    handleDateRangeChange,
    clearAllFilters,
    goToPage,
    exportOrdersCsv,
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
    paymentDetailsModal,
    setPaymentDetailsModal,
    paymentDetails,
    paymentDetailsLoading,
    paymentDetailsError,
    openPaymentDetails,
    reconcilePayments,
    detailsOrderNumber,
    detailsData,
    detailsLoading,
    detailsError,
    openOrderDetails,
    closeOrderDetails,
    addAdminNote,
    reconcileSettlement,
    recordManualPayment,
    shipmentModal,
    setShipmentModal,
    shipments,
    shipmentConfigured,
    shipmentEligibility,
    shipmentFinancials,
    shipmentWeightData,
    shipmentPackagingPresets,
    saveProductWeight,
    shipmentBookingState,
    courierOperatingMode,
    courierProviders,
    courierOverview,
    loadCourierOverview,
    refreshingBalance,
    shipmentLoading,
    shipmentError,
    shipmentBusy,
    syncingShipments,
    bulkSending,
    bulkModalOpen,
    setBulkModalOpen,
    codFallbackModal,
    setCodFallbackModal,
    codFallbackBusy,
    applyCodFallback,
    whatsappModal,
    setWhatsappModal,
    openWhatsApp,
    closeWhatsApp,
    selectedOrderIds,
    toggleSelectOrder,
    toggleSelectAllVisible,
    clearSelection,
    openShipment,
    createShipment,
    cancelShipment,
    saveManualDelivery,
    refreshShipment,
    syncActiveShipments,
    bulkSendToCourier,
    toast,
    setToast,
    load,
    handleStatusChange,
    reopenOrder,
    handleTogglePayment,
    handleFilterChange,
    copyValue,
    showToast,
  };
}

export type AdminOrdersHookReturn = ReturnType<typeof useAdminOrders>;
