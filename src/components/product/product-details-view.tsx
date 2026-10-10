"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  Copy,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  RotateCcw,
  Send,
  Shield,
  Star,
  Store,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { SizeSelector } from "@/components/product/size-selector";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import type { WooProduct, WooReview } from "@/types/product";
import { formatPrice, getDisplayPrice } from "@/utils/price";
import { fixPlainTextTablesAndLists } from "@/utils/rich-text";

/* ── ShareStrip ─────────────────────────────────────────────────────── */

function ShareStrip({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const getUrl = () =>
    typeof window !== "undefined" ? window.location.href : "";

  const open = (href: string) => window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");

  const share = (type: string) => {
    const url = encodeURIComponent(getUrl());
    const text = encodeURIComponent(title);
    const map: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      email: `mailto:?subject=${text}&body=Check%20out%20this%20product%3A%20${url}`,
    };
    if (map[type]) open(map[type]);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const BTN_BASE = "flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:scale-110 active:scale-95 shadow-sm";

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#cbb18a]">Share</p>
      <div className="flex items-center gap-2">
        {/* Facebook */}
        <button type="button" onClick={() => share("facebook")} aria-label="Share on Facebook" className={`${BTN_BASE} bg-[#1877F2]`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </button>
        {/* Twitter / X */}
        <button type="button" onClick={() => share("twitter")} aria-label="Share on X (Twitter)" className={`${BTN_BASE} bg-[#1DA1F2]`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </button>
        {/* WhatsApp */}
        <button type="button" onClick={() => share("whatsapp")} aria-label="Share on WhatsApp" className={`${BTN_BASE} bg-[#25D366]`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        </button>
        {/* Telegram */}
        <button type="button" onClick={() => share("telegram")} aria-label="Share on Telegram" className={`${BTN_BASE} bg-[#229ED9]`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        </button>
        {/* Copy link */}
        <button
          type="button"
          onClick={copyLink}
          aria-label="Copy link"
          className={`${BTN_BASE} border transition ${
            copied
              ? "border-emerald-500 bg-emerald-500 text-white shadow-emerald-200"
              : "border-[#5c0f0d] bg-[#2b0403] text-[#cbb18a] hover:bg-[#4a0705] hover:text-[#E1B76F]"
          }`}
          title={copied ? "Link Copied!" : "Copy Link"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-white" />
          ) : (
            <Copy className="h-4 w-4 text-[#cbb18a]" />
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function RichText({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null;
  if (/<[a-z][\s\S]*>/i.test(html)) {
    return (
      <div
        className={`product-prose ${className}`}
        dangerouslySetInnerHTML={{ __html: fixPlainTextTablesAndLists(html) }}
      />
    );
  }
  const paragraphs = html.trim().split(/\n{2,}/);
  return (
    <div className={`product-prose ${className}`}>
      {paragraphs.map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function StarRow({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${
            i < Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : i < rating
              ? "fill-amber-200 text-amber-300"
              : "fill-[#5c0f0d] text-[#5c0f0d]"
          }`}
        />
      ))}
    </div>
  );
}

function AccordionRow({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#5c0f0d] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-[14px] font-semibold text-[#E1B76F] transition hover:text-[#f3cb87]"
      >
        {label}
        <ChevronDown className={`h-4 w-4 text-[#cbb18a] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-sm leading-relaxed text-[#cbb18a]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── ReviewForm ─────────────────────────────────────────────────────── */

type FormStatus = "idle" | "loading" | "success" | "error";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"] as const;

function ReviewForm({ productId, onSuccess }: { productId: number; onSuccess: (review: WooReview) => void }) {
  const [rating, setRating]       = useState(0);
  const [hover, setHover]         = useState(0);
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [text, setText]           = useState("");
  const [status, setStatus]       = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg]   = useState("");

  const validate = (): string => {
    if (rating === 0) return "Please select a star rating.";
    if (name.trim().length < 2) return "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email address.";
    if (text.trim().length < 10) return "Review must be at least 10 characters.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrorMsg(err); return; }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          reviewer:       name.trim(),
          reviewer_email: email.trim(),
          review:         text.trim(),
          rating,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      } else {
        // Build a local WooReview from submitted data so it appears immediately
        // regardless of what the WC API response looks like.
        const localReview: WooReview = data.review ?? {
          id:           data.id ?? Date.now(),
          date_created: new Date().toISOString(),
          reviewer:     name.trim(),
          review:       text.trim(),
          rating,
          verified:     false,
        };
        onSuccess(localReview);
        setStatus("success");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  /* ── Success state ── */
  if (status === "success") {
    return (
      <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-10 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#5c0f0d] bg-[#4a0705]">
          <BadgeCheck className="h-7 w-7 text-[#E1B76F]" />
        </div>
        <h3 className="font-heading text-[17px] font-bold uppercase text-[#E1B76F] mb-1">Thank you for your review!</h3>
        <p className="text-[14px] text-[#cbb18a]">Your review has been submitted and is now visible to everyone.</p>
      </div>
    );
  }

  const activeStars = hover || rating;

  return (
    <div className="rounded-2xl border border-[#5c0f0d] bg-[#4a0705] p-6 sm:p-8 shadow-xl">
      <h3 className="font-heading text-[17px] font-bold uppercase text-[#E1B76F] mb-1">Write a Review</h3>
      <p className="text-[13px] text-[#cbb18a] mb-6">Share your honest experience with this product</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Star Rating Picker */}
        <div>
          <label className="mb-2 block text-[13px] font-semibold text-[#cbb18a]">
            Your Rating <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const val = i + 1;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRating(val)}
                  onMouseEnter={() => setHover(val)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                  aria-label={`Rate ${val} star${val > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${
                      val <= activeStars ? "fill-amber-400 text-amber-400" : "fill-[#2b0403] text-[#5c0f0d]"
                    }`}
                  />
                </button>
              );
            })}
            {activeStars > 0 && (
              <span className="ml-2 text-[13px] font-medium text-[#E1B76F]">
                {RATING_LABELS[activeStars]}
              </span>
            )}
          </div>
        </div>

        {/* Name + Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#cbb18a]">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rafiq Hossain"
              maxLength={100}
              className="w-full rounded-xl border border-[#5c0f0d] bg-[#2b0403] px-4 py-2.5 text-[14px] text-[#E1B76F] placeholder-[#cbb18a]/40 outline-none transition focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#cbb18a]">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              maxLength={200}
              className="w-full rounded-xl border border-[#5c0f0d] bg-[#2b0403] px-4 py-2.5 text-[14px] text-[#E1B76F] placeholder-[#cbb18a]/40 outline-none transition focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]"
            />
            <p className="mt-1 text-[11px] text-[#cbb18a]/60">Will not be published</p>
          </div>
        </div>

        {/* Review Text */}
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-[#cbb18a]">
            Your Review <span className="text-red-400">*</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you love about this product? How is the quality and delivery?"
            rows={5}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-[#5c0f0d] bg-[#2b0403] px-4 py-3 text-[14px] text-[#E1B76F] placeholder-[#cbb18a]/40 outline-none transition focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]"
          />
          <div className="mt-1 flex justify-between">
            <span className="text-[11px] text-[#cbb18a]/60">Minimum 10 characters</span>
            <span className={`text-[11px] ${text.length > 1900 ? "text-amber-400" : "text-[#cbb18a]/60"}`}>
              {text.length}/2000
            </span>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-[13px] font-medium text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center gap-2 rounded-[12px] bg-[#E1B76F] px-7 py-3 text-[14px] font-bold text-[#400604] shadow-md transition hover:bg-[#f3cb87] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Review
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

const TRUST_ITEMS = [
  { icon: Shield, label: "100% Authentic", sub: "Officially licensed" },
  { icon: Truck, label: "Fast Dispatch", sub: "Ships within 24 hrs" },
  { icon: RotateCcw, label: "30-Day Returns", sub: "Hassle-free policy" },
];

const SIZE_TABLE = [
  ["S", "96", "68", "42"],
  ["M", "100", "70", "44"],
  ["L", "104", "72", "46"],
  ["XL", "108", "74", "48"],
  ["XXL", "112", "76", "50"],
];

/* ── ReviewCard ─────────────────────────────────────────────────────── */

function ReviewCard({ review }: { review: WooReview }) {
  // Defensive: handle missing or malformed fields
  if (!review || !review.reviewer) {
    console.warn("[ReviewCard] Skipping invalid review:", review);
    return null;
  }

  const avatarUrl = review.reviewer_avatar_urls
    ? Object.values(review.reviewer_avatar_urls)[0]
    : null;
  const nameInitials = review.reviewer
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const date = review.date_created
    ? new Date(review.date_created).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  const rating = Number(review.rating) || 0;
  const reviewText = String(review.review || "").trim();

  return (
    <div className="rounded-2xl border border-[#5c0f0d] bg-[#4a0705] p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={review.reviewer}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[#5c0f0d]"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#2b0403] to-[#400604] border border-[#5c0f0d] flex items-center justify-center text-[13px] font-bold text-[#E1B76F]">
              {nameInitials || <User className="h-4 w-4" />}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold text-[#E1B76F]">{review.reviewer}</span>
              {review.verified && (
                <span className="flex items-center gap-0.5 text-[11px] text-emerald-400 font-medium">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
            </div>
            {date && <span className="text-[12px] text-[#cbb18a]">{date}</span>}
          </div>
        </div>
        <StarRow rating={rating} size="sm" />
      </div>
      {reviewText && (
        <div className="text-[14px] leading-relaxed text-[#cbb18a]">{reviewText}</div>
      )}
    </div>
  );
}

/* ── RatingBreakdown ─────────────────────────────────────────────────── */

function RatingBreakdown({ reviews }: { reviews: WooReview[] }) {
  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center p-6 rounded-2xl bg-[#4a0705] border border-[#5c0f0d] mb-8 shadow-xl">
      <div className="text-center shrink-0">
        <div className="text-[56px] font-black text-[#E1B76F] leading-none">{avg.toFixed(1)}</div>
        <StarRow rating={avg} />
        <div className="mt-1 text-[13px] text-[#cbb18a]">{total} review{total !== 1 ? "s" : ""}</div>
      </div>
      <div className="w-px self-stretch bg-[#5c0f0d] hidden sm:block" />
      <div className="flex-1 w-full space-y-2">
        {counts.map(({ star, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-16 shrink-0">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-[13px] font-medium text-[#cbb18a]">{star}</span>
              </div>
              <div className="flex-1 h-2 rounded-full bg-[#2b0403] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: (5 - star) * 0.06, ease: "easeOut" }}
                  className="h-full rounded-full bg-[#E1B76F]"
                />
              </div>
              <span className="text-[12px] text-[#cbb18a] w-10 text-right shrink-0">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */

type Tab = "Description" | "Additional Information" | "Reviews";
const TABS: Tab[] = ["Description", "Additional Information", "Reviews"];

export function ProductDetailsView({
  product,
  reviews: initialReviews = [],
}: {
  product: WooProduct;
  reviews?: WooReview[];
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(product.sizes[0] ?? "M");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Description");
  const [reviews, setReviews] = useState<WooReview[]>(initialReviews);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 450);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const insideFee = parseInt(product.meta_data?.slice().reverse().find(m => m.key === "_delivery_inside")?.value || "60");
  const outsideFee = parseInt(product.meta_data?.slice().reverse().find(m => m.key === "_delivery_outside")?.value || "120");

  const deliveryFee = useMemo(() => ({
    inside: insideFee,
    outside: outsideFee
  }), [insideFee, outsideFee]);

  // Fetch fresh reviews from WC every time the Reviews tab is opened
  useEffect(() => {
    if (activeTab !== "Reviews") return;
    setReviewsLoading(true);
    console.log("[ProductDetailsView] Fetching reviews for product:", product.id);
    fetch(`/api/reviews?productId=${product.id}`)
      .then((r) => {
        console.log("[ProductDetailsView] Reviews response status:", r.status);
        return r.json();
      })
      .then((data: WooReview[] | { error?: string }) => {
        if (Array.isArray(data)) {
          console.log("[ProductDetailsView] Reviews fetched:", data.length);
          setReviews(data);
        } else {
          console.warn("[ProductDetailsView] Unexpected response:", data);
          setReviews([]);
        }
      })
      .catch((err) => {
        console.error("[ProductDetailsView] Fetch error:", err);
        setReviews([]);
      })
      .finally(() => setReviewsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleReviewSuccess = useCallback((newReview: WooReview) => {
    // Optimistic: show immediately while the server re-fetch is in flight
    setReviews((prev) => {
      const alreadyExists = prev.some((r) => r.id === newReview.id);
      return alreadyExists ? prev : [newReview, ...prev];
    });
    // Then refresh from WC so the list is authoritative
    fetch(`/api/reviews?productId=${product.id}`)
      .then((r) => r.json())
      .then((data: WooReview[]) => {
        if (Array.isArray(data) && data.length > 0) setReviews(data);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const pricing = useMemo(
    () => getDisplayPrice(product.regular_price || product.price, product.sale_price),
    [product.price, product.regular_price, product.sale_price],
  );

  const images =
    product.images.length > 0
      ? product.images
      : [{ id: 0, src: "https://placehold.co/1200x1500/f4f4f5/18181b.png?text=Product", alt: product.name, name: product.name }];
  const activeImg = images[activeImage]?.src ?? images[0]?.src;
  const discountPct = pricing.hasSale ? Math.round((1 - pricing.current / pricing.regular) * 100) : 0;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const infoAttributes = product.attributes.filter((a) => a.visible && a.name.toLowerCase() !== "size");
  const brandAttr = product.attributes.find((a) => a.name.toLowerCase() === "brand");
  const brand = brandAttr?.options?.[0];

  const addItem = useCartStore((state) => state.addItem);
  const onAddToCart = () => {
    addItem({ productId: product.id, slug: product.slug, name: product.name, image: activeImg, price: pricing.current, size, quantity, shippingClassId: product.shipping_class_id ?? 0, deliveryInside: insideFee, deliveryOutside: outsideFee });
    setAdded(true);
    setTimeout(() => setAdded(false), 2400);
  };

  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isWished = useWishlistStore((s) => s.isInWishlist(product.id));

  const handleWishlistToggle = () => {
    toggleWishlist({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: activeImg,
      price: pricing.current,
    });
  };

  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      {/* Breadcrumb */}
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-3">
        <div className="container flex items-center gap-2 text-[13px] text-[#cbb18a] flex-wrap">
          <Link href="/" className="transition hover:text-[#E1B76F]">Home</Link>
          <span>/</span>
          <Link href="/products" className="transition hover:text-[#E1B76F]">All Products</Link>
          {product.categories[0] && (
            <>
              <span>/</span>
              <Link href={`/${product.categories[0].slug}`} className="transition hover:text-[#E1B76F]">{product.categories[0].name}</Link>
            </>
          )}
          <span>/</span>
          <span className="line-clamp-1 text-[#E1B76F]">{product.name}</span>
        </div>
      </div>

      {/* Main product grid */}
      <div className="container py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_460px] xl:grid-cols-[1fr_500px] max-w-[1200px] mx-auto">

          {/* LEFT: Image Gallery */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start w-full">
            {/* Main Image */}
            <div className="group relative overflow-hidden rounded-2xl bg-[#2b0403] border border-[#5c0f0d] w-full shadow-lg flex items-center justify-center min-h-[380px] sm:min-h-[460px] max-h-[520px] p-3">
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl">
              <Image
                src={activeImg}
                alt={product.name}
                width={600}
                height={600}
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="max-h-[495px] w-auto max-w-full object-contain rounded-xl transition duration-500 group-hover:scale-[1.03]"
                priority
              />
            </div>

              <div className="absolute left-3 top-3 flex flex-col gap-1.5 pointer-events-none z-10">
                {pricing.hasSale && (
                  <span className="rounded-full bg-[#E1B76F] px-3 py-1 text-[11px] font-bold uppercase text-[#400604] shadow">-{discountPct}%</span>
                )}
                {product.stock_status === "instock" && (
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase text-white shadow">In Stock</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleWishlistToggle}
                className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border transition backdrop-blur-md z-10 ${
                  isWished ? "border-[#E1B76F] bg-[#E1B76F] text-[#400604] shadow-sm" : "border-[#5c0f0d] bg-[#400604]/80 text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604]"
                }`}
                aria-label="Toggle wishlist"
              >
                <Heart className={`h-5 w-5 ${isWished ? "fill-[#400604] text-[#400604]" : ""}`} />
              </button>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {images.slice(0, 10).map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`relative aspect-square w-full overflow-hidden rounded-xl border-2 bg-[#2b0403] transition-all duration-200 flex items-center justify-center ${
                      activeImage === i
                        ? "border-[#E1B76F] opacity-100 ring-1 ring-[#E1B76F] shadow-sm"
                        : "border-[#5c0f0d] opacity-70 hover:opacity-100 hover:border-[#E1B76F]"
                    }`}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt || product.name}
                      width={100}
                      height={100}
                      className="h-full w-full object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Info */}
          <div className="flex flex-col gap-5">

            {/* Category + Brand */}
            <div className="flex items-center gap-2 flex-wrap">
              {product.categories[0] && (
                <Link
                  href={`/${product.categories[0].slug}`}
                  className="inline-flex items-center rounded-full bg-[#2b0403] border border-[#5c0f0d] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#cbb18a] hover:text-[#E1B76F] transition"
                >
                  {product.categories[0].name}
                </Link>
              )}
              {brand && (
                <span className="text-[12px] text-[#cbb18a]">
                  by <span className="font-bold text-[#E1B76F]">{brand}</span>
                </span>
              )}
              {product.on_sale && (
                <span className="inline-flex items-center rounded-full bg-[#E1B76F] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#400604]">Sale</span>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-[24px] font-extrabold leading-tight text-[#E1B76F] sm:text-[28px] lg:text-[30px] tracking-tight">{product.name}</h1>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                {/* Stars */}
                {reviews.length > 0 ? (
                  <button type="button" onClick={() => setActiveTab("Reviews")} className="flex items-center gap-1.5 group">
                    <StarRow rating={avgRating} />
                    <span className="text-[13px] text-[#cbb18a] group-hover:text-[#E1B76F] transition">
                      <span className="font-semibold text-[#E1B76F]">{avgRating.toFixed(1)}</span> ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                    </span>
                  </button>
                ) : (
                  <button type="button" onClick={() => setActiveTab("Reviews")} className="text-[12px] text-[#cbb18a] hover:text-[#E1B76F] transition underline underline-offset-2">
                    Be the first to review
                  </button>
                )}
                <span className="text-[#5c0f0d]">|</span>
                {/* Stock */}
                {product.stock_status === "instock" ? (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    In Stock{typeof product.stock_quantity === "number" ? ` · ${product.stock_quantity} left` : ""}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-400" />Out of Stock
                  </span>
                )}
              </div>
              {/* SKU / ID */}
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[#cbb18a]">
                {product.sku && <span>SKU: <span className="text-[#E1B76F]">{product.sku}</span></span>}
                {product.id && <span>ID: <span className="text-[#E1B76F]">{product.id}</span></span>}
              </div>
            </div>

            {/* Price Block */}
            <div className="rounded-xl border border-[#5c0f0d] bg-[#2b0403] px-5 py-4">
              <div className="flex items-baseline gap-3">
                <span className="text-[34px] font-black text-[#E1B76F] leading-none">{formatPrice(pricing.current)}</span>
                {pricing.hasSale && (
                  <>
                    <span className="text-[18px] text-[#cbb18a] line-through">{formatPrice(pricing.regular)}</span>
                    <span className="rounded-full bg-[#E1B76F] px-2.5 py-0.5 text-[12px] font-bold text-[#400604]">-{discountPct}%</span>
                  </>
                )}
              </div>
            </div>

            {/* Short Description */}
            {product.short_description && (
              <RichText html={product.short_description} className="text-[14px] leading-relaxed text-[#cbb18a]" />
            )}

            <div className="h-px bg-[#5c0f0d]" />

            {/* Size */}
            {product.sizes.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#E1B76F]">
                    Size{size && <span className="ml-2 font-normal text-[#cbb18a]">— {size}</span>}
                  </span>
                  <button type="button" onClick={() => setActiveTab("Additional Information")} className="text-[12px] font-medium text-[#E1B76F] hover:underline transition">
                    Size Guide
                  </button>
                </div>
                <SizeSelector value={size} onChange={setSize} availableSizes={product.sizes} />
              </div>
            )}

            {/* Quantity */}
            <div>
              <span className="mb-2.5 block text-[14px] font-bold text-[#E1B76F]">Quantity</span>
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </div>

            {/* Delivery Info Card (Bangladeshi Shipping Estimator) */}
            {deliveryFee && (deliveryFee.inside > 0 || deliveryFee.outside > 0) && (
              <div className="flex items-center gap-3.5 rounded-[12px] border border-[#5c0f0d] bg-[#2b0403] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#E1B76F] text-[#400604] shadow-sm">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-heading text-[13px] font-bold text-[#E1B76F] uppercase tracking-wider">Estimated Delivery</span>
                  <div className="flex items-center gap-2 text-[12px] text-[#cbb18a] flex-wrap">
                    <span>Inside Dhaka (2-3 Days): <strong className="font-bold text-[#E1B76F]">৳{deliveryFee.inside.toLocaleString()}</strong></span>
                    <span className="text-[#5c0f0d]">•</span>
                    <span>Outside Dhaka (3-5 Days): <strong className="font-bold text-[#E1B76F]">৳{deliveryFee.outside.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* CTAs (Dual CTA Buttons) */}
            <div className="flex flex-col gap-3 sm:flex-row pt-2">
              <button
                type="button"
                onClick={onAddToCart}
                disabled={product.stock_status !== "instock"}
                className={`relative flex h-[52px] flex-1 items-center justify-center gap-2.5 rounded-[12px] border-2 border-[#E1B76F] text-[14px] font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                  added ? "bg-[#2b0403] text-[#E1B76F]" : "bg-transparent text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604]"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {added ? (
                    <motion.span key="added" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} className="flex items-center gap-2">
                      <Check className="h-5 w-5" /> Added to Bag!
                    </motion.span>
                  ) : (
                    <motion.span key="add" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} className="flex items-center gap-2">
                      <Package className="h-4.5 w-4.5" /> Add to Cart
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <Link
                href="/checkout"
                onClick={onAddToCart}
                className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-[#E1B76F] bg-[#E1B76F] text-[14px] font-black text-[#400604] shadow-sm transition hover:bg-[#f3cb87] hover:border-[#f3cb87] active:scale-[0.98]"
              >
                <Zap className="h-4 w-4" /> Buy It Now
              </Link>
            </div>

            {/* Share */}
            <div className="border-t border-[#5c0f0d] pt-4">
              <ShareStrip title={product.name} />
            </div>
          </div>
        </div>

        {/* ── Tabbed Panel ─────────────────────────────────────────────── */}
        <div className="mt-16 border-t border-[#5c0f0d] pt-10">
          {/* Tab bar */}
          <div className="flex gap-0 border-b border-[#5c0f0d] overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative shrink-0 px-6 py-3.5 text-[14px] font-semibold transition whitespace-nowrap ${
                  activeTab === tab ? "text-[#E1B76F]" : "text-[#cbb18a] hover:text-[#f3cb87]"
                }`}
              >
                {tab === "Reviews" ? (
                  <span className="flex items-center gap-2">
                    Reviews
                    {reviews.length > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full border border-[#5c0f0d] bg-[#2b0403] text-[#E1B76F] text-[10px] font-bold">
                        {reviews.length}
                      </span>
                    )}
                  </span>
                ) : tab}
                {activeTab === tab && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E1B76F] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="pt-8"
            >
              {/* DESCRIPTION */}
              {activeTab === "Description" && (
                <div className="max-w-3xl">
                  {product.description ? (
                    <RichText html={product.description} />
                  ) : (
                    <p className="text-[#cbb18a] text-sm">No description available.</p>
                  )}
                </div>
              )}

              {/* ADDITIONAL INFORMATION */}
              {activeTab === "Additional Information" && (
                <div className="max-w-2xl space-y-8">
                  {product.sizes.length > 0 && (
                    <div>
                      <h3 className="font-heading text-[15px] font-bold uppercase text-[#E1B76F] mb-4">Size Guide</h3>
                      <div className="overflow-x-auto rounded-xl border border-[#5c0f0d] bg-[#2b0403]">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="bg-[#4a0705] border-b border-[#5c0f0d]">
                              {["Size", "Chest (cm)", "Length (cm)", "Shoulder (cm)"].map((h) => (
                                <th key={h} className="px-5 py-3 text-left font-semibold text-[#E1B76F]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {SIZE_TABLE.filter((r) => product.sizes.includes(r[0])).map((row) => (
                              <tr key={row[0]} className="border-b border-[#5c0f0d]/50 last:border-0 hover:bg-[#4a0705]/50 transition">
                                {row.map((cell, ci) => (
                                  <td key={ci} className={`px-5 py-3 ${ci === 0 ? "font-semibold text-[#E1B76F]" : "text-[#cbb18a]"}`}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(infoAttributes.length > 0 || product.sku || product.categories.length > 0 || product.tags.length > 0) && (
                    <div>
                      <h3 className="font-heading text-[15px] font-bold uppercase text-[#E1B76F] mb-4">Product Specifications</h3>
                      <div className="overflow-x-auto rounded-xl border border-[#5c0f0d] bg-[#2b0403]">
                        <table className="w-full text-[13px]">
                          <tbody>
                            {infoAttributes.map((attr) => (
                              <tr key={attr.id} className="border-b border-[#5c0f0d]/50 last:border-0 hover:bg-[#4a0705]/50 transition">
                                <td className="px-5 py-3 font-semibold text-[#E1B76F] w-40 bg-[#4a0705]">{attr.name}</td>
                                <td className="px-5 py-3 text-[#cbb18a]">{attr.options.join(", ")}</td>
                              </tr>
                            ))}
                            {product.sku && (
                              <tr className="border-b border-[#5c0f0d]/50 last:border-0 hover:bg-[#4a0705]/50 transition">
                                <td className="px-5 py-3 font-semibold text-[#E1B76F] bg-[#4a0705]">SKU</td>
                                <td className="px-5 py-3 text-[#cbb18a]">{product.sku}</td>
                              </tr>
                            )}
                            {product.categories.length > 0 && (
                              <tr className="border-b border-[#5c0f0d]/50 last:border-0 hover:bg-[#4a0705]/50 transition">
                                <td className="px-5 py-3 font-semibold text-[#E1B76F] bg-[#4a0705]">{product.categories.length > 1 ? "Categories" : "Category"}</td>
                                <td className="px-5 py-3 text-[#cbb18a]">
                                  <div className="flex flex-wrap gap-1.5">
                                    {product.categories.map((c) => (
                                      <Link key={c.id} href={`/${c.slug}`} className="inline-flex items-center rounded-full border border-[#5c0f0d] bg-[#4a0705] px-2.5 py-0.5 text-[12px] font-medium text-[#E1B76F] hover:bg-[#5c0f0d] transition">
                                        {c.name}
                                      </Link>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                            {product.tags.length > 0 && (
                              <tr className="hover:bg-[#4a0705]/50 transition">
                                <td className="px-5 py-3 font-semibold text-[#E1B76F] bg-[#4a0705]">Tags</td>
                                <td className="px-5 py-3 text-[#cbb18a]">
                                  <div className="flex flex-wrap gap-1.5">
                                    {product.tags.map((t) => (
                                      <span key={t.id} className="inline-flex items-center rounded-full border border-[#5c0f0d] bg-[#4a0705] px-2.5 py-0.5 text-[12px] text-[#cbb18a]">#{t.name}</span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {infoAttributes.length === 0 && !product.sku && product.categories.length === 0 && product.tags.length === 0 && (
                    <p className="text-sm text-[#cbb18a]">No additional information available.</p>
                  )}
                </div>
              )}

              {/* REVIEWS */}
              {activeTab === "Reviews" && (
                <div className="space-y-10">
                  {reviewsLoading ? (
                    /* Loading skeleton while fetching from WC */
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-[#5c0f0d] bg-[#4a0705] p-5 space-y-3 animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#2b0403]" />
                            <div className="space-y-1.5 flex-1">
                              <div className="h-3 w-24 rounded bg-[#2b0403]" />
                              <div className="h-3 w-16 rounded bg-[#2b0403]/60" />
                            </div>
                          </div>
                          <div className="h-3 w-20 rounded bg-[#2b0403]" />
                          <div className="space-y-2">
                            <div className="h-3 w-full rounded bg-[#2b0403]/60" />
                            <div className="h-3 w-3/4 rounded bg-[#2b0403]/60" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : reviews.length > 0 ? (
                    <>
                      <RatingBreakdown reviews={reviews} />
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {reviews.map((r) => (
                          <ReviewCard key={r.id} review={r} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="h-16 w-16 rounded-full border border-[#5c0f0d] bg-[#2b0403] flex items-center justify-center mb-4">
                        <MessageSquare className="h-7 w-7 text-[#cbb18a]" />
                      </div>
                      <h3 className="font-heading text-[16px] font-bold uppercase text-[#E1B76F] mb-1">No reviews yet</h3>
                      <p className="text-[14px] text-[#cbb18a] max-w-xs">
                        Be the first to share your experience with this product.
                      </p>
                    </div>
                  )}

                  {/* ── Write a Review form ────────────────────────────── */}
                  {!reviewsLoading && (
                    <div className="border-t border-[#5c0f0d] pt-8">
                      <ReviewForm
                        productId={product.id}
                        onSuccess={handleReviewSuccess}
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Sticky Bottom Action Bar matching Gorur Ghash ── */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#5c0f0d] bg-[#2b0403]/95 backdrop-blur-md px-4 py-2.5 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
          <div className="container mx-auto max-w-[1400px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#5c0f0d] bg-white">
                <Image
                  src={activeImg}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h4 className="truncate text-xs sm:text-sm font-bold text-[#E1B76F]">
                  {product.name}
                </h4>
                <span className="font-heading text-xs sm:text-sm font-black text-[#f3cb87]">
                  {formatPrice(pricing.current)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onAddToCart}
                disabled={product.stock_status !== "instock"}
                className={`rounded-full px-5 sm:px-7 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider transition shadow-lg ${
                  added
                    ? "bg-[#2b0403] text-[#E1B76F] border border-[#E1B76F]"
                    : "bg-[#fbdd02] text-black hover:bg-yellow-400"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {added ? "Added to Cart" : "Select options"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
