"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  RotateCcw,
  Search,
  Send,
  Shield,
  Star,
  Store,
  Truck,
  User,
  X,
  Zap,
} from "lucide-react";
import { SizeSelector } from "@/components/product/size-selector";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import type { WooProduct, WooReview } from "@/types/product";
import { formatPrice, getDisplayPrice } from "@/utils/price";
import { fixPlainTextTablesAndLists } from "@/utils/rich-text";
import { saveRecentlyViewed } from "@/utils/recently-viewed";

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
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Share</p>
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
              : "border-neutral-300 bg-white text-neutral-600 hover:border-black hover:text-black"
          }`}
          title={copied ? "Link Copied!" : "Copy Link"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-white" />
          ) : (
            <Copy className="h-4 w-4 text-neutral-600" />
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
        className={`product-prose text-neutral-800 ${className}`}
        dangerouslySetInnerHTML={{ __html: fixPlainTextTablesAndLists(html) }}
      />
    );
  }
  const paragraphs = html.trim().split(/\n{2,}/);
  return (
    <div className={`product-prose text-neutral-800 ${className}`}>
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
              : "fill-neutral-200 text-neutral-300"
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
    <div className="border-b border-neutral-200 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-[14px] font-semibold text-neutral-900 transition hover:text-black"
      >
        {label}
        <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
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
            <div className="pb-4 text-sm leading-relaxed text-neutral-600">{children}</div>
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
      <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50">
          <BadgeCheck className="h-7 w-7 text-emerald-600" />
        </div>
        <h3 className="font-heading text-[17px] font-bold uppercase text-black mb-1">Thank you for your review!</h3>
        <p className="text-[14px] text-neutral-600">Your review has been submitted and is now visible to everyone.</p>
      </div>
    );
  }

  const activeStars = hover || rating;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
      <h3 className="font-heading text-[17px] font-bold uppercase text-black mb-1">Write a Review</h3>
      <p className="text-[13px] text-neutral-500 mb-6">Share your honest experience with this product</p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Star Rating Picker */}
        <div>
          <label className="mb-2 block text-[13px] font-semibold text-neutral-700">
            Your Rating <span className="text-red-500">*</span>
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
                    className={`h-8 w-8 transition-colors ${
                      val <= activeStars ? "fill-amber-400 text-amber-400" : "fill-neutral-100 text-neutral-200"
                    }`}
                  />
                </button>
              );
            })}
            {activeStars > 0 && (
              <span className="ml-2 text-[13px] font-semibold text-black">
                {RATING_LABELS[activeStars]}
              </span>
            )}
          </div>
        </div>

        {/* Name + Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-neutral-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rafiq Hossain"
              maxLength={100}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[14px] text-black placeholder:text-neutral-400 outline-none transition focus:border-black focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-neutral-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              maxLength={200}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[14px] text-black placeholder:text-neutral-400 outline-none transition focus:border-black focus:bg-white"
            />
            <p className="mt-1 text-[11px] text-neutral-400">Will not be published</p>
          </div>
        </div>

        {/* Review Text */}
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-neutral-700">
            Your Review <span className="text-red-500">*</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you love about this product? How is the quality and delivery?"
            rows={5}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[14px] text-black placeholder:text-neutral-400 outline-none transition focus:border-black focus:bg-white"
          />
          <div className="mt-1 flex justify-between">
            <span className="text-[11px] text-neutral-400">Minimum 10 characters</span>
            <span className={`text-[11px] ${text.length > 1900 ? "text-amber-500" : "text-neutral-400"}`}>
              {text.length}/2000
            </span>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center gap-2 rounded-full bg-[#ffd800] px-7 py-3 text-[14px] font-bold text-black shadow-sm transition hover:bg-black hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={review.reviewer}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-neutral-200"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[13px] font-bold text-neutral-800">
              {nameInitials || <User className="h-4 w-4" />}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold text-neutral-900">{review.reviewer}</span>
              {review.verified && (
                <span className="flex items-center gap-0.5 text-[11px] text-emerald-600 font-medium">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
            </div>
            {date && <span className="text-[12px] text-neutral-500">{date}</span>}
          </div>
        </div>
        <StarRow rating={rating} size="sm" />
      </div>
      {reviewText && (
        <div className="text-[14px] leading-relaxed text-neutral-700">{reviewText}</div>
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
    <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center p-6 rounded-2xl bg-neutral-50 border border-neutral-200 mb-8 shadow-sm">
      <div className="text-center shrink-0">
        <div className="text-[56px] font-black text-black leading-none">{avg.toFixed(1)}</div>
        <StarRow rating={avg} />
        <div className="mt-1 text-[13px] text-neutral-600">{total} review{total !== 1 ? "s" : ""}</div>
      </div>
      <div className="w-px self-stretch bg-neutral-200 hidden sm:block" />
      <div className="flex-1 w-full space-y-2">
        {counts.map(({ star, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-16 shrink-0">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-[13px] font-medium text-neutral-700">{star}</span>
              </div>
              <div className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: (5 - star) * 0.06, ease: "easeOut" }}
                  className="h-full rounded-full bg-[#ffd800]"
                />
              </div>
              <span className="text-[12px] text-neutral-500 w-10 text-right shrink-0">{count}</span>
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
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 450);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (product?.id) {
      saveRecentlyViewed({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price || product.regular_price || "0",
        image: product.images?.[0]?.src,
      });
    }
  }, [product]);

  // Lock body scroll and enable keyboard navigation when Lightbox is open
  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        setActiveImage((prev) => (prev > 0 ? prev - 1 : (product.images.length || 1) - 1));
      } else if (e.key === "ArrowRight") {
        setActiveImage((prev) => (prev < (product.images.length || 1) - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen, product.images.length]);

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
    <div className="min-h-screen bg-white text-black">
      {/* Main product grid */}
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-14 items-start">

          {/* LEFT: Image Gallery with Hover Image Zoom (Matches Gorur Ghash Exactly) */}
          <div className="flex flex-col w-full lg:sticky lg:top-24 lg:self-start">
            {/* Main Image Container */}
            <div
              className="group relative w-full aspect-[4/5] overflow-hidden bg-[#fbfbfb] border border-[#e7e7e7] rounded-none cursor-crosshair select-none"
              onClick={() => setLightboxOpen(true)}
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                setZoomPos({ x, y });
              }}
            >
              {/* Zoomable Image */}
              <div
                className="relative w-full h-full"
                style={{
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transform: isZoomed ? "scale(2.2)" : "scale(1)",
                  transition: isZoomed ? "transform 0.05s ease-out" : "transform 0.25s ease-in-out",
                  willChange: "transform, transform-origin",
                }}
              >
                <Image
                  src={activeImg}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover pointer-events-none"
                  priority
                />
              </div>

              {/* Sale badge */}
              {pricing.hasSale && (
                <div className="absolute left-3 top-3 z-10 pointer-events-none">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[9px] font-black uppercase text-[#ffd800] shadow">
                    Sale!
                  </span>
                </div>
              )}

              {/* Top-Right Circular Zoom Trigger Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#444444] shadow-[0_2px_6px_rgba(0,0,0,0.14)] hover:text-black hover:scale-105 transition cursor-pointer"
                title="Click to enlarge"
                aria-label="Enlarge image"
              >
                <Search className="h-4 w-4 stroke-[2]" />
              </button>
            </div>

            {/* Thumbnails (Exact 4 Columns Matching Gorur Ghash) */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2.5 sm:gap-3 mt-3 sm:mt-4">
                {images.map((img, i) => (
                  <button
                    key={img.id ?? i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    onMouseEnter={() => setActiveImage(i)}
                    className={`relative aspect-[4/5] w-full overflow-hidden bg-[#fbfbfb] transition-all cursor-pointer ${
                      activeImage === i
                        ? "border border-[#333333] opacity-100 ring-1 ring-[#333333]"
                        : "border border-transparent opacity-75 hover:opacity-100 hover:border-neutral-300"
                    }`}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt || product.name}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Info */}
          <div className="flex flex-col">

            {/* Breadcrumb (Inside Right Column Above Title - Exact Match to Screenshot) */}
            <nav className="text-[13px] text-[#777777] font-normal leading-relaxed mb-2.5 flex flex-wrap items-center gap-1.5">
              <Link href="/" className="hover:text-black transition">Home</Link>
              <span>/</span>
              {product.categories.map((c) => (
                <span key={c.id} className="flex items-center gap-1.5">
                  <Link href={`/product-category/${c.slug}`} className="hover:text-black transition">
                    {c.name}
                  </Link>
                  <span>/</span>
                </span>
              ))}
              <span className="text-[#333333] line-clamp-1">{product.name}</span>
            </nav>

            {/* Product Title */}
            <h1 className="text-[26px] sm:text-[30px] lg:text-[32px] font-light text-[#333333] leading-[1.25] mb-2 tracking-normal">
              {product.name}
            </h1>

            {/* Price */}
            <div className="text-[22px] sm:text-[24px] font-bold text-[#111111] mb-2 flex items-baseline gap-2.5">
              <span>Tk{pricing.current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {pricing.hasSale && (
                <>
                  <span className="text-[16px] text-[#888888] font-normal line-through">
                    Tk{pricing.regular.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[12px] font-bold text-red-600">
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>

            {/* Shipping Delivery Time Text */}
            <p className="text-[14px] text-[#4e4e4e] leading-relaxed mb-3">
              Order now and get it in 1-3 Days inside BD and 5-7 Days Internationally
            </p>

            {/* Short Description (Measurements & Key Info) */}
            {product.short_description ? (
              <div className="text-[14px] leading-relaxed text-[#4e4e4e] mb-5">
                <RichText html={product.short_description} />
              </div>
            ) : product.description ? (
              <div className="text-[14px] leading-relaxed text-[#4e4e4e] mb-5">
                <RichText html={product.description} />
              </div>
            ) : null}

            <div className="h-px bg-neutral-200" />

            {/* Size */}
            {product.sizes.length > 0 && (
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-black">
                    Size{size && <span className="ml-2 font-normal text-neutral-500">— {size}</span>}
                  </span>
                  <button type="button" onClick={() => setActiveTab("Additional Information")} className="text-[12px] font-medium text-black underline underline-offset-2 hover:opacity-75 transition">
                    Size Guide
                  </button>
                </div>
                <SizeSelector value={size} onChange={setSize} availableSizes={product.sizes} />
              </div>
            )}

            {/* Quantity */}
            <div>
              <span className="mb-2.5 block text-[14px] font-bold text-black">Quantity</span>
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </div>

            {/* Delivery Info Card (Bangladeshi Shipping Estimator) */}
            {deliveryFee && (deliveryFee.inside > 0 || deliveryFee.outside > 0) && (
              <div className="flex items-center gap-3.5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#ffd800] text-black shadow-sm">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-heading text-[13px] font-bold text-black uppercase tracking-wider">Estimated Delivery</span>
                  <div className="flex items-center gap-2 text-[12px] text-neutral-600 flex-wrap">
                    <span>Inside Dhaka (2-3 Days): <strong className="font-bold text-black">Tk{deliveryFee.inside.toLocaleString()}</strong></span>
                    <span className="text-neutral-300">•</span>
                    <span>Outside Dhaka (3-5 Days): <strong className="font-bold text-black">Tk{deliveryFee.outside.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* CTAs (Gorur Ghash Yellow Add to Cart Pill Button) */}
            <div className="flex flex-col gap-3 sm:flex-row pt-2">
              <button
                type="button"
                onClick={onAddToCart}
                disabled={product.stock_status !== "instock"}
                className={`relative flex h-[50px] flex-1 items-center justify-center gap-2 rounded-full px-8 text-[14px] font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                  added ? "bg-black text-[#ffd800]" : "bg-[#ffd800] text-black hover:bg-black hover:text-white"
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
                className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-full border-2 border-black bg-black text-[14px] font-bold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98]"
              >
                <Zap className="h-4 w-4" /> Buy It Now
              </Link>
            </div>

            {/* Share */}
            <div className="border-t border-neutral-200 pt-4">
              <ShareStrip title={product.name} />
            </div>
          </div>
        </div>

        {/* ── Tabbed Panel ─────────────────────────────────────────────── */}
        <div className="mt-16 border-t border-neutral-200 pt-10">
          {/* Tab bar */}
          <div className="flex gap-0 border-b border-neutral-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative shrink-0 px-6 py-3.5 text-[14px] font-semibold transition whitespace-nowrap ${
                  activeTab === tab ? "text-black" : "text-neutral-500 hover:text-black"
                }`}
              >
                {tab === "Reviews" ? (
                  <span className="flex items-center gap-2">
                    Reviews
                    {reviews.length > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full border border-neutral-200 bg-neutral-100 text-black text-[10px] font-bold">
                        {reviews.length}
                      </span>
                    )}
                  </span>
                ) : tab}
                {activeTab === tab && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />
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
                    <p className="text-neutral-500 text-sm">No description available.</p>
                  )}
                </div>
              )}

              {/* ADDITIONAL INFORMATION */}
              {activeTab === "Additional Information" && (
                <div className="max-w-2xl space-y-8">
                  {product.sizes.length > 0 && (
                    <div>
                      <h3 className="font-heading text-[15px] font-bold uppercase text-black mb-4">Size Guide</h3>
                      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-200">
                              {["Size", "Chest (cm)", "Length (cm)", "Shoulder (cm)"].map((h) => (
                                <th key={h} className="px-5 py-3 text-left font-semibold text-neutral-900">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {SIZE_TABLE.filter((r) => product.sizes.includes(r[0])).map((row) => (
                              <tr key={row[0]} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 transition">
                                {row.map((cell, ci) => (
                                  <td key={ci} className={`px-5 py-3 ${ci === 0 ? "font-semibold text-black" : "text-neutral-700"}`}>{cell}</td>
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
                      <h3 className="font-heading text-[15px] font-bold uppercase text-black mb-4">Product Specifications</h3>
                      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                        <table className="w-full text-[13px]">
                          <tbody>
                            {infoAttributes.map((attr) => (
                              <tr key={attr.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 transition">
                                <td className="px-5 py-3 font-semibold text-neutral-900 w-40 bg-neutral-50">{attr.name}</td>
                                <td className="px-5 py-3 text-neutral-700">{attr.options.join(", ")}</td>
                              </tr>
                            ))}
                            {product.sku && (
                              <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 transition">
                                <td className="px-5 py-3 font-semibold text-neutral-900 bg-neutral-50">SKU</td>
                                <td className="px-5 py-3 text-neutral-700">{product.sku}</td>
                              </tr>
                            )}
                            {product.categories.length > 0 && (
                              <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 transition">
                                <td className="px-5 py-3 font-semibold text-neutral-900 bg-neutral-50">{product.categories.length > 1 ? "Categories" : "Category"}</td>
                                <td className="px-5 py-3 text-neutral-700">
                                  <div className="flex flex-wrap gap-1.5">
                                    {product.categories.map((c) => (
                                      <Link key={c.id} href={`/${c.slug}`} className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-200 transition">
                                        {c.name}
                                      </Link>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                            {product.tags.length > 0 && (
                              <tr className="hover:bg-neutral-50/50 transition">
                                <td className="px-5 py-3 font-semibold text-neutral-900 bg-neutral-50">Tags</td>
                                <td className="px-5 py-3 text-neutral-700">
                                  <div className="flex flex-wrap gap-1.5">
                                    {product.tags.map((t) => (
                                      <span key={t.id} className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-[12px] text-neutral-600">#{t.name}</span>
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
                    <p className="text-sm text-neutral-500">No additional information available.</p>
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
                        <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3 animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-neutral-100" />
                            <div className="space-y-1.5 flex-1">
                              <div className="h-3 w-24 rounded bg-neutral-100" />
                              <div className="h-3 w-16 rounded bg-neutral-100" />
                            </div>
                          </div>
                          <div className="h-3 w-20 rounded bg-neutral-100" />
                          <div className="space-y-2">
                            <div className="h-3 w-full rounded bg-neutral-100" />
                            <div className="h-3 w-3/4 rounded bg-neutral-100" />
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
                      <div className="h-16 w-16 rounded-full border border-neutral-200 bg-neutral-50 flex items-center justify-center mb-4">
                        <MessageSquare className="h-7 w-7 text-neutral-400" />
                      </div>
                      <h3 className="font-heading text-[16px] font-bold uppercase text-black mb-1">No reviews yet</h3>
                      <p className="text-[14px] text-neutral-500 max-w-xs">
                        Be the first to share your experience with this product.
                      </p>
                    </div>
                  )}

                  {/* ── Write a Review form ────────────────────────────── */}
                  {!reviewsLoading && (
                    <div className="border-t border-neutral-200 pt-8">
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
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-xl animate-in slide-in-from-bottom-2 duration-300">
          <div className="container mx-auto max-w-[1400px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded border border-neutral-200 bg-white">
                <Image
                  src={activeImg}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h4 className="truncate text-xs sm:text-sm font-bold text-black">
                  {product.name}
                </h4>
                <span className="font-heading text-xs sm:text-sm font-bold text-black">
                  Tk{pricing.current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onAddToCart}
                disabled={product.stock_status !== "instock"}
                className={`rounded-full px-5 sm:px-7 py-2 sm:py-2.5 text-xs font-bold uppercase tracking-wider transition shadow-sm ${
                  added
                    ? "bg-black text-[#ffd800]"
                    : "bg-[#ffd800] text-black hover:bg-black hover:text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {added ? "Added to Cart" : "Select options"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Lightbox Modal ── */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm select-none"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Prev button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImage((prev) => (prev > 0 ? prev - 1 : images.length - 1));
              }}
              className="absolute left-4 sm:left-8 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}

          {/* Large image */}
          <div
            className="relative h-[80vh] w-full max-w-[88vw] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImg}
              alt={product.name}
              fill
              className="object-contain"
              priority
              sizes="90vw"
            />
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImage((prev) => (prev < images.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-4 sm:right-8 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          )}

          {/* Counter indicator */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-black/60 text-white text-xs tracking-wider">
              {activeImage + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
