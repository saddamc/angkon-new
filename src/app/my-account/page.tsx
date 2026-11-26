"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, MapPin, Package, ShieldCheck } from "lucide-react";
import { requestEmailCode } from "@/components/checkout/email-verify-dialog";
import { AccountAuthPortal } from "@/components/account/account-auth-portal";
import { AccountHeroHeader } from "@/components/account/account-hero-header";
import { AccountOrdersPanel } from "@/components/account/account-orders-panel";
import { AccountAddressesPanel } from "@/components/account/account-addresses-panel";
import { AccountSecurityPanel } from "@/components/account/account-security-panel";
import { AccountInvoiceModal } from "@/components/account/account-invoice-modal";
import { AccountNoticeBanner, postJson } from "@/components/account/account-ui";
import type { AccountNotice, AccountOrderSummary, AccountUserProfile } from "@/types/account";

const VERIFY_NOTICES: Record<string, AccountNotice> = {
  success: { text: "Your email is verified. You're signed in.", type: "success" },
  invalid: {
    text: "That verification link has expired or was already used. Sign in and request a new one.",
    type: "error",
  },
  error: {
    text: "We couldn't verify your email right now. Please try the link again.",
    type: "error",
  },
};

type AccountTab = "orders" | "addresses" | "security";

function LoadingShell() {
  return (
    <div className="min-h-screen bg-[#530911] text-white flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E1B76F] border-t-transparent" />
        <p className="text-xs uppercase tracking-widest text-[#EADBC8] font-semibold">
          Loading your account…
        </p>
      </div>
    </div>
  );
}

function MyAccountContent() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const requestedOrder = searchParams.get("order");
  const requestedMode = searchParams.get("mode");
  const verifyKey = searchParams.get("verify");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<AccountUserProfile | null>(null);
  const [orders, setOrders] = useState<AccountOrderSummary[]>([]);

  const [activeTab, setActiveTab] = useState<AccountTab>(() => {
    if (requestedTab === "addresses" || requestedTab === "security" || requestedTab === "orders") {
      return requestedTab;
    }
    return "orders";
  });

  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<AccountOrderSummary | null>(null);
  const [notice, setNotice] = useState<AccountNotice>(() =>
    verifyKey ? VERIFY_NOTICES[verifyKey] ?? null : null
  );

  // Verification-by-code state (shared between verification banner and security panel)
  const [codeFormOpen, setCodeFormOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeResendAfter, setCodeResendAfter] = useState(0);

  // Sync URL query params if the user navigates while already mounted
  useEffect(() => {
    if (requestedTab === "addresses" || requestedTab === "security" || requestedTab === "orders") {
      setActiveTab(requestedTab);
    } else if (requestedOrder) {
      setActiveTab("orders");
    }
  }, [requestedTab, requestedOrder]);

  // Print isolation: tag <body> while invoice modal is open so print prints ONLY the invoice sheet.
  useEffect(() => {
    if (selectedInvoiceOrder) document.body.classList.add("invoice-print-mode");
    else document.body.classList.remove("invoice-print-mode");
    return () => document.body.classList.remove("invoice-print-mode");
  }, [selectedInvoiceOrder]);

  useEffect(() => {
    if (codeResendAfter <= 0) return;
    const timer = setTimeout(() => setCodeResendAfter((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeResendAfter]);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authenticated && data.user) {
        setUser(data.user as AccountUserProfile);
        setOrders((data.orders || []) as AccountOrderSummary[]);
      } else {
        setUser(null);
        setOrders([]);
      }
    } catch {
      setUser(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  // Smoothly scroll to a deep-linked order card (?order=ANG-...) once loaded
  useEffect(() => {
    if (!user || !requestedOrder || activeTab !== "orders") return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`order-${requestedOrder}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(timer);
  }, [user, requestedOrder, activeTab, orders.length]);

  const sendVerificationCode = async () => {
    if (!user) return;
    setCodeSending(true);
    setCodeError(null);
    const result = await requestEmailCode(user.email, user.name);
    setCodeSending(false);
    if (!result.ok) {
      setCodeError(result.error);
      return;
    }
    setCodeResendAfter(result.resendAfter);
  };

  const openCodeVerification = () => {
    setCodeFormOpen(true);
    setCodeInput("");
    setCodeError(null);
    void sendVerificationCode();
  };

  const handleVerifyCode = async (value: string) => {
    if (!user) return;
    setCodeBusy(true);
    setCodeError(null);
    try {
      const { ok, data } = await postJson("/api/auth/email-code/verify", {
        email: user.email,
        code: value,
        name: user.name,
      });
      if (!ok) {
        setCodeError(data.error || "That code didn't work. Please try again.");
        setCodeInput("");
        return;
      }
      setCodeFormOpen(false);
      await loadSession();
      setNotice({ text: "Your email is verified. Thank you!", type: "success" });
    } catch {
      setCodeError("Network error. Please check your connection and try again.");
    } finally {
      setCodeBusy(false);
    }
  };

  const handleResend = async () => {
    setSubmitting(true);
    try {
      const { ok, data } = await postJson("/api/auth/resend-verification");
      if (ok && data.alreadyVerified) {
        await loadSession();
        return;
      }
      setNotice({
        text: ok
          ? `A new verification link is on its way to ${user?.email}.`
          : data.error || "Couldn't send the email.",
        type: ok ? "success" : "error",
      });
    } catch {
      setNotice({ text: "Network error while resending verification link.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setOrders([]);
      setNotice({ text: "You have been signed out.", type: "info" });
    } catch {
      setNotice({ text: "Could not sign out right now. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const totalSpent = useMemo(() => {
    return orders
      .filter((o) => !["cancelled", "refunded", "failed"].includes(String(o.orderStatus || "").toLowerCase()))
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [orders]);

  if (loading) {
    return <LoadingShell />;
  }

  if (!user) {
    const initialAuthTab =
      requestedMode === "code" ? "code" : requestedMode === "register" ? "register" : "login";
    return (
      <AccountAuthPortal
        initialAuthTab={initialAuthTab}
        notice={notice}
        onNotice={setNotice}
        onAuthenticated={loadSession}
      />
    );
  }

  const navTabs: Array<{
    key: AccountTab;
    label: string;
    icon: typeof Package;
    badge?: number;
  }> = [
    { key: "orders", label: "Orders & Invoices", icon: Package, badge: orders.length },
    {
      key: "addresses",
      label: "Delivery Addresses",
      icon: MapPin,
      badge: user.addresses?.length || 0,
    },
    { key: "security", label: "Security & Access", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#530911] bg-gradient-to-b from-[#5d0a14] via-[#530911] to-[#42070d] text-white pb-24">
      {/* Checkout-matched Storefront Breadcrumb Bar */}
      <div className="border-b border-[#E1B76F]/20 bg-[#42070e]">
        <div className="mx-auto max-w-[1140px] flex h-11 items-center gap-2 px-4 sm:px-6 lg:px-8 text-xs text-white/85 font-medium">
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="font-bold text-[#E1B76F]">My Account</span>
        </div>
      </div>

      {/* Global Print Stylesheet for Invoices */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          /* While the invoice modal is open, print EXACTLY the invoice.
             Everything else is display:none — hidden content takes no
             space, so the printout spans only the pages the invoice
             itself needs (visibility:hidden kept layout and produced
             many blank pages). */
          body.invoice-print-mode > *:not(#angkon-invoice-backdrop) {
            display: none !important;
          }
          body.invoice-print-mode #angkon-invoice-backdrop {
            position: static !important;
            display: block !important;
            background: none !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          body.invoice-print-mode #angkon-invoice-card {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          body.invoice-print-mode #angkon-printable-invoice {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            border: none !important;
            box-shadow: none !important;
          }
          body.invoice-print-mode #angkon-printable-invoice .overflow-x-auto {
            overflow: visible !important;
          }
          body.invoice-print-mode #angkon-printable-invoice tr {
            break-inside: avoid;
          }

          /* Dark-screen palette → print-safe equivalents. */
          #angkon-printable-invoice .text-white {
            color: #111827 !important;
          }
          #angkon-printable-invoice .text-stone-200,
          #angkon-printable-invoice .text-stone-300,
          #angkon-printable-invoice .text-stone-400 {
            color: #4b5563 !important;
          }
          #angkon-printable-invoice .text-\\[\\#E1B76F\\] {
            color: #92400e !important;
          }
          #angkon-printable-invoice .text-green-400 {
            color: #15803d !important;
          }
          #angkon-printable-invoice .text-amber-400 {
            color: #b45309 !important;
          }
          #angkon-printable-invoice table th {
            color: #4b5563 !important;
            border-color: #e5e7eb !important;
          }
          #angkon-printable-invoice table td {
            color: #111827 !important;
            border-color: #f3f4f6 !important;
          }
          #angkon-printable-invoice tbody tr {
            border-color: #f3f4f6 !important;
          }
          #angkon-printable-invoice .border-\\[\\#530911\\] {
            border-color: #e5e7eb !important;
          }
          #angkon-printable-invoice .bg-\\[\\#33070d\\],
          #angkon-printable-invoice .bg-\\[\\#3b050b\\] {
            background-color: #faf6f1 !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1140px] px-4 sm:px-6 lg:px-8 pt-7 sm:pt-9 space-y-6">
        <AccountNoticeBanner notice={notice} onDismiss={() => setNotice(null)} />

        <AccountHeroHeader
          user={user}
          orders={orders}
          totalSpent={totalSpent}
          submitting={submitting}
          onLogout={() => void handleLogout()}
          onResendVerification={() => void handleResend()}
          onGoToSecurity={() => setActiveTab("security")}
          onGoToAddresses={() => setActiveTab("addresses")}
          onProfileUpdated={setUser}
          onNotice={setNotice}
          codeFormOpen={codeFormOpen}
          codeInput={codeInput}
          codeBusy={codeBusy}
          codeSending={codeSending}
          codeError={codeError}
          codeResendAfter={codeResendAfter}
          onOpenCodeVerification={openCodeVerification}
          onCloseCodeForm={() => setCodeFormOpen(false)}
          onCodeInputChange={(digits) => {
            setCodeInput(digits);
            setCodeError(null);
          }}
          onSubmitVerifyCode={handleVerifyCode}
          onSendVerificationCode={sendVerificationCode}
        />

        {/* Scrollable Luxury Pill Tab Bar */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#E1B76F]/20 pb-0.5 no-scrollbar">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 inline-flex items-center gap-2 rounded-t-2xl border-b-2 px-4 sm:px-5 py-3 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  active
                    ? "border-[#E1B76F] bg-[#3b050b] text-[#E1B76F]"
                    : "border-transparent text-white/80 hover:text-white hover:bg-[#3b050b]/40"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] tabular-nums ${
                      active ? "bg-[#E1B76F] text-[#2a0408]" : "bg-[#2b0408] text-[#F5EAE0]"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Tab Workspace */}
        {activeTab === "orders" && (
          <AccountOrdersPanel
            orders={orders}
            emailVerified={user.emailVerified}
            highlightedOrderNumber={requestedOrder}
            onOpenInvoice={setSelectedInvoiceOrder}
            onReloadSession={loadSession}
            onNotice={setNotice}
          />
        )}

        {activeTab === "addresses" && (
          <AccountAddressesPanel
            user={user}
            onUserUpdated={setUser}
            onNotice={setNotice}
          />
        )}

        {activeTab === "security" && (
          <AccountSecurityPanel
            user={user}
            submitting={submitting}
            onUserUpdated={setUser}
            onNotice={setNotice}
            onOpenCodeVerification={() => {
              openCodeVerification();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onResendVerification={() => void handleResend()}
            onLogout={() => void handleLogout()}
          />
        )}
      </div>

      {selectedInvoiceOrder && (
        <AccountInvoiceModal
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}
    </div>
  );
}

export default function MyAccountPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <MyAccountContent />
    </Suspense>
  );
}
