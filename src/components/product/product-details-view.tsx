"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Maximize,
  Minimize,
  Ruler,
  Search,
  Truck,
  X,
} from "lucide-react";
import {
  ReadyToWearSizeGuideModal,
  ReadyToWearSizeGuideContent,
} from "@/components/product/ready-to-wear-size-guide-modal";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import type { WooProduct } from "@/types/product";
import { formatPrice, getDisplayPrice } from "@/utils/price";
import { fixPlainTextTablesAndLists } from "@/utils/rich-text";
import { saveRecentlyViewed } from "@/utils/recently-viewed";
import { trackViewContent, trackAddToCart } from "@/lib/fpixel";

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
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/70">Share</p>
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
              : "border-[#E1B76F]/30 bg-[#340402] text-white/90 hover:border-[#E1B76F] hover:text-[#E1B76F]"
          }`}
          title={copied ? "Link Copied!" : "Copy Link"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-white" />
          ) : (
            <Copy className="h-4 w-4 text-white/90" />
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function RichText({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null;
  const cleanHtml = html
    .replace(/<div[^>]*class="[^"]*mt-6[^"]*"[^>]*>[\s\S]*?size-chart[\s\S]*?<\/div>/gi, "")
    .replace(/<p[^>]*>[\s\S]*?size-chart[\s\S]*?<\/p>/gi, "");
  if (/<[a-z][\s\S]*>/i.test(cleanHtml)) {
    return (
      <div
        className={`product-prose text-neutral-800 ${className}`}
        dangerouslySetInnerHTML={{ __html: fixPlainTextTablesAndLists(cleanHtml) }}
      />
    );
  }
  const paragraphs = cleanHtml.trim().split(/\n{2,}/);
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

/* ── Main Component ─────────────────────────────────────────────────── */

type Tab = "Description" | "Additional information" | "Size Guide";

export function ProductDetailsView({
  product,
}: {
  product: WooProduct;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState("");
  const [optionError, setOptionError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Description");
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxFullscreen, setLightboxFullscreen] = useState(false);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);

  const openLightbox = useCallback((index?: number) => {
    setLightboxIndex(typeof index === "number" ? index : activeImage);
    setLightboxZoomed(false);
    setLightboxOpen(true);
  }, [activeImage]);

  const toggleBrowserFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setLightboxFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setLightboxFullscreen(false);
    }
  }, []);

  const closeLightbox = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setLightboxFullscreen(false);
    setLightboxZoomed(false);
    setLightboxOpen(false);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setLightboxFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        setLightboxZoomed(false);
        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : (product.images.length || 1) - 1));
      } else if (e.key === "ArrowRight") {
        setLightboxZoomed(false);
        setLightboxIndex((prev) => (prev < (product.images.length || 1) - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen, product.images.length, closeLightbox]);

  const insideFee = parseInt(product.meta_data?.slice().reverse().find(m => m.key === "_delivery_inside")?.value || "60");
  const outsideFee = parseInt(product.meta_data?.slice().reverse().find(m => m.key === "_delivery_outside")?.value || "120");

  const deliveryFee = useMemo(() => ({
    inside: insideFee,
    outside: outsideFee
  }), [insideFee, outsideFee]);

  const pricing = useMemo(
    () => getDisplayPrice(product.regular_price || product.price, product.sale_price),
    [product.price, product.regular_price, product.sale_price],
  );

  useEffect(() => {
    if (product?.id) {
      trackViewContent({
        content_name: product.name,
        content_category: product.categories?.[0]?.name || "Apparel",
        content_ids: [product.id],
        value: pricing.current,
        currency: "BDT",
      });
    }
  }, [product?.id, product?.name, product?.categories, pricing.current]);

  const images =
    product.images.length > 0
      ? product.images
      : [{ id: 0, src: "https://placehold.co/1200x1500/f4f4f5/18181b.png?text=Product", alt: product.name, name: product.name }];
  const activeImg = images[activeImage]?.src ?? images[0]?.src;
  const lightboxImg = images[lightboxIndex]?.src ?? images[0]?.src;
  const discountPct = pricing.hasSale ? Math.round((1 - pricing.current / pricing.regular) * 100) : 0;
  const infoAttributes = product.attributes.filter((a) => a.visible && a.name.toLowerCase() !== "size");
  const brandAttr = product.attributes.find((a) => a.name.toLowerCase() === "brand");
  const brand = brandAttr?.options?.[0];

  // Genuine customer selectable variation attributes (e.g. Size)
  const variationAttrs = useMemo(() => {
    const sizeAttr = product.attributes?.find(
      (a) => a.name.toLowerCase() === "size" || a.name.toLowerCase() === "sizes"
    );
    if (sizeAttr && sizeAttr.options && sizeAttr.options.length > 0) {
      return [sizeAttr];
    }
    if (product.sizes && product.sizes.length > 0) {
      return [{ id: 0, name: "Size", options: product.sizes, visible: true }];
    }
    const nonSpecAttrs = (product.attributes || []).filter((a) => {
      const name = a.name.toLowerCase().trim();
      const staticSpecs = [
        "brand", "collection", "outfit", "style", "occasion", "color",
        "fabric", "material", "pattern", "type", "piece", "season", "kameez", "trouser", "dupatta"
      ];
      return !staticSpecs.includes(name) && a.options && a.options.length > 1;
    });
    return nonSpecAttrs;
  }, [product.attributes, product.sizes]);

  const hasSizeGuide = useMemo(() => {
    const isApparel =
      product.categories?.some((c) =>
        /women|men|ethnic|suit|dress|clothing|kameez|sharee|panjabi/i.test(c.name || c.slug)
      ) ||
      product.name.toLowerCase().includes("tawakkal") ||
      product.name.toLowerCase().includes("wada") ||
      (product.sizes && product.sizes.length > 0) ||
      Boolean(product.attributes?.some((a) => a.name.toLowerCase() === "size"));
    return Boolean(isApparel);
  }, [product]);

  const tabs: Tab[] = useMemo(() => {
    return hasSizeGuide
      ? ["Description", "Additional information", "Size Guide"]
      : ["Description", "Additional information"];
  }, [hasSizeGuide]);

  const addItem = useCartStore((state) => state.addItem);
  const onAddToCart = () => {
    if (variationAttrs.length > 0 && !size) {
      setOptionError(true);
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: activeImg,
      price: pricing.current,
      size: size || product.sizes[0] || "Standard",
      quantity,
      shippingClassId: product.shipping_class_id ?? 0,
      deliveryInside: insideFee,
      deliveryOutside: outsideFee,
    });
    trackAddToCart({
      content_name: product.name,
      content_ids: [product.id],
      value: pricing.current * quantity,
      currency: "BDT",
    });
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
    <div className="min-h-screen bg-[#400604] text-white">
      {/* Main product grid */}
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-14 items-start">

          {/* LEFT: Image Gallery with In-Place Hover Zoom */}
          <div className="flex flex-col w-full lg:sticky lg:top-24 lg:self-start">
            {/* Main Image Container */}
            <div
              className="group relative w-full aspect-[4/5] overflow-hidden bg-[#340402] border border-[#E1B76F]/25 rounded-none cursor-default select-none shadow-md"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                setZoomPos({ x, y });
              }}
            >
              {/* In-Place Zoomable Image */}
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
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#400604] text-[9px] font-black uppercase text-white border border-[#E1B76F]/40 shadow-sm">
                    Sale!
                  </span>
                </div>
              )}

              {/* Top-Right Circular Zoom Trigger Button */}
              <button
                type="button"
                onClick={() => openLightbox(activeImage)}
                className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[#400604] text-white border border-[#E1B76F]/40 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:text-white hover:scale-105 transition cursor-pointer"
                title="Click to enlarge"
                aria-label="Enlarge image"
              >
                <Search className="h-4 w-4 stroke-[2]" />
              </button>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2.5 sm:gap-3 mt-3 sm:mt-4">
                {images.map((img, i) => (
                  <button
                    key={img.id ?? i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`relative aspect-[4/5] w-full overflow-hidden bg-[#340402] transition-all cursor-pointer ${
                      activeImage === i
                        ? "border border-[#E1B76F] opacity-100 ring-1 ring-[#E1B76F]"
                        : "border border-transparent opacity-75 hover:opacity-100 hover:border-[#E1B76F]/40"
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

            {/* Breadcrumb */}
            <nav className="text-[13px] text-white/70 font-normal leading-relaxed mb-2.5 flex flex-wrap items-center gap-1.5">
              <Link href="/" className="hover:text-white transition">Home</Link>
              <span>/</span>
              {product.categories.map((c) => (
                <span key={c.id} className="flex items-center gap-1.5">
                  <Link href={`/product-category/${c.slug}`} className="hover:text-white transition">
                    {c.name}
                  </Link>
                  <span>/</span>
                </span>
              ))}
              <span className="text-white font-medium line-clamp-1">{product.name}</span>
            </nav>

            {/* Product Title */}
            <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-normal text-white leading-snug mb-2 tracking-tight">
              {product.name}
            </h1>

            {/* Price */}
            <div className="text-2xl sm:text-[26px] font-bold text-[#E1B76F] mb-3 flex items-baseline gap-2.5">
              <span>Tk{pricing.current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {pricing.hasSale && (
                <>
                  <span className="text-[16px] text-white/60 font-normal line-through">
                    Tk{pricing.regular.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[12px] font-bold text-white bg-[#340402] px-2 py-0.5 rounded border border-[#E1B76F]/30">
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>

            {/* Shipping Delivery Reassurance Pill */}
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#340402] px-3.5 py-1.5 text-xs text-white mb-4 border border-[#E1B76F]/25 max-w-fit shadow-xs">
              <Truck className="h-4 w-4 text-white shrink-0" />
              <span>
                Order now & get it in <strong className="text-white font-bold">1–3 Days</strong> inside BD • <strong className="text-white font-bold">5–7 Days</strong> Intl.
              </span>
            </div>

            {/* Short Description */}
            {product.short_description ? (
              <div className="text-[14px] leading-relaxed text-white/90 mb-4">
                <RichText html={product.short_description} />
              </div>
            ) : product.description ? (
              <div className="text-[14px] leading-relaxed text-white/90 mb-4">
                <RichText html={product.description} />
              </div>
            ) : null}

            {/* Variation Attribute Selection (Size & Selectable Options) */}
            {variationAttrs.length > 0 && (
              <div className="space-y-4">
                {variationAttrs.map((attr) => {
                  const isSize = attr.name.toLowerCase() === "size" || attr.name.toLowerCase() === "sizes";
                  return (
                    <div key={attr.name} className="mt-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-[14px] font-bold text-white flex items-center gap-1.5">
                          {attr.name}
                          {isSize && size ? <span className="font-semibold text-white">({size})</span> : null}
                        </label>
                        {isSize && hasSizeGuide && (
                          <button
                            type="button"
                            onClick={() => setSizeGuideOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#E1B76F] hover:text-white underline underline-offset-4 decoration-[#E1B76F]/60 hover:decoration-white transition cursor-pointer rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1B76F]"
                            aria-label="Open size guide"
                          >
                            <Ruler className="h-4 w-4 text-white" />
                            Size Guide
                          </button>
                        )}
                      </div>

                      {/* Instant Size Pill Buttons */}
                      {isSize && attr.options.length > 0 && (
                        <div className="flex flex-wrap gap-2.5 mb-3" role="radiogroup" aria-label="Choose size">
                          {attr.options.map((opt) => {
                            const isSelected = size === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`Size ${opt}`}
                                onClick={() => {
                                  setSize(opt);
                                  setOptionError(false);
                                }}
                                className={`flex min-h-[42px] min-w-[46px] items-center justify-center px-4 rounded-lg border text-xs uppercase transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1B76F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#400604] ${
                                  isSelected
                                    ? "border-2 border-[#E1B76F] bg-[#E1B76F] text-[#400604] font-extrabold shadow-md ring-1 ring-[#E1B76F]"
                                    : "border-[#E1B76F]/30 bg-[#340402] text-white/90 font-bold hover:border-[#E1B76F] hover:bg-[#400604] hover:text-[#E1B76F]"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Dropdown Selector */}
                      <div className="relative max-w-[340px]">
                        <select
                          value={size}
                          onChange={(e) => {
                            setSize(e.target.value);
                            setOptionError(false);
                          }}
                          className={`w-full appearance-none rounded border bg-[#2d0302] px-3.5 py-2.5 pr-10 text-[14px] text-white outline-none transition cursor-pointer ${
                            optionError && !size
                              ? "border-red-500 ring-1 ring-red-500"
                              : "border-[#E1B76F]/40 focus:border-[#E1B76F]"
                          }`}
                        >
                          <option value="" className="bg-[#2d0302] text-white">Choose an option</option>
                          {attr.options.map((opt) => (
                            <option key={opt} value={opt} className="bg-[#2d0302] text-white">
                              {opt}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
                      </div>

                      {optionError && !size && (
                        <p className="mt-1 text-xs text-red-400 font-medium">Please choose a size</p>
                      )}
                      {size && (
                        <button
                          type="button"
                          onClick={() => setSize("")}
                          className="mt-1.5 block text-xs text-[#E1B76F]/70 hover:text-white underline underline-offset-2 transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="my-5 border-t border-[#E1B76F]/20" />

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 w-12 rounded border border-[#E1B76F]/40 bg-[#2d0302] text-center text-sm font-medium text-white outline-none focus:border-[#E1B76F] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={onAddToCart}
                disabled={product.stock_status !== "instock"}
                className="h-10 rounded-md bg-[#400604] border border-[#E1B76F]/40 px-7 text-sm font-bold tracking-wide uppercase text-white transition hover:bg-[#520805] hover:border-[#E1B76F] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
              >
                {added ? "Added to cart" : "Add to cart"}
              </button>
            </div>

            <div className="my-5 border-t border-[#E1B76F]/20" />

            {/* Product Meta: SKU & Category */}
            <div className="flex flex-wrap items-center gap-6 text-[13px] text-white">
              {product.sku && (
                <div>
                  <span className="text-white/70">SKU:</span>{" "}
                  <span className="font-normal text-white">{product.sku}</span>
                </div>
              )}
              {product.categories.length > 0 && (
                <div>
                  <span className="text-white/70">{product.categories.length > 1 ? "Categories:" : "Category:"}</span>{" "}
                  <span className="font-normal text-white">
                    {product.categories.map((c, i) => (
                      <span key={c.id}>
                        <Link href={`/${c.slug}`} className="hover:text-white transition">
                          {c.name}
                        </Link>
                        {i < product.categories.length - 1 && ", "}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {/* Share Strip */}
            <div className="border-t border-[#E1B76F]/20 mt-5 pt-4">
              <ShareStrip title={product.name} />
            </div>
          </div>
        </div>

        {/* ── Tabbed Panel ─────────────────────────────── */}
        <div className="mt-14 border-t border-[#E1B76F]/20">
          {/* Tab bar */}
          <div className="flex gap-8 border-b border-[#E1B76F]/20 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative shrink-0 py-3 text-[15px] transition whitespace-nowrap ${
                  activeTab === tab
                    ? "font-bold text-white border-t-2 border-[#E1B76F] -mt-[1px]"
                    : "font-normal text-white/70 hover:text-white border-t-2 border-transparent -mt-[1px]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pt-6">
            {/* DESCRIPTION */}
            {activeTab === "Description" && (
              <div className="max-w-4xl text-white/90 leading-relaxed text-[15px]">
                {product.description ? (
                  <RichText html={product.description} />
                ) : (
                  <p className="text-white/70 text-sm">No description available.</p>
                )}
              </div>
            )}

            {/* ADDITIONAL INFORMATION */}
            {activeTab === "Additional information" && (
              <div className="max-w-4xl">
                <table className="w-full border-collapse border border-[#E1B76F]/25 text-sm">
                  <tbody>
                    <tr className="border-b border-[#E1B76F]/20">
                      <th className="w-44 sm:w-56 p-3 sm:p-4 text-left font-normal sm:font-medium text-white border-r border-[#E1B76F]/20 bg-[#340402]">
                        Weight
                      </th>
                      <td className="p-3 sm:p-4 text-white/90 bg-[#2d0302]">
                        {product.weight ? `${product.weight} kg` : "N/A"}
                      </td>
                    </tr>
                    {product.attributes && product.attributes.length > 0 ? (
                      product.attributes.map((attr) => (
                        <tr key={attr.id || attr.name} className="border-b border-[#E1B76F]/20 last:border-b-0">
                          <th className="w-44 sm:w-56 p-3 sm:p-4 text-left font-normal sm:font-medium text-white border-r border-[#E1B76F]/20 bg-[#340402]">
                            {attr.name}
                          </th>
                          <td className="p-3 sm:p-4 text-white/90 bg-[#2d0302]">
                            {attr.options.join(", ")}
                          </td>
                        </tr>
                      ))
                    ) : product.sizes && product.sizes.length > 0 ? (
                      <tr className="border-b border-[#E1B76F]/20 last:border-b-0">
                        <th className="w-44 sm:w-56 p-3 sm:p-4 text-left font-normal sm:font-medium text-white border-r border-[#E1B76F]/20 bg-[#340402]">
                          Size
                        </th>
                        <td className="p-3 sm:p-4 text-white/90 bg-[#2d0302]">
                          {product.sizes.join(", ")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}

            {/* SIZE GUIDE (Exact Match to Image 2) */}
            {activeTab === "Size Guide" && (
              <div className="max-w-4xl">
                <ReadyToWearSizeGuideContent
                  selectedSize={size}
                  onSelectSize={(newSize) => {
                    setSize(newSize);
                    setOptionError(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Action Bar ── */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E1B76F]/30 bg-[#340402] text-white shadow-[0px_-2px_16px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-2 duration-300">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 min-h-[58px] sm:min-h-[64px] py-2 flex items-center justify-between gap-3 sm:gap-4">
            {/* Left: Thumbnail + Product Title */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 overflow-hidden bg-[#2d0302] border border-[#E1B76F]/20">
                <Image
                  src={activeImg}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 40px, 48px"
                  className="object-cover"
                />
              </div>
              <span className="truncate text-[13px] sm:text-[15px] font-normal text-white/90 leading-normal min-w-0">
                {product.name}
              </span>
            </div>

            {/* Right: Price + Action Button */}
            <div className="flex items-center gap-3 sm:gap-5 shrink-0">
              <span className="font-bold text-[14px] sm:text-[15px] text-[#E1B76F] whitespace-nowrap">
                Tk{pricing.current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (variationAttrs.length > 0 && !size) {
                    window.scrollTo({ top: 400, behavior: "smooth" });
                    setOptionError(true);
                    return;
                  }
                  onAddToCart();
                }}
                disabled={product.stock_status !== "instock"}
                className={`rounded-full px-5 sm:px-7 py-2 sm:py-2.5 text-xs sm:text-[14px] font-bold transition shadow-sm whitespace-nowrap ${
                  added
                    ? "bg-[#E1B76F] text-[#400604]"
                    : "bg-[#400604] border border-[#E1B76F]/40 text-white hover:bg-[#520805] hover:border-[#E1B76F]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {added
                  ? "Added to cart"
                  : size || variationAttrs.length === 0
                  ? "Add to cart"
                  : "Select options"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PhotoSwipe Style Lightbox Modal (Matches Image 1 & Image 2) ── */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          className={`fixed inset-0 z-[100] flex items-center justify-center transition-colors duration-200 select-none ${
            lightboxFullscreen ? "bg-black" : "bg-black/85 backdrop-blur-[2px]"
          }`}
          onClick={closeLightbox}
        >
          {/* Top Bar: Counter & Controls */}
          <div className="absolute top-0 left-0 right-0 z-[110] flex h-12 items-center justify-between px-3 sm:px-6">
            {/* Top-Left: Counter (Matches Image 1 & 2) */}
            <div className="text-[13px] font-normal tracking-wide text-white/90">
              {lightboxIndex + 1} / {images.length}
            </div>

            {/* Top-Right: Zoom, Fullscreen, Close */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Zoom In / Out */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoomed(!lightboxZoomed);
                }}
                className="flex h-10 w-10 items-center justify-center rounded text-white/80 transition hover:bg-white/10 hover:text-white cursor-pointer"
                title={lightboxZoomed ? "Zoom out" : "Zoom in"}
                aria-label="Toggle zoom"
              >
                <Search className="h-4.5 w-4.5 stroke-[2]" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBrowserFullscreen();
                }}
                className="flex h-10 w-10 items-center justify-center rounded text-white/80 transition hover:bg-white/10 hover:text-white cursor-pointer"
                title={lightboxFullscreen ? "Exit full screen" : "Toggle full screen"}
                aria-label="Toggle full screen"
              >
                {lightboxFullscreen ? (
                  <Minimize className="h-4.5 w-4.5 stroke-[2]" />
                ) : (
                  <Maximize className="h-4.5 w-4.5 stroke-[2]" />
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeLightbox();
                }}
                className="flex h-10 w-10 items-center justify-center rounded text-white/80 transition hover:bg-white/10 hover:text-white cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X className="h-5 w-5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Left Arrow (Flush to edge matching PhotoSwipe) */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxZoomed(false);
                setLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-[110] flex h-24 w-12 items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8 stroke-[1.5]" />
            </button>
          )}

          {/* Main Image Container */}
          <div
            className={`relative flex items-center justify-center transition-all duration-200 ${
              lightboxFullscreen
                ? "h-[94vh] w-[94vw]"
                : "h-[88vh] max-h-[88vh] w-[88vw] max-w-[88vw]"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxZoomed(!lightboxZoomed);
            }}
          >
            <div
              className={`relative w-full h-full transition-transform duration-200 select-none ${
                lightboxZoomed ? "scale-[1.65] cursor-zoom-out" : "scale-100 cursor-zoom-in"
              }`}
            >
              <Image
                src={lightboxImg}
                alt={product.name}
                fill
                className="object-contain"
                priority
                sizes="100vw"
              />
            </div>
          </div>

          {/* Right Arrow (Flush to edge matching PhotoSwipe) */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxZoomed(false);
                setLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-[110] flex h-24 w-12 items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8 stroke-[1.5]" />
            </button>
          )}
        </div>
      )}

      {/* ── Ready-to-Wear Size Guide Modal ── */}
      <ReadyToWearSizeGuideModal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        selectedSize={size}
        onSelectSize={(newSize) => {
          setSize(newSize);
          setOptionError(false);
        }}
      />
    </div>
  );
}
