"use client";

import { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { WhatsAppIcon } from "./whatsapp-icon";
import type { WCOrder } from "../_types/orders.types";
import {
  WHATSAPP_TEMPLATE_OPTIONS,
  type WhatsAppTemplateKey,
  normalizeWhatsAppPhone,
  formatPhoneForDisplay,
  buildWhatsAppUrl,
  extractOrderWhatsAppContext,
  generateWhatsAppMessage,
  mapStatusToTemplateKey,
} from "@/server/whatsapp/whatsapp-templates";

interface WhatsAppModalProps {
  order: WCOrder | null;
  onClose: () => void;
}

export function WhatsAppModal({ order, onClose }: WhatsAppModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateKey>("confirmed");
  const [messageText, setMessageText] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!order) return;
    const initialKey = mapStatusToTemplateKey(order.status);
    setSelectedTemplate(initialKey);
    const initialMsg = generateWhatsAppMessage(order, initialKey);
    setMessageText(initialMsg);
    setCustomPhone(order.billing?.phone || "");
    setIsEditingPhone(false);
    setCopied(false);
  }, [order]);

  if (!order) return null;

  const ctx = extractOrderWhatsAppContext(order);
  const activePhone = customPhone || ctx.rawPhone;
  const normalizedPhone = normalizeWhatsAppPhone(activePhone);
  const isValidPhone = Boolean(normalizedPhone);

  const handleTemplateChange = (newKey: WhatsAppTemplateKey) => {
    setSelectedTemplate(newKey);
    if (newKey !== "custom") {
      const generated = generateWhatsAppMessage(order, newKey);
      setMessageText(generated);
    }
  };

  const handleResetToTemplate = () => {
    const generated = generateWhatsAppMessage(order, selectedTemplate);
    setMessageText(generated);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
      const textArea = document.createElement("textarea");
      textArea.value = messageText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!normalizedPhone || !messageText.trim()) return;
    const url = buildWhatsAppUrl(normalizedPhone, messageText);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-modal-title"
      className="fixed inset-0 z-[250] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-[680px] max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20">
              <WhatsAppIcon className="h-5 w-5 fill-[#25D366]" />
            </div>
            <div>
              <h3
                id="whatsapp-modal-title"
                className="text-[15.5px] font-bold text-gray-900"
              >
                WhatsApp Communication
              </h3>
              <p className="text-[12px] font-medium text-gray-500">
                Order #{ctx.orderNumber} · {ctx.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Recipient & Financial Summary Card */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-gray-700">Recipient:</span>
                <span className="font-bold text-gray-900 truncate">
                  {ctx.customerName}
                </span>
                <span className="text-gray-300">·</span>
                {isEditingPhone ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="h-6 w-32 rounded border border-gray-300 px-1.5 font-mono text-[11px] text-gray-800 outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(false)}
                      className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-medium text-gray-600">
                      {formatPhoneForDisplay(activePhone)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(true)}
                      className="text-[10.5px] font-medium text-purple-600 hover:underline cursor-pointer ml-1"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Financial Status Pill */}
              <div className="shrink-0">
                {ctx.isPrepaid ? (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-700 border border-blue-200">
                    Paid Online · ৳0 COD
                  </span>
                ) : ctx.isPartiallyPaid ? (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-700 border border-amber-200">
                    Advance: ৳{ctx.paidAmountFormatted} · COD: ৳{ctx.outstandingCodFormatted}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200">
                    COD to Collect: ৳{ctx.outstandingCodFormatted}
                  </span>
                )}
              </div>
            </div>

            {/* Invalid Phone Warning Banner */}
            {!isValidPhone && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  Invalid Bangladeshi phone number. Please click <strong>Edit</strong> above to supply an 11-digit mobile number (e.g. 01712345678).
                </span>
              </div>
            )}
          </div>

          {/* Template Selector Row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-semibold text-gray-700 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" />
                Select Message Template
              </label>
              <button
                type="button"
                onClick={handleResetToTemplate}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-purple-600 cursor-pointer"
                title="Reset message text to default template"
              >
                <RotateCcw className="h-3 w-3" />
                Reset template text
              </button>
            </div>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value as WhatsAppTemplateKey)}
              className="h-[40px] w-full rounded-xl border border-gray-200 bg-white px-3 text-[12.5px] font-medium text-gray-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 cursor-pointer"
            >
              {WHATSAPP_TEMPLATE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Editable Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-semibold text-gray-700 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                Message Preview & Editor
              </label>
              <span className="text-[10.5px] text-gray-400">
                {messageText.length} characters · WhatsApp markdown supported (*bold*, _italic_)
              </span>
            </div>
            <textarea
              rows={11}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Write your WhatsApp message to the customer..."
              className="w-full rounded-2xl border border-gray-200 bg-stone-50/40 p-3.5 text-[12.5px] text-gray-800 font-sans leading-relaxed outline-none focus:border-purple-500 focus:bg-white focus:ring-1 focus:ring-purple-500/20 transition resize-y"
            />
          </div>

          {/* User Review & Send Guarantee Notice */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3 text-[11px] text-gray-500 leading-normal">
            <p className="font-semibold text-gray-700">Review & Manual Send Guarantee:</p>
            <p className="mt-0.5">
              Clicking <strong>Open in WhatsApp</strong> will prefill this message in WhatsApp Web or your desktop/mobile WhatsApp client. Messages are never sent automatically — you can review, edit, and press Send inside WhatsApp.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4 whitespace-nowrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-gray-400" />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!isValidPhone || !messageText.trim()}
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-[12.5px] font-bold text-white shadow-sm hover:bg-[#20ba5a] disabled:opacity-50 cursor-pointer transition"
            >
              <WhatsAppIcon className="h-4 w-4 fill-white" />
              <span>Open in WhatsApp</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
