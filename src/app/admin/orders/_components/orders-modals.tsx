"use client";

import { useEffect, useState } from "react";
import {
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ClipboardList,
  Banknote,
  Copy,
  CreditCard,
  RefreshCw,
  Truck,
  ExternalLink,
  Package,
  Wallet,
  Scale,
  Save,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CourierLogo } from "@/components/admin/courier-logo";
import { CourierPrintAction } from "./courier-print-action";
import {
  STATUS_OPTIONS,
  MANUAL_ORDER_STATUS_OPTIONS,
  FINAL_STATUSES,
  formatBDT,
  type ApiCourierKey,
  type WCOrder,
} from "../_types/orders.types";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";
import { normalizeBdPhone } from "@/server/courier/steadfast-utils";
import {
  getCourierLabel,
  getCourierTrackingUrl,
} from "@/server/courier/tracking";
import { BulkShipmentModal } from "./bulk-shipment-modal";
import { WhatsAppModal } from "./whatsapp-modal";
import {
  PACKAGING_PRESETS,
  getPackagingPreset,
  type DisplayParcelType,
} from "@/server/courier/parcel-classifier";

interface OrdersModalsProps {
  state: AdminOrdersHookReturn;
}

function paymentStatusClass(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "partially_paid")
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (s === "pending" || s === "initiated")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "failed" || s === "cancelled")
    return "bg-rose-50 text-rose-700 border-rose-200";
  if (s === "refunded" || s === "partially_refunded")
    return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function formatPaymentDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function shipmentStatusClass(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "partial_delivered")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "in_transit" || s === "out_for_delivery" || s === "pending" || s === "created")
    return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "cancelled" || s === "returned" || s === "failed")
    return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function PaymentField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className={`mt-0.5 break-all text-[11px] text-slate-700 ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export function OrdersModals({ state }: OrdersModalsProps) {
  const {
    statusModal,
    setStatusModal,
    selectedStatus,
    setSelectedStatus,
    paymentModal,
    setPaymentModal,
    warningModal,
    setWarningModal,
    infoModal,
    setInfoModal,
    paymentDetailsModal,
    setPaymentDetailsModal,
    paymentDetails,
    paymentDetailsLoading,
    paymentDetailsError,
    reconcilePayments,
    shipmentModal,
    setShipmentModal,
    shipments,
    shipmentConfigured,
    shipmentEligibility,
    shipmentFinancials,
    shipmentWeightData,
    saveProductWeight,
    courierOperatingMode,
    courierProviders,
    courierOverview,
    shipmentLoading,
    shipmentError,
    shipmentBusy,
    createShipment,
    cancelShipment,
    refreshShipment,
    toast,
    setToast,
    updating,
    handleStatusChange,
    copyValue,
  } = state;

  const warningIsRevert = warningModal?.kind === "revert-payment";

  const [shipmentNote, setShipmentNote] = useState("");
  const [parcelType, setParcelType] = useState<DisplayParcelType>("Fashion (Apparel)");
  const [isParcelTypeOverridden, setIsParcelTypeOverridden] = useState(false);
  const [selectedPackagingId, setSelectedPackagingId] = useState<string>("poly_mailer");
  const [manualWeightInput, setManualWeightInput] = useState<string | null>(null);
  const [productWeightInputs, setProductWeightInputs] = useState<
    Record<number, { weight: string; unit: "kg" | "g" }>
  >({});
  const [savingProductId, setSavingProductId] = useState<number | null>(null);

  const [apiProvider, setApiProvider] = useState<ApiCourierKey>("steadfast");
  const [editingRecipient, setEditingRecipient] = useState(false);
  const [recName, setRecName] = useState("");
  const [recPhone, setRecPhone] = useState("");
  const [recAddress, setRecAddress] = useState("");
  const [recDistrict, setRecDistrict] = useState("");
  const [allowCodFallback, setAllowCodFallback] = useState(false);
  const [confirmLiveBooking, setConfirmLiveBooking] = useState(false);
  const [manualEstimateReason, setManualEstimateReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [showWeightOverride, setShowWeightOverride] = useState(false);
  const [showMissingWeightEditor, setShowMissingWeightEditor] = useState(false);
  const [cancelReasonText, setCancelReasonText] = useState("");
  // Status-modal: which order's "Mark Consignment Cancelled (portal)" flow is
  // currently awaiting the second confirmation click.
  const [portalCancelConfirmFor, setPortalCancelConfirmFor] = useState<string | null>(null);

  useEffect(() => {
    if (!shipmentModal) return;
    setConfirmLiveBooking(false);
    setRecName(
      shipmentModal.customer?.fullName ||
        [shipmentModal.billing?.first_name, shipmentModal.billing?.last_name]
          .filter(Boolean)
          .join(" ") ||
        ""
    );
    setRecPhone(shipmentModal.customer?.phone || shipmentModal.billing?.phone || "");
    setRecAddress(
      shipmentModal.customer?.address ||
        shipmentModal.billing?.address_1 ||
        ""
    );
    setRecDistrict(
      shipmentModal.customer?.district ||
        shipmentModal.customer?.city ||
        shipmentModal.billing?.city ||
        "Dhaka"
    );
    setEditingRecipient(false);
    setAllowCodFallback(false);
    setManualEstimateReason("");
    setShowCancelPrompt(false);
    setCancelReason("");
    setShipmentNote(courierOverview?.settings?.defaultParcelNote || "");
    setApiProvider("steadfast");
    setManualWeightInput(null);
    setIsParcelTypeOverridden(false);
    setSelectedPackagingId("poly_mailer");
    setProductWeightInputs({});
    setShowWeightOverride(false);
    setShowMissingWeightEditor(false);
  }, [shipmentModal, courierOverview]);

  useEffect(() => {
    if (!shipmentWeightData) return;
    if (!isParcelTypeOverridden && shipmentWeightData.autoParcelType) {
      setParcelType(shipmentWeightData.autoParcelType as DisplayParcelType);
    }
  }, [shipmentWeightData, isParcelTypeOverridden]);

  const selectedPackaging = getPackagingPreset(selectedPackagingId);
  const productWeightKg = shipmentWeightData ? shipmentWeightData.totalProductWeightKg : 0;
  const autoCalculatedTotalKg =
    Math.round((productWeightKg + selectedPackaging.weightKg) * 100) / 100;

  const displayedWeight =
    manualWeightInput !== null ? manualWeightInput : autoCalculatedTotalKg.toFixed(2);
  const finalPackageWeightNum =
    Number.isFinite(parseFloat(displayedWeight)) ? Math.max(0, parseFloat(displayedWeight)) : 0;
  const isManuallyEdited = manualWeightInput !== null;
  const hasMissingWeight = Boolean(shipmentWeightData?.hasMissingWeight);
  const isZeroWeight = finalPackageWeightNum <= 0;

  const isWeightRequiredForProvider = apiProvider === "pathao";
  const isWeightOptionalForProvider = apiProvider === "steadfast";
  const isWeightInvalidForProvider = isWeightRequiredForProvider
    ? (isZeroWeight || ((isManuallyEdited || hasMissingWeight) && !manualEstimateReason.trim()))
    : false;

  const handleSaveProductWeight = async (productId: number) => {
    const input = productWeightInputs[productId];
    const weightNum = parseFloat(input?.weight || "");
    if (isNaN(weightNum) || weightNum <= 0) return;
    setSavingProductId(productId);
    try {
      await saveProductWeight(productId, weightNum, input?.unit || "kg", parcelType);
    } finally {
      setSavingProductId(null);
    }
  };

  const closeShipment = () => {
    setShipmentNote("");
    setEditingRecipient(false);
    setAllowCodFallback(false);
    setShowCancelPrompt(false);
    setCancelReason("");
    setManualWeightInput(null);
    setIsParcelTypeOverridden(false);
    setProductWeightInputs({});
    setShowWeightOverride(false);
    setShowMissingWeightEditor(false);
    setSavingProductId(null);
    setShipmentModal(null);
  };
  const selectedProviderConfigured =
    courierProviders.steadfast.configured || shipmentConfigured;
  const activeShipment = shipments.find(
    (s) => !["failed", "cancelled", "returned"].includes(s.status)
  );
  const hasActiveApiShipment = Boolean(activeShipment);

  const shipmentPaymentStatus = (
    shipmentModal?.payment_status ||
    shipmentModal?.paymentStatus ||
    ""
  ).toLowerCase();
  const isUnpaidOnlineOrder =
    shipmentModal &&
    shipmentModal.paymentMethod !== "cod" &&
    shipmentPaymentStatus !== "paid" &&
    shipmentPaymentStatus !== "partially_paid";
  const requiresCodOverride =
    Boolean(isUnpaidOnlineOrder) && !courierOverview?.settings?.allowUnpaidOnlineShipment;

  const orderTotalNum = shipmentFinancials?.orderTotal ?? Number(shipmentModal?.total || 0);
  const advancePaidNum =
    shipmentFinancials?.advancePaidAmount ?? (shipmentModal?.paidAmount || 0);
  const outstandingNum =
    shipmentFinancials?.outstandingAmount ??
    (shipmentPaymentStatus === "paid" ? 0 : Math.max(0, orderTotalNum - advancePaidNum));
  const shipmentCod =
    shipmentFinancials?.codAmountToCollect ??
    (shipmentPaymentStatus === "paid" ? 0 : outstandingNum);

  const normalizedPhone = normalizeBdPhone(recPhone);
  const isPhoneValid = Boolean(normalizedPhone);
  const isNameValid = recName.trim().length >= 2;
  const isAddressValid = recAddress.trim().length >= 5;
  const recipientValid = isPhoneValid && isNameValid && isAddressValid;

  const isTestOrder = Boolean(
    shipmentModal?.isTestOrder ||
      (shipmentModal &&
        (() => {
          const num = (shipmentModal.number || shipmentModal.id || "").toString().toUpperCase();
          if (
            num.startsWith("TEST") ||
            num.startsWith("MOCK") ||
            num.startsWith("DEV") ||
            num.startsWith("SANDBOX") ||
            num.startsWith("QA") ||
            num.includes("TEST") ||
            num.includes("MOCK") ||
            num.includes("SANDBOX") ||
            num.includes("QA-")
          ) {
            return true;
          }
          const name = (
            recName ||
            shipmentModal.billing?.first_name ||
            shipmentModal.customer?.fullName ||
            ""
          ).toLowerCase();
          if (
            name.includes("test customer") ||
            name.includes("qa customer") ||
            name.includes("qa test") ||
            name.includes("mock customer") ||
            name.includes("dummy") ||
            name.includes("sandbox") ||
            name.includes("synthetic")
          ) {
            return true;
          }
          const email = (
            shipmentModal.billing?.email ||
            shipmentModal.customer?.email ||
            ""
          ).toLowerCase();
          if (
            email.includes("@test.") ||
            email.includes("@example.com") ||
            email.includes("sandbox") ||
            email.startsWith("test@") ||
            email.startsWith("mock@") ||
            email.startsWith("qa@") ||
            email.includes("qa-")
          ) {
            return true;
          }
          const phone = (
            recPhone ||
            shipmentModal.billing?.phone ||
            shipmentModal.customer?.phone ||
            ""
          ).replace(/[^0-9]/g, "");
          if (
            phone === "01700000000" ||
            phone === "01800000000" ||
            phone === "01900000000" ||
            phone === "01300000000" ||
            phone === "01500000000" ||
            phone === "01600000000"
          ) {
            return true;
          }
          return false;
        })())
  );

  const isLiveMode = courierOperatingMode === "live";
  const isWeightBlockedForLive = isLiveMode && hasMissingWeight && !isManuallyEdited;
  const isManualOverrideInvalid = isManuallyEdited && (finalPackageWeightNum <= 0 || !manualEstimateReason.trim());

  return (
    <>
      {/* ── Status Change Modal ──────────────────────── */}
      {statusModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setStatusModal(null);
              setSelectedStatus(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3
                    id="status-modal-title"
                    className="text-[15px] font-semibold leading-snug text-slate-900"
                  >
                    Update order status
                  </h3>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">
                    #{statusModal.number || statusModal.id}
                    <span className="mx-1.5 text-slate-300">·</span>
                    {statusModal.billing?.first_name || "Guest"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                  setStatusModal(null);
                  setSelectedStatus(null);
                }}
                className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {statusModal.shipmentCodMismatch && (
              <div
                role="alert"
                className="mx-6 mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-950"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-bold">Stop — courier COD does not match payment</p>
                    <p className="mt-1 leading-relaxed text-rose-800">
                      This order is paid, but the active consignment still says to collect{" "}
                      <strong>৳{Number(statusModal.shipmentCodAmount || 0).toLocaleString("en-BD")}</strong>
                      {" "}from the customer. Do not dispatch it. Cancel this consignment in the courier portal,
                      then rebook; this integration cannot change COD on an existing booking.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Courier & Shipment Status Context (Phase 8) */}
            {(() => {
              const isSteadfastApiManaged =
                statusModal.courier === "steadfast" &&
                Boolean(statusModal.consignmentId || statusModal.trackingCode) &&
                !["cancelled", "failed", "booking_failed"].includes(statusModal.shipmentStatus || "");
              const isUnknownCourierStatus = statusModal.shipmentStatus === "unknown";
              const isBookingFailed =
                statusModal.shipmentStatus === "booking_failed" || Boolean(statusModal.courierBookingError);

              // Steadfast reports "unknown" for consignments removed in the
              // merchant portal. That must never render as a healthy
              // "Managed by Steadfast" booking — guide the admin instead.
              if (isSteadfastApiManaged && isUnknownCourierStatus) {
                const confirmPending =
                  portalCancelConfirmFor === String(statusModal.id || statusModal.number);
                return (
                  <div className="mx-6 mt-4 p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-amber-900">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold">Courier Status Unknown — Verify at Steadfast</p>
                        <p className="mt-1 text-amber-800 leading-relaxed text-[11.5px]">
                          Consignment: <strong className="font-mono">#{statusModal.consignmentId || statusModal.trackingCode}</strong>
                          {" "}did not return a recognizable status. This commonly happens after the
                          parcel was <strong>cancelled in the Steadfast portal</strong>. If you
                          cancelled it there, mark the consignment cancelled below — then order
                          statuses (including Cancelled) unlock normally.
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-3 pt-1 border-t border-amber-200">
                          <button
                            type="button"
                            onClick={async () => {
                              const cid =
                                statusModal.consignmentId ||
                                statusModal.trackingCode ||
                                String(statusModal.number || statusModal.id);
                              await fetch(`/api/admin/shipments/${encodeURIComponent(cid)}/refresh`, {
                                method: "POST",
                              });
                              void state.load();
                              setStatusModal(null);
                              setPortalCancelConfirmFor(null);
                            }}
                            className="inline-flex items-center gap-1 font-bold text-amber-900 hover:underline cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" /> Sync Courier Status
                          </button>
                          {confirmPending ? (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  setPortalCancelConfirmFor(null);
                                  await state.cancelShipment(
                                    statusModal,
                                    "Marked cancelled after Steadfast portal cancellation",
                                    { confirmExternalCancellation: true }
                                  );
                                  void state.load();
                                  setStatusModal(null);
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 font-bold text-white hover:bg-amber-700 cursor-pointer"
                              >
                                Yes, mark cancelled
                              </button>
                              <button
                                type="button"
                                onClick={() => setPortalCancelConfirmFor(null)}
                                className="rounded-md border border-amber-300 bg-white px-2 py-1 font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                              >
                                Keep
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setPortalCancelConfirmFor(String(statusModal.id || statusModal.number))
                              }
                              className="inline-flex items-center gap-1 font-bold text-amber-900 hover:underline cursor-pointer"
                              title="Use this only after cancelling the parcel in the Steadfast portal"
                            >
                              <XCircle className="h-3 w-3" /> Mark Consignment Cancelled (portal)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isSteadfastApiManaged) {
                const trackUrl = getCourierTrackingUrl(
                  "steadfast",
                  statusModal.trackingCode,
                  statusModal.consignmentId
                );
                return (
                  <div className="mx-6 mt-4 p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-900">
                    <div className="flex items-start gap-2.5">
                      <Truck className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold">Managed by Steadfast Courier API</p>
                        <p className="mt-1 text-slate-600 leading-relaxed text-[11.5px]">
                          Consignment: <strong className="font-mono text-purple-700">#{statusModal.consignmentId || statusModal.trackingCode}</strong> · State: <span className="capitalize font-semibold text-purple-700">{String(statusModal.shipmentStatus || "booked").replace(/_/g, " ")}</span>
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                          Physical dispatch (<strong>Shipped</strong>) and completion (<strong>Delivered</strong>) update automatically when Steadfast confirms pickup and delivery. Operational states (Confirmed, Processing, Ready to Ship, Cancelled) remain editable.
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-3 pt-1 border-t border-purple-100">
                          {trackUrl && (
                            <a
                              href={trackUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-purple-700 hover:underline"
                            >
                              Track on Steadfast <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              const cid =
                                statusModal.consignmentId ||
                                statusModal.trackingCode ||
                                String(statusModal.number || statusModal.id);
                              await fetch(`/api/admin/shipments/${encodeURIComponent(cid)}/refresh`, {
                                method: "POST",
                              });
                              void state.load();
                              setStatusModal(null);
                            }}
                            className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-purple-700 cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" /> Sync Courier Status
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isBookingFailed) {
                return (
                  <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold">Courier Booking Failed</p>
                        <p className="mt-1 text-[11.5px] text-rose-700">
                          {statusModal.courierBookingError || "Steadfast was unable to create the consignment."}
                        </p>
                        <div className="mt-2.5 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const ord = statusModal;
                              setStatusModal(null);
                              state.openShipment(ord);
                            }}
                            className="font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer"
                          >
                            Retry Steadfast Booking →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })()}

            {/* Status options */}
            <div
              role="radiogroup"
              aria-label="Order status"
              className="max-h-[60vh] space-y-1.5 overflow-y-auto px-6 py-5"
            >
              {MANUAL_ORDER_STATUS_OPTIONS.map((s) => {
                const isSteadfastApiManaged =
                  statusModal.courier === "steadfast" &&
                  Boolean(statusModal.consignmentId || statusModal.trackingCode) &&
                  !["cancelled", "failed", "booking_failed"].includes(statusModal.shipmentStatus || "");
                const isCourierLocked =
                  isSteadfastApiManaged && (s.key === "shipped" || s.key === "delivered");
                const isCodMismatchLocked =
                  Boolean(statusModal.shipmentCodMismatch) &&
                  ["ready_to_ship", "shipped"].includes(s.key);
                const isCurrent = statusModal.status === s.key;
                const isSelected = selectedStatus === s.key;
                const isDisabled = isCurrent || isCourierLocked || isCodMismatchLocked;

                return (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={isCurrent || isSelected}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isCourierLocked && !isCodMismatchLocked) setSelectedStatus(s.key);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 ${
                      isDisabled ? "cursor-default" : "cursor-pointer"
                    } ${
                      isCurrent
                        ? "border-slate-200 bg-slate-50"
                        : isDisabled
                          ? "border-slate-200 bg-slate-50/50 opacity-60"
                          : isSelected
                            ? "border-purple-400 bg-purple-50/60 ring-1 ring-purple-200"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected && !isCurrent
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <s.icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-slate-900">
                        {s.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-slate-500">
                        {isCodMismatchLocked
                          ? `Blocked: courier would collect ৳${Number(statusModal.shipmentCodAmount || 0).toLocaleString("en-BD")}; cancel and rebook first.`
                          : isCourierLocked
                            ? "Automatically controlled by Steadfast API tracking status"
                            : s.desc}
                      </span>
                    </span>

                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-slate-500">
                        Current
                      </span>
                    ) : isCodMismatchLocked ? (
                      <span className="shrink-0 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                        COD mismatch
                      </span>
                    ) : isCourierLocked ? (
                      <span className="shrink-0 rounded-full bg-purple-100/70 border border-purple-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-700">
                        Steadfast API
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          isSelected ? "border-purple-600 bg-purple-600" : "border-slate-300"
                        }`}
                      >
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal footer with Confirm */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
              <button
                onClick={() => {
                  setStatusModal(null);
                  setSelectedStatus(null);
                }}
                className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={
                  !selectedStatus ||
                  selectedStatus === statusModal.status ||
                  (Boolean(statusModal.shipmentCodMismatch) &&
                    ["ready_to_ship", "shipped"].includes(selectedStatus)) ||
                  updating === statusModal.id
                }
                onClick={async () => {
                  if (!selectedStatus) return;

                  const paidNow =
                    (statusModal.paymentStatus || statusModal.payment_status || "").toLowerCase() ===
                    "paid";

                  // Delivering an unpaid order: confirm payment collection first.
                  if (
                    (selectedStatus === "delivered" || selectedStatus === "completed") &&
                    !paidNow
                  ) {
                    setPaymentModal({
                      orderId: statusModal.id,
                      orderNumber: String(statusModal.number || statusModal.id),
                      total: statusModal.total,
                    });
                    return;
                  }

                  // Cancelled / refunded are permanent.
                  if (FINAL_STATUSES.includes(selectedStatus)) {
                    setWarningModal({
                      kind: "permanent",
                      orderId: statusModal.id,
                      status: selectedStatus,
                      orderNumber: String(statusModal.number || statusModal.id),
                    });
                    return;
                  }

                  // A paid order cannot silently return to pending
                  if (paidNow && selectedStatus === "pending") {
                    setWarningModal({
                      kind: "revert-payment",
                      orderId: statusModal.id,
                      status: selectedStatus,
                      orderNumber: String(statusModal.number || statusModal.id),
                      total: statusModal.total,
                    });
                    return;
                  }

                  const ok = await handleStatusChange(statusModal.id, selectedStatus);
                  if (ok) {
                    setStatusModal(null);
                    setSelectedStatus(null);
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-[13px] font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                {updating === statusModal.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Update status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Required Before Delivery ────────── */}
      {paymentModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPaymentModal(null)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => setPaymentModal(null)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 pt-9">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <Banknote className="h-7 w-7 text-amber-600" />
              </div>
              <h3
                id="payment-modal-title"
                className="text-center text-[16px] font-semibold text-slate-900"
              >
                Payment required before delivery
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-center text-[12.5px] leading-relaxed text-slate-500">
                Order <strong className="text-slate-700">#{paymentModal.orderNumber}</strong> is not
                marked as paid. Deliveries must be paid first — confirming records the payment and
                marks the order delivered.
              </p>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Amount due
                </span>
                <span className="text-[15px] font-bold tabular-nums text-slate-900">
                  {formatBDT(paymentModal.total)}
                </span>
              </div>

              <p className="mt-3 text-center text-[11px] text-slate-400">
                The payment is recorded as collected for this order only.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 cursor-pointer"
                >
                  Go back
                </button>
                <button
                  type="button"
                  disabled={updating === paymentModal.orderId}
                  onClick={async () => {
                    await handleStatusChange(paymentModal.orderId, "delivered");
                    setPaymentModal(null);
                    setStatusModal(null);
                    setSelectedStatus(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-[13px] font-bold text-white shadow-md transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-50 cursor-pointer"
                >
                  {updating === paymentModal.orderId && <Loader2 className="h-4 w-4 animate-spin" />}
                  Mark paid &amp; deliver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment timeline (admin) ─────────────────────────────────── */}
      {paymentDetailsModal && (
        <div className="fixed inset-0 z-[340] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setPaymentDetailsModal(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-details-title"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3
                    id="payment-details-title"
                    className="text-[15px] font-semibold leading-snug text-slate-900"
                  >
                    Payment timeline
                  </h3>
                  <p className="mt-0.5 truncate font-mono text-[11.5px] text-slate-500">
                    #{paymentDetailsModal.number || paymentDetailsModal.id}
                    {" · "}
                    {formatBDT(paymentDetails?.order.total ?? paymentDetailsModal.total)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setPaymentDetailsModal(null)}
                className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-3 overflow-y-auto px-6 py-5">
              {paymentDetailsLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading payment history…
                </div>
              ) : paymentDetailsError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
                  {paymentDetailsError}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                        Current payment
                      </p>
                      <p className="mt-0.5 text-[12.5px] font-semibold text-slate-800">
                        {paymentDetails?.order.paymentMethod === "sslcommerz"
                          ? "Online · SSLCOMMERZ"
                          : "Cash on Delivery"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${paymentStatusClass(
                        paymentDetails?.order.paymentStatus
                      )}`}
                    >
                      {paymentDetails?.order.paymentStatus || "pending"}
                    </span>
                  </div>

                  {(paymentDetails?.payments.length ?? 0) === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
                      <p className="text-[12px] font-medium text-slate-600">
                        No online payment attempts recorded.
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        COD orders are collected on delivery; online attempts appear here the
                        moment the gateway session starts.
                      </p>
                    </div>
                  ) : (
                    <ol className="space-y-3">
                      {(paymentDetails?.payments || []).map((payment, index) => (
                        <li
                          key={payment.id}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3.5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                                  {index + 1}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-bold capitalize ${paymentStatusClass(
                                    payment.status
                                  )}`}
                                >
                                  {payment.status.replace(/_/g, " ")}
                                </span>
                                <span className="font-mono text-[11px] text-slate-600">
                                  {payment.tranId}
                                </span>
                              </div>
                              <p className="mt-1 text-[13px] font-bold tabular-nums text-slate-900">
                                {formatBDT(payment.amount)}{" "}
                                <span className="text-[10px] font-medium uppercase text-slate-400">
                                  {payment.currency}
                                </span>
                              </p>
                            </div>
                            <div className="text-right text-[10.5px] leading-relaxed text-slate-500">
                              <p>
                                <span className="text-slate-400">Initiated</span>{" "}
                                {formatPaymentDate(payment.initiatedAt)}
                              </p>
                              {payment.paidAt && (
                                <p className="text-emerald-700">
                                  <span className="text-emerald-500">Paid</span>{" "}
                                  {formatPaymentDate(payment.paidAt)}
                                </p>
                              )}
                              {payment.failedAt && (
                                <p className="text-rose-700">
                                  <span className="text-rose-500">Failed</span>{" "}
                                  {formatPaymentDate(payment.failedAt)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <PaymentField label="Val ID" value={payment.valId} mono />
                            <PaymentField label="Bank txn" value={payment.bankTranId} mono />
                            <PaymentField
                              label="Card"
                              value={[payment.cardBrand, payment.cardType]
                                .filter(Boolean)
                                .join(" · ")}
                            />
                            <PaymentField
                              label="Reconcile attempts"
                              value={String(payment.reconcileAttempts ?? 0)}
                            />
                          </div>

                          {payment.reconcileNote && (
                            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                              {payment.reconcileNote}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}

                  <p className="text-[10.5px] leading-relaxed text-slate-400">
                    Every payment is verified server-side against SSLCOMMERZ before an order is
                    marked paid. Reconciliation only acts on attempts that already carry a
                    verified <span className="font-mono">val_id</span>.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setPaymentDetailsModal(null)}
                className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={updating === paymentDetailsModal.id || paymentDetailsLoading}
                onClick={() =>
                  void reconcilePayments(
                    String(paymentDetailsModal.number || paymentDetailsModal.id),
                    paymentDetailsModal.id
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-md transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${updating === paymentDetailsModal.id ? "animate-spin" : ""}`}
                />
                Reconcile now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stage 4 Redesigned Courier Booking & Tracking Modal ────────── */}
      {shipmentModal && (
        <div className="fixed inset-0 z-[345] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeShipment}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shipment-modal-title"
            className="relative w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header - Sticky */}
            <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      id="shipment-modal-title"
                      className="text-[16px] font-bold text-gray-900"
                    >
                      {hasActiveApiShipment ? "Shipment Details" : "Create Steadfast shipment"}
                    </h3>
                    <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold">
                      Steadfast
                    </span>
                    {isLiveMode ? (
                      <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
                        LIVE MODE
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 text-[10px] font-bold">
                        MOCK MODE
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] font-medium text-gray-400">
                    Order #{shipmentModal.number || shipmentModal.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={closeShipment}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {shipmentLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-[12.5px] text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  Loading shipment details…
                </div>
              ) : (
                <>
                  {shipmentError && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{shipmentError}</span>
                    </div>
                  )}

                  {/* ACTIVE BOOKED CONSIGNMENT */}
                  {hasActiveApiShipment && activeShipment ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700">
                              Active Consignment
                            </p>
                            <h4 className="mt-0.5 text-[15px] font-bold text-gray-900">
                              {getCourierLabel(activeShipment.provider)}
                            </h4>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold capitalize ${shipmentStatusClass(
                              activeShipment.status
                            )}`}
                          >
                            {activeShipment.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          <div className="rounded-xl border border-white bg-white px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase text-gray-400">
                              Consignment ID
                            </p>
                            <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-[12px] font-bold text-gray-800">
                              <span>{activeShipment.consignmentId || "Pending ID"}</span>
                              {activeShipment.consignmentId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void copyValue(activeShipment.consignmentId!, "Consignment ID")
                                  }
                                  className="text-gray-400 hover:text-purple-600 cursor-pointer"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white bg-white px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase text-gray-400">
                              Tracking Number
                            </p>
                            <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-[12px] font-bold text-gray-800">
                              <span>{activeShipment.trackingCode || "Pending tracking"}</span>
                              {activeShipment.trackingCode && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void copyValue(activeShipment.trackingCode!, "Tracking number")
                                  }
                                  className="text-gray-400 hover:text-purple-600 cursor-pointer"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white bg-white px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase text-gray-400">
                              Booking Time & Last Sync
                            </p>
                            <p className="mt-0.5 text-[11.5px] font-medium text-gray-700">
                              Booked: {formatPaymentDate(activeShipment.createdAt)}
                            </p>
                            <p className="text-[10.5px] text-gray-500">
                              Synced: {formatPaymentDate(activeShipment.lastSyncedAt)}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white bg-white px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase text-gray-400">
                              Booked COD & Fee
                            </p>
                            <p className="mt-0.5 text-[13px] font-bold text-gray-900 tabular-nums">
                              {formatBDT(activeShipment.codAmount)} COD
                            </p>
                            {activeShipment.deliveryCharge != null && (
                              <p className="text-[10.5px] text-gray-500">
                                Delivery Charge: {formatBDT(activeShipment.deliveryCharge)}
                              </p>
                            )}
                          </div>
                        </div>

                        {(activeShipment.events?.length ?? 0) > 0 && (
                          <div className="rounded-xl border border-white bg-white px-3.5 py-2.5">
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              Tracking History
                            </p>
                            <ol className="space-y-1.5">
                              {(activeShipment.events || []).map((ev, i) => (
                                <li
                                  key={`${ev.status}-${i}`}
                                  className="flex items-start justify-between gap-2 text-[11.5px] text-gray-600"
                                >
                                  <span className="capitalize">
                                    {ev.status.replace(/_/g, " ")}
                                    {ev.note ? (
                                      <span className="ml-1 text-gray-400">· {ev.note}</span>
                                    ) : null}
                                  </span>
                                  <span className="shrink-0 text-[10.5px] text-gray-400">
                                    {formatPaymentDate(ev.at)}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={
                              shipmentBusy ||
                              !(activeShipment.consignmentId || activeShipment.trackingCode)
                            }
                            onClick={() => void refreshShipment(activeShipment.id)}
                            title={
                              activeShipment.consignmentId || activeShipment.trackingCode
                                ? "Pull the latest delivery status from the courier"
                                : "No consignment yet — retry the booking first."
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-[11.5px] font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${shipmentBusy ? "animate-spin" : ""}`}
                            />
                            Refresh status
                          </button>
                          <CourierPrintAction
                            order={shipmentModal}
                            shipment={activeShipment}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11.5px] font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                          >
                            Print label
                          </CourierPrintAction>
                          {(() => {
                            const url = getCourierTrackingUrl(
                              activeShipment.provider,
                              activeShipment.trackingCode,
                              activeShipment.consignmentId
                            );
                            return url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11.5px] font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Track live
                              </a>
                            ) : null;
                          })()}
                          {!["delivered", "partial_delivered", "returned"].includes(
                            activeShipment.status
                          ) && (
                            <button
                              type="button"
                              disabled={shipmentBusy}
                              onClick={() => setShowCancelPrompt((v) => !v)}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              Cancel consignment
                            </button>
                          )}
                        </div>

                        {showCancelPrompt && (
                          <div className="rounded-xl border border-rose-200 bg-white p-3 space-y-2">
                            <p className="text-[12px] font-bold text-rose-900">
                              Confirm Consignment Cancellation
                            </p>
                            <input
                              type="text"
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              placeholder="Reason for cancelling courier booking..."
                              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[12px]"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={shipmentBusy}
                                onClick={async () => {
                                  const ok = await cancelShipment(
                                    shipmentModal,
                                    cancelReason || "Cancelled by admin"
                                  );
                                  if (ok) setShowCancelPrompt(false);
                                }}
                                className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                              >
                                Confirm Cancellation
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowCancelPrompt(false)}
                                className="rounded-lg bg-gray-100 px-3 py-1.5 text-[11.5px] font-medium text-gray-600 cursor-pointer"
                              >
                                Keep Active
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* CREATE SHIPMENT FORM MATCHING MOCKUP */
                    <div className="space-y-4">
                      {/* Eligibility Gate Notice */}
                      {shipmentEligibility && !shipmentEligibility.ok && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 space-y-2">
                          <div className="flex items-start gap-2 text-[12px] font-medium text-amber-900">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <span>{shipmentEligibility.reason}</span>
                          </div>
                          {shipmentModal.status === "pending" && (
                            <button
                              type="button"
                              disabled={updating === shipmentModal.id}
                              onClick={async () => {
                                const ok = await handleStatusChange(shipmentModal.id, "confirmed", {
                                  reason: "Confirmed prior to courier booking",
                                });
                                if (ok) {
                                  setShipmentModal((prev) =>
                                    prev ? { ...prev, status: "confirmed" } : null
                                  );
                                  await state.openShipment({
                                    ...shipmentModal,
                                    status: "confirmed",
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-purple-700 cursor-pointer"
                            >
                              Confirm Order Now
                            </button>
                          )}
                        </div>
                      )}

                      {/* ── 1. Active Courier Provider & Operating Mode Indicator ── */}
                      <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CourierLogo provider="steadfast" size="sm" className="shadow-2xs" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13.5px] font-bold text-gray-900 leading-tight">Steadfast Courier</span>
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700 border border-emerald-200">
                                Active & Connected
                              </span>
                            </div>
                            <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                              Automated nationwide door-to-door delivery with COD reconciliation
                            </p>
                          </div>
                        </div>

                        {/* Operating Mode Indicator Badge */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {isLiveMode ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 border border-amber-300">
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              LIVE COURIER MODE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-800 border border-blue-200">
                              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                              TEST / MOCK MODE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2-Column Form Layout: Parcel Details & Payment Summary */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Column 1: Parcel Details */}
                        <div className="space-y-3">
                          <p className="text-[12.5px] font-bold text-gray-900">
                            Parcel details
                          </p>

                          {/* Parcel Classification Selector */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-gray-700">
                                Parcel classification
                              </label>
                              <span
                                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                                  isParcelTypeOverridden
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : shipmentWeightData?.isMixedCategory
                                    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                    : "bg-purple-100 text-purple-800 border border-purple-200"
                                }`}
                              >
                                {isParcelTypeOverridden
                                  ? "Manual Override"
                                  : shipmentWeightData?.isMixedCategory
                                  ? "Mixed Items"
                                  : "Auto-Classified"}
                              </span>
                            </div>
                            <select
                              value={parcelType}
                              onChange={(e) => {
                                setParcelType(e.target.value as DisplayParcelType);
                                setIsParcelTypeOverridden(true);
                              }}
                              className="h-[42px] w-full rounded-xl border border-gray-200 bg-white px-3 text-[12.5px] font-medium text-gray-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 cursor-pointer"
                            >
                              <option value="Fashion (Apparel)">Fashion (Apparel)</option>
                              <option value="Accessories">Accessories</option>
                              <option value="Cosmetics">Cosmetics</option>
                              <option value="General Parcel">General Parcel</option>
                            </select>
                          </div>

                          {/* Automatic Package Weight Card */}
                          <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-bold text-gray-900 flex items-center gap-1.5">
                                <Scale className="h-3.5 w-3.5 text-purple-600" />
                                Package weight
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                  hasMissingWeight && !isManuallyEdited
                                    ? "bg-rose-100 text-rose-800 border-rose-200"
                                    : isManuallyEdited
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : "bg-indigo-100 text-indigo-800 border-indigo-200"
                                }`}
                              >
                                {hasMissingWeight && !isManuallyEdited
                                  ? "MISSING WEIGHT"
                                  : isManuallyEdited
                                  ? "MEASURED"
                                  : "ESTIMATED"}
                              </span>
                            </div>

                            {/* Row 1: Products Weight */}
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="text-gray-600 font-medium">
                                Products Weight
                              </span>
                              <span className={`font-bold tabular-nums ${hasMissingWeight ? "text-rose-600" : "text-gray-900"}`}>
                                {hasMissingWeight
                                  ? `Incomplete (${shipmentWeightData?.missingProductCount || 1} missing)`
                                  : `${productWeightKg.toFixed(2)} kg`}
                              </span>
                            </div>

                            {/* Row 2: Packaging Allowance */}
                            <div className="flex items-center justify-between text-[12px] gap-2">
                              <span className="text-gray-600 font-medium shrink-0">
                                Packaging Allowance
                              </span>
                              <select
                                value={selectedPackagingId}
                                onChange={(e) => setSelectedPackagingId(e.target.value)}
                                className="h-[32px] rounded-lg border border-gray-200 bg-white px-2 text-[11.5px] font-semibold text-gray-800 outline-none focus:border-purple-500 cursor-pointer"
                              >
                                {PACKAGING_PRESETS.map((pkg) => (
                                  <option key={pkg.id} value={pkg.id}>
                                    {pkg.weightKg > 0 ? `${Math.round(pkg.weightKg * 1000)} g` : "0 g"} ({pkg.name})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Divider & Final Package Weight */}
                            <div className="border-t border-gray-200/80 pt-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <label className="text-[12px] font-bold text-gray-900 block">
                                    Final Package Weight
                                  </label>
                                  <span className="text-[10.5px] text-gray-500 block mt-0.5">
                                    {hasMissingWeight && !isManuallyEdited
                                      ? "Missing product weight in catalog"
                                      : isManuallyEdited
                                      ? "Supervisor verified measured weight"
                                      : `Auto: ${productWeightKg.toFixed(2)} + ${selectedPackaging.weightKg.toFixed(2)} kg`}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className={`text-[13px] font-black tabular-nums ${hasMissingWeight && !isManuallyEdited ? "text-rose-600" : "text-gray-900"}`}>
                                    {hasMissingWeight && !isManuallyEdited
                                      ? "Weight Required"
                                      : `${finalPackageWeightNum.toFixed(2)} kg`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowWeightOverride((v) => !v)}
                                    className="text-[10.5px] font-semibold text-purple-600 hover:underline cursor-pointer mt-0.5"
                                  >
                                    {showWeightOverride ? "Close edit" : "Edit weight"}
                                  </button>
                                </div>
                              </div>

                              {/* Manual Weight Override Drawer */}
                              {showWeightOverride && (
                                <div className="mt-2.5 rounded-xl border border-purple-100 bg-white p-2.5 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium text-gray-700">Measured weight (scale):</span>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        step="0.05"
                                        min="0.01"
                                        value={displayedWeight}
                                        onChange={(e) => setManualWeightInput(e.target.value)}
                                        className="h-7 w-20 rounded-md border border-gray-300 px-2 text-[11.5px] font-bold text-right outline-none focus:border-purple-500"
                                      />
                                      <span className="text-[11px] font-bold text-gray-500">kg</span>
                                    </div>
                                  </div>
                                  {isManuallyEdited && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setManualWeightInput(null);
                                        setShowWeightOverride(false);
                                      }}
                                      className="text-[10px] text-purple-600 hover:underline cursor-pointer"
                                    >
                                      ↺ Reset to auto-calculated ({autoCalculatedTotalKg.toFixed(2)} kg)
                                    </button>
                                  )}
                                  <div className="space-y-1">
                                    <label className="text-[10.5px] font-semibold text-gray-700 block">
                                      Reason for Measured Override <span className="text-rose-600">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={manualEstimateReason}
                                      onChange={(e) => setManualEstimateReason(e.target.value)}
                                      placeholder="e.g., Weigh-scale verified by dispatch supervisor"
                                      className="h-7 w-full rounded-md border border-gray-200 px-2 text-[11px] outline-none focus:border-purple-500"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Missing Weight Alert Banner */}
                              {hasMissingWeight && !isManuallyEdited && (
                                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-900 space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                    <span>Missing Product Weight ({shipmentWeightData?.missingProductCount || 1} item)</span>
                                  </div>
                                  <p className="text-rose-700">
                                    {shipmentWeightData?.missingProducts?.map((p) => p.name).join(", ")} has no configured weight in catalog.
                                  </p>
                                  {isLiveMode && (
                                    <p className="font-semibold text-rose-800">
                                      Automatic live booking is blocked until weight is entered or supervisor-verified measured weight is provided.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Expandable + Add product weight (optional) */}
                            {hasMissingWeight && shipmentWeightData?.missingProducts && (
                              <div className="border-t border-gray-200/80 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setShowMissingWeightEditor((v) => !v)}
                                  className="flex items-center gap-1 text-[11.5px] font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
                                >
                                  <span>
                                    {showMissingWeightEditor ? "− Hide product weights" : "+ Configure weights in catalog"}
                                  </span>
                                </button>

                                {showMissingWeightEditor && (
                                  <div className="mt-2 space-y-1.5">
                                    {shipmentWeightData.missingProducts.map((p) => {
                                      const currentInput = productWeightInputs[p.productId] || {
                                        weight: "",
                                        unit: "kg",
                                      };
                                      const isSaving = savingProductId === p.productId;

                                      return (
                                        <div
                                          key={p.productId}
                                          className="flex items-center justify-between gap-1.5 rounded-xl border border-gray-200 bg-white p-2 text-[11px]"
                                        >
                                          <div className="min-w-0 max-w-[150px]">
                                            <p className="font-semibold text-gray-900 truncate">
                                              {p.name}
                                            </p>
                                            <span className="text-[9.5px] text-gray-400">
                                              Qty: {p.quantity}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1 ml-auto">
                                            <input
                                              type="number"
                                              step="0.05"
                                              placeholder="Unit wt"
                                              value={currentInput.weight}
                                              onChange={(e) =>
                                                setProductWeightInputs((prev) => ({
                                                  ...prev,
                                                  [p.productId]: {
                                                    ...currentInput,
                                                    weight: e.target.value,
                                                  },
                                                }))
                                              }
                                              className="h-7 w-16 rounded-md border border-gray-200 px-1.5 text-[11px] text-gray-800 outline-none focus:border-purple-500"
                                            />
                                            <select
                                              value={currentInput.unit}
                                              onChange={(e) =>
                                                setProductWeightInputs((prev) => ({
                                                  ...prev,
                                                  [p.productId]: {
                                                    ...currentInput,
                                                    unit: e.target.value as "kg" | "g",
                                                  },
                                                }))
                                              }
                                              className="h-7 rounded-md border border-gray-200 bg-white px-1 text-[10.5px] text-gray-700 outline-none"
                                            >
                                              <option value="kg">kg</option>
                                              <option value="g">g</option>
                                            </select>
                                            <button
                                              type="button"
                                              disabled={!currentInput.weight || isSaving}
                                              onClick={() => handleSaveProductWeight(p.productId)}
                                              className="inline-flex h-7 items-center gap-1 rounded-md bg-purple-600 px-2 text-[10px] font-bold text-white hover:bg-purple-700 disabled:opacity-40 cursor-pointer"
                                            >
                                              {isSaving ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <Save className="h-3 w-3" />
                                              )}
                                              Save
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Courier Delivery Note */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-gray-700 block">
                              Courier note
                            </label>
                            <input
                              type="text"
                              value={shipmentNote}
                              onChange={(e) => setShipmentNote(e.target.value)}
                              placeholder="Call before delivery..."
                              className="h-[42px] w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[12.5px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition"
                            />
                          </div>
                        </div>

                        {/* Column 2: Payment summary & Recipient */}
                        <div className="space-y-3">
                          {/* Payment & Collection */}
                          <p className="text-[12.5px] font-bold text-gray-900">
                            Payment summary
                          </p>

                          <div className="space-y-2.5 rounded-2xl border border-gray-200 bg-gray-50/50 p-3.5 text-[12px]">
                            <div className="flex justify-between text-gray-600">
                              <span className="font-medium">Order total</span>
                              <span className="font-bold text-gray-900 tabular-nums">
                                ৳{formatBDT(orderTotalNum).replace("৳", "").trim()}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                              <span className="font-medium">Payment method</span>
                              <span className="font-bold text-gray-900 uppercase">
                                {shipmentModal?.paymentMethod || "COD"}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                              <span className="font-medium">Advance received</span>
                              <span className="font-bold text-emerald-700 tabular-nums">
                                ৳{formatBDT(advancePaidNum).replace("৳", "").trim()}
                              </span>
                            </div>
                            {Number(shipmentModal?.shipping_total || 0) > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span className="font-medium">Delivery charge</span>
                                <span className="font-bold text-gray-900 tabular-nums">
                                  ৳{formatBDT(Number(shipmentModal?.shipping_total || 0)).replace("৳", "").trim()}
                                </span>
                              </div>
                            )}

                            {/* Green COD Highlighted Card */}
                            <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3 space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                                COD TO COLLECT
                              </span>
                              <span className="text-[22px] font-black text-emerald-700 tabular-nums block leading-tight">
                                ৳{formatBDT(shipmentCod).replace("৳", "").trim()}
                              </span>
                              <span className="text-[10.5px] text-emerald-700 font-medium block">
                                {shipmentCod === 0
                                  ? "Paid in full online — ৳0 cash to collect"
                                  : advancePaidNum > 0
                                  ? `Collecting remaining unpaid balance`
                                  : "Collecting full order amount upon delivery"}
                              </span>
                            </div>
                          </div>

                          {/* Recipient summary */}
                          <div className="space-y-1 pt-1">
                            <p className="text-[12.5px] font-bold text-gray-900">
                              Recipient
                            </p>

                            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 text-[12px] text-gray-700 space-y-1.5">
                              <div className="flex items-center justify-between font-bold text-gray-900">
                                <span className="truncate">Deliver to: {recName || "Guest"}</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingRecipient((v) => !v)}
                                  className="shrink-0 text-purple-600 hover:underline cursor-pointer ml-1 text-[11.5px] font-semibold"
                                >
                                  {editingRecipient ? "Done" : "Edit details"}
                                </button>
                              </div>
                              {editingRecipient ? (
                                <div className="mt-2 space-y-2">
                                  <div>
                                    <input
                                      type="text"
                                      value={recName}
                                      onChange={(e) => setRecName(e.target.value)}
                                      placeholder="Recipient Name"
                                      className="h-[36px] w-full rounded-lg border border-gray-200 px-3 text-[12px] outline-none focus:border-purple-500"
                                    />
                                    {!isNameValid && recName.trim().length > 0 && (
                                      <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                        Name must be at least 2 characters.
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      value={recPhone}
                                      onChange={(e) => setRecPhone(e.target.value)}
                                      placeholder="01XXXXXXXXX"
                                      className="h-[36px] w-full rounded-lg border border-gray-200 px-3 font-mono text-[12px] outline-none focus:border-purple-500"
                                    />
                                    {!isPhoneValid && recPhone.trim().length > 0 && (
                                      <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                        Enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      value={recAddress}
                                      onChange={(e) => setRecAddress(e.target.value)}
                                      placeholder="Delivery Address"
                                      className="h-[36px] w-full rounded-lg border border-gray-200 px-3 text-[12px] outline-none focus:border-purple-500"
                                    />
                                    {!isAddressValid && recAddress.trim().length > 0 && (
                                      <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                        Delivery address must be at least 5 characters.
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      value={recDistrict}
                                      onChange={(e) => setRecDistrict(e.target.value)}
                                      placeholder="District / City (e.g. Dhaka)"
                                      className="h-[36px] w-full rounded-lg border border-gray-200 px-3 text-[12px] outline-none focus:border-purple-500"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="font-mono text-gray-600 font-medium">{recPhone}</p>
                                  <p className="text-gray-500 line-clamp-2 leading-relaxed">
                                    {recAddress}{recDistrict ? `, ${recDistrict}` : ""}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {requiresCodOverride && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[11.5px] text-rose-800 space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                            <span>
                              This <strong>SSLCOMMERZ online payment</strong> order is still{" "}
                              <strong>unpaid</strong>. Sending now converts it to COD collection of{" "}
                              <strong>{formatBDT(shipmentCod)}</strong>.
                            </span>
                          </div>
                          <label className="flex items-center gap-2 font-semibold text-rose-900 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allowCodFallback}
                              onChange={(e) => setAllowCodFallback(e.target.checked)}
                              className="h-3.5 w-3.5 rounded accent-rose-600"
                            />
                            Confirm COD Fallback & Log Override
                          </label>
                        </div>
                      )}

                      {/* Safety Safeguards: Test Order Block vs Genuine Live vs Mock Mode */}
                      {!hasActiveApiShipment && (
                        isLiveMode ? (
                          isTestOrder ? (
                            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-[12px] text-rose-950 space-y-2">
                              <div className="flex items-start gap-2.5">
                                <div className="p-1 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                                  <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-black text-rose-950 uppercase tracking-wider text-[11px]">
                                    🚫 Live Booking Blocked: Test / QA Order Detected
                                  </p>
                                  <p className="text-rose-800 mt-1 leading-relaxed">
                                    This order (<strong>#{shipmentModal.number || shipmentModal.id}</strong> — <strong>{recName}</strong>) is identified as a test/synthetic record. Creating live courier consignments with Steadfast for test orders is prohibited to prevent accidental physical courier dispatch and unnecessary delivery charges.
                                  </p>
                                  <p className="text-rose-700 mt-1 font-medium text-[11px]">
                                    To test courier booking with this order, switch Courier Mode to <strong>Mock</strong> in Courier Settings, or test with a genuine customer order.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-[12px] text-amber-950 space-y-2">
                              <div className="flex items-start gap-2.5">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
                                    ⚠️ Caution: Live Courier Mode Active
                                  </p>
                                  <p className="text-amber-900 mt-0.5 leading-relaxed">
                                    You are about to book a LIVE parcel with Steadfast Courier. An actual consignment will be created in the courier system and physical pickup will be scheduled.
                                  </p>
                                </div>
                              </div>
                              <label className="flex items-center gap-2.5 font-bold text-amber-950 cursor-pointer pt-1 border-t border-amber-200/60 mt-1">
                                <input
                                  type="checkbox"
                                  checked={confirmLiveBooking}
                                  onChange={(e) => setConfirmLiveBooking(e.target.checked)}
                                  className="h-4 w-4 rounded accent-amber-600 cursor-pointer"
                                />
                                <span>I confirm this is a real customer order ready for physical Steadfast pickup.</span>
                              </label>
                            </div>
                          )
                        ) : (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-[12px] text-blue-900 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                              <span>
                                <strong>Development Mode:</strong> Mock consignment will be simulated. No real courier booking or physical pickup will be made.
                              </span>
                            </div>
                            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-800 border border-blue-200">
                              Simulated
                            </span>
                          </div>
                        )
                      )}

                      {/* Reopened orders keep their cancelled consignment history */}
                      {shipments.some(
                        (s) => String(s.status).toLowerCase() === "cancelled"
                      ) && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                          A previous consignment for this order was <strong>cancelled</strong>.
                          Booking now creates a <strong>new parcel</strong> at Steadfast — the old
                          consignment stays in history and cannot be reactivated.
                        </div>
                      )}

                      {/* Above-Footer Summary Review */}
                      {!hasActiveApiShipment && (
                        <div className="flex items-center justify-between px-1 pt-1 text-[12px]">
                          <span className="font-semibold text-gray-700">
                            Steadfast Courier · ৳{formatBDT(shipmentCod).replace("৳", "").trim()} COD
                          </span>
                          {isLiveMode && isTestOrder ? (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                              Live booking blocked
                            </span>
                          ) : isLiveMode && hasMissingWeight && !isManuallyEdited ? (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                              Weight required
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              Ready to book
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer - Sticky Single Line Non-Wrapping */}
            <div className="shrink-0 flex items-center justify-between border-t border-gray-100 bg-white px-6 py-3.5 gap-3 whitespace-nowrap">
              <button
                type="button"
                onClick={closeShipment}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition shrink-0"
              >
                Cancel
              </button>
              {hasActiveApiShipment && activeShipment ? (
                <button
                  type="button"
                  onClick={closeShipment}
                  className="rounded-xl bg-purple-600 px-6 py-2 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 cursor-pointer transition shrink-0"
                >
                  Close
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    apiProvider !== "steadfast" ||
                    !selectedProviderConfigured ||
                    shipmentBusy ||
                    !recipientValid ||
                    isWeightBlockedForLive ||
                    isManualOverrideInvalid ||
                    (shipmentEligibility !== null && !shipmentEligibility.ok) ||
                    (requiresCodOverride && !allowCodFallback) ||
                    (isLiveMode && isTestOrder) ||
                    (isLiveMode && !confirmLiveBooking)
                  }
                  onClick={() =>
                    void createShipment(shipmentModal, shipmentNote, "steadfast", {
                      recipient: editingRecipient
                        ? { fullName: recName, phone: recPhone, address: recAddress, city: recDistrict, district: recDistrict }
                        : undefined,
                      allowCodFallback: allowCodFallback || undefined,
                      confirmLiveBooking: isLiveMode ? confirmLiveBooking : undefined,
                      providerMeta: {
                        parcelType,
                        packageWeight: finalPackageWeightNum,
                        packagingType: selectedPackagingId,
                        weightEstimated: !isManuallyEdited,
                        manualEstimateReason:
                          isManuallyEdited
                            ? manualEstimateReason.trim()
                            : undefined,
                        itemDescription:
                          shipmentWeightData?.itemDescription ||
                          `${parcelType} (${
                            shipmentModal.line_items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1
                          } items)`,
                        totalLot:
                          shipmentWeightData?.totalQuantity ||
                          shipmentModal.line_items?.reduce((s, it) => s + (it.quantity || 1), 0) ||
                          1,
                      },
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-50 cursor-pointer transition shrink-0"
                >
                  {shipmentBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Truck className="h-4 w-4" />
                  )}
                  {shipmentBusy
                    ? "Booking Steadfast..."
                    : isLiveMode && isTestOrder
                    ? "Live Booking Blocked (Test Order)"
                    : isWeightBlockedForLive
                    ? "Resolve Missing Weight First"
                    : isLiveMode && !confirmLiveBooking
                    ? "Check Confirmation Below"
                    : isLiveMode
                    ? "Confirm & Book Steadfast (Live)"
                    : "Confirm & Book Steadfast"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation dialog: permanent status / payment reversal ── */}
      {warningModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setWarningModal(null)}
          />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="warning-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => setWarningModal(null)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-6 pb-5 pt-9">
              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                  warningIsRevert ? "bg-amber-100" : "bg-rose-100"
                }`}
              >
                {warningIsRevert ? (
                  <Banknote className="h-7 w-7 text-amber-600" />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-rose-600" />
                )}
              </div>

              <h3
                id="warning-modal-title"
                className="text-center text-[16px] font-semibold text-slate-900"
              >
                {warningIsRevert ? "Undo payment and reopen order?" : "Permanent status change"}
              </h3>

              <p className="mx-auto mt-1.5 max-w-sm text-center text-[12.5px] leading-relaxed text-slate-500">
                {warningIsRevert ? (
                  <>
                    Order{" "}
                    <strong className="text-slate-700">#{warningModal.orderNumber}</strong> is already
                    paid. Moving it back to{" "}
                    <strong className="capitalize text-slate-700">
                      {warningModal.status.replace("-", " ")}
                    </strong>{" "}
                    will mark the payment as pending again.
                  </>
                ) : (
                  <>
                    Order{" "}
                    <strong className="text-slate-700">#{warningModal.orderNumber}</strong> will be
                    marked{" "}
                    <strong className="capitalize text-slate-700">
                      {warningModal.status.replace("-", " ")}
                    </strong>
                    .
                  </>
                )}
              </p>

              {warningIsRevert && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Paid amount
                  </span>
                  <span className="text-[15px] font-bold tabular-nums text-slate-900">
                    {formatBDT(warningModal.total || 0)}
                  </span>
                </div>
              )}

              <div
                className={`mt-4 rounded-xl border px-3.5 py-2.5 text-[11.5px] leading-relaxed ${
                  warningIsRevert
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {warningIsRevert
                  ? "The order will show as Unpaid and the full amount will count as due until it is marked paid again."
                  : "Cancelled and refunded orders are locked and cannot be changed afterwards."}
              </div>

              {!warningIsRevert && warningModal.status === "cancelled" && (
                <div className="mt-4 text-left space-y-1">
                  <label className="block text-[11px] font-bold text-gray-700">
                    Cancellation Reason <span className="text-rose-600">* (Mandatory)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReasonText}
                    onChange={(e) => setCancelReasonText(e.target.value)}
                    placeholder="State reason for customer request or operational cancellation..."
                    className="w-full rounded-xl border border-gray-300 p-2 text-[12px] outline-none focus:border-rose-500 resize-none"
                  />
                  {cancelReasonText.trim().length > 0 && cancelReasonText.trim().length < 3 && (
                    <p className="text-[10px] text-rose-600 font-medium">Minimum 3 characters required.</p>
                  )}
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setWarningModal(null);
                    setCancelReasonText("");
                  }}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 cursor-pointer"
                >
                  Go back
                </button>
                <button
                  type="button"
                  disabled={
                    updating === warningModal.orderId ||
                    (!warningIsRevert && warningModal.status === "cancelled" && cancelReasonText.trim().length < 3)
                  }
                  onClick={async () => {
                    const ok =
                      warningModal.kind === "revert-payment"
                        ? await handleStatusChange(warningModal.orderId, warningModal.status, {
                            revertPayment: true,
                          })
                        : await handleStatusChange(warningModal.orderId, warningModal.status, {
                            reason: cancelReasonText.trim() || undefined,
                          });
                    setWarningModal(null);
                    setCancelReasonText("");
                    if (ok) {
                      setStatusModal(null);
                      setSelectedStatus(null);
                    }
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold text-white shadow-md transition focus:outline-none focus-visible:ring-2 disabled:opacity-50 cursor-pointer ${
                    warningIsRevert
                      ? "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500/50"
                      : "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/50"
                  }`}
                >
                  {updating === warningModal.orderId && <Loader2 className="h-4 w-4 animate-spin" />}
                  {warningIsRevert ? "Undo payment & reopen" : "Yes, confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail sheet (customer / product) ────────── */}
      {infoModal && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setInfoModal(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h3 id="info-modal-title" className="text-[15px] font-semibold text-slate-900">
                  {infoModal.title}
                </h3>
                {infoModal.subtitle && (
                  <p className="mt-0.5 truncate font-mono text-[11.5px] text-slate-500">
                    {infoModal.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setInfoModal(null)}
                className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-2.5 overflow-y-auto px-5 py-4">
              {infoModal.fields.map((field) => (
                <div
                  key={field.label}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {field.label}
                  </p>
                  <div className="mt-1 flex items-start justify-between gap-3">
                    <p
                      className={`min-w-0 break-all text-[12.5px] leading-relaxed text-slate-800 ${
                        field.mono ? "font-mono" : ""
                      }`}
                    >
                      {field.value}
                    </p>
                    <button
                      type="button"
                      onClick={() => void copyValue(field.value, field.label)}
                      aria-label={`Copy ${field.label}`}
                      title={`Copy ${field.label.toLowerCase()}`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-purple-300 hover:text-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <button
                type="button"
                onClick={() =>
                  void copyValue(
                    infoModal.fields.map((f) => `${f.label}: ${f.value}`).join("\n"),
                    "Details"
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                Copy all
              </button>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Steadfast Shipment Preview Modal ── */}
      <BulkShipmentModal
        state={state}
        isOpen={state.bulkModalOpen}
        onClose={() => state.setBulkModalOpen(false)}
      />

      {/* ── WhatsApp Communication Modal ── */}
      <WhatsAppModal
        order={state.whatsappModal}
        onClose={state.closeWhatsApp}
      />

      {/* ── COD Fallback Confirmation Modal ── */}
      {state.codFallbackModal && (
        <CodFallbackModalDialog
          order={state.codFallbackModal}
          busy={state.codFallbackBusy}
          onClose={() => state.setCodFallbackModal(null)}
          onConfirm={(reason, agreed) =>
            state.applyCodFallback(state.codFallbackModal!.id, reason, agreed)
          }
        />
      )}

      {/* ── Toast Notification ────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[400]">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            )}
            <p className="text-[13px] font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 rounded-lg hover:bg-black/5 transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CodFallbackModalDialog({
  order,
  busy,
  onClose,
  onConfirm,
}: {
  order: WCOrder;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string, customerAgreed: boolean) => Promise<boolean>;
}) {
  const [agreed, setAgreed] = useState(false);
  const [reason, setReason] = useState("");
  const total = Number(order.total || 0);
  const paid = Number(order.paidAmount || 0);
  const collectibleCod = Math.max(0, total - paid);

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-gray-900">
                Switch to Cash on Delivery
              </h3>
              <p className="font-mono text-[12px] text-gray-500">
                Order #{order.number || order.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-[12px] text-amber-900 space-y-1.5 leading-relaxed">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            Customer Agreement Required:
          </p>
          <p>
            This online SSLCOMMERZ order was not paid. By converting to COD, the order becomes
            payable upon delivery, and the collectible COD will be set to:
          </p>
          <div className="flex items-center justify-between rounded-xl bg-white border border-amber-200 px-3 py-2 font-bold text-emerald-800 text-[13px]">
            <span>Expected COD Collection:</span>
            <span>{formatBDT(collectibleCod)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-2.5 text-[12px] text-gray-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-purple-600"
            />
            <span>
              I have spoken with the customer and they agreed to receive this order via Cash on Delivery.
            </span>
          </label>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Audit Reason (Required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer called; SSLCOMMERZ card attempt failed and customer requested COD delivery."
              rows={2}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-[12px] text-gray-800 outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !agreed || reason.trim().length < 5}
            onClick={() => void onConfirm(reason.trim(), agreed)}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 transition disabled:opacity-50 cursor-pointer"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Switch to COD
          </button>
        </div>
      </div>
    </div>
  );
}
