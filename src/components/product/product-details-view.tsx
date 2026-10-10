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
  Search,
  X,
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import type { WooProduct } from "@/types/product";
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

/* ── Main Component ─────────────────────────────────────────────────── */

type Tab = "Description" | "Additional information";
const TABS: Tab[] = ["Description", "Additional information"];

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
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxFullscreen, setLightboxFullscreen] = useState(false);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);

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

  const images =
    product.images.length > 0
      ? product.images
      : [{ id: 0, src: "https://placehold.co/1200x1500/f4f4f5/18181b.png?text=Product", alt: product.name, name: product.name }];
  const activeImg = images[activeImage]?.src ?? images[0]?.src;
  const discountPct = pricing.hasSale ? Math.round((1 - pricing.current / pricing.regular) * 100) : 0;
  const infoAttributes = product.attributes.filter((a) => a.visible && a.name.toLowerCase() !== "size");
  const brandAttr = product.attributes.find((a) => a.name.toLowerCase() === "brand");
  const brand = brandAttr?.options?.[0];

  const variationAttrs = useMemo(() => {
    if (product.attributes && product.attributes.length > 0) {
      return product.attributes.filter((a) => a.options && a.options.length > 0);
    }
    if (product.sizes && product.sizes.length > 0) {
      return [{ id: 0, name: "Size", options: product.sizes, visible: true }];
    }
    return [];
  }, [product.attributes, product.sizes]);

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

            {/* Variation Attribute Dropdown (Matches Image 1 Exactly) */}
            {variationAttrs.length > 0 && (
              <div className="space-y-4">
                {variationAttrs.map((attr) => (
                  <div key={attr.name} className="mt-4">
                    <label className="block text-[14px] font-semibold text-[#111111] mb-2">
                      {attr.name}
                    </label>
                    <div className="relative max-w-[340px]">
                      <select
                        value={size}
                        onChange={(e) => {
                          setSize(e.target.value);
                          setOptionError(false);
                        }}
                        className={`w-full appearance-none rounded border bg-white px-3.5 py-2.5 pr-10 text-[14px] text-neutral-800 outline-none transition cursor-pointer ${
                          optionError && !size
                            ? "border-red-500 ring-1 ring-red-500"
                            : "border-neutral-300 focus:border-black"
                        }`}
                      >
                        <option value="">Choose an option</option>
                        {attr.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    </div>
                    {optionError && !size && (
                      <p className="mt-1 text-xs text-red-500 font-medium">Please choose an option</p>
                    )}
                    {size && (
                      <button
                        type="button"
                        onClick={() => setSize("")}
                        className="mt-1.5 block text-xs text-neutral-500 hover:text-black underline underline-offset-2 transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="my-5 border-t border-neutral-200" />

            {/* Quantity & Add to Cart (Matches Image 1 Exactly) */}
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-10 w-12 rounded border border-neutral-300 bg-white text-center text-sm font-medium text-neutral-800 outline-none focus:border-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={onAddToCart}
                disabled={product.stock_status !== "instock"}
                className="h-10 rounded-md bg-[#f6dd62] px-6 text-sm font-semibold text-neutral-900 transition hover:bg-[#eacb45] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {added ? "Added to cart" : "Add to cart"}
              </button>
            </div>

            <div className="my-5 border-t border-neutral-200" />

            {/* Product Meta: SKU & Category (Matches Image 1 Exactly) */}
            <div className="flex flex-wrap items-center gap-6 text-[13px] text-[#333333]">
              {product.sku && (
                <div>
                  <span className="text-[#666666]">SKU:</span>{" "}
                  <span className="font-normal text-[#222222]">{product.sku}</span>
                </div>
              )}
              {product.categories.length > 0 && (
                <div>
                  <span className="text-[#666666]">{product.categories.length > 1 ? "Categories:" : "Category:"}</span>{" "}
                  <span className="font-normal text-[#222222]">
                    {product.categories.map((c, i) => (
                      <span key={c.id}>
                        <Link href={`/${c.slug}`} className="hover:text-black transition">
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
            <div className="border-t border-neutral-200 mt-5 pt-4">
              <ShareStrip title={product.name} />
            </div>
          </div>
        </div>

        {/* ── Tabbed Panel (Exact Match to Image 2) ─────────────────────────────── */}
        <div className="mt-14 border-t border-neutral-200">
          {/* Tab bar */}
          <div className="flex gap-8 border-b border-neutral-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative shrink-0 py-3 text-[15px] transition whitespace-nowrap ${
                  activeTab === tab
                    ? "font-semibold text-black border-t-2 border-[#333333] -mt-[1px]"
                    : "font-normal text-neutral-600 hover:text-black border-t-2 border-transparent -mt-[1px]"
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
              <div className="max-w-4xl text-neutral-700 leading-relaxed text-[15px]">
                {product.description ? (
                  <RichText html={product.description} />
                ) : (
                  <p className="text-neutral-500 text-sm">No description available.</p>
                )}
              </div>
            )}

            {/* ADDITIONAL INFORMATION (Exact Match to Image 2) */}
            {activeTab === "Additional information" && (
              <div className="max-w-4xl">
                <table className="w-full border-collapse border border-neutral-200 text-sm">
                  <tbody>
                    <tr className="border-b border-neutral-200">
                      <th className="w-44 sm:w-56 p-3 sm:p-4 text-left font-normal sm:font-medium text-neutral-700 border-r border-neutral-200 bg-white">
                        Weight
                      </th>
                      <td className="p-3 sm:p-4 text-neutral-800 bg-white">
                        {product.weight ? `${product.weight} kg` : "N/A"}
                      </td>
                    </tr>
                    {product.attributes && product.attributes.length > 0 ? (
                      product.attributes.map((attr) => (
                        <tr key={attr.id || attr.name} className="border-b border-neutral-200 last:border-b-0">
                          <th className="w-44 sm:w-56 p-3 sm:p-4 text-left font-normal sm:font-medium text-neutral-700 border-r border-neutral-200 bg-white">
                            {attr.name}
                          </th>
                          <td className="p-3 sm:p-4 text-neutral-800 bg-white">
                            {attr.options.join(", ")}
                          </td>
                        </tr>
                      ))
                    ) : product.sizes && product.sizes.length > 0 ? (
                      <tr className="border-b border-neutral-200 last:border-b-0">
                        <th className="w-44 sm:w-56 p-3 sm:p-4 text-left font-normal sm:font-medium text-neutral-700 border-r border-neutral-200 bg-white">
                          Size
                        </th>
                        <td className="p-3 sm:p-4 text-neutral-800 bg-white">
                          {product.sizes.join(", ")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                onClick={() => {
                  if (variationAttrs.length > 0 && !size) {
                    window.scrollTo({ top: 400, behavior: "smooth" });
                    setOptionError(true);
                    return;
                  }
                  onAddToCart();
                }}
                disabled={product.stock_status !== "instock"}
                className={`rounded-full px-5 sm:px-7 py-2 sm:py-2.5 text-xs font-bold uppercase tracking-wider transition shadow-sm ${
                  added
                    ? "bg-black text-[#ffd800]"
                    : "bg-[#ffd800] text-black hover:bg-black hover:text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {added ? "Added to Cart" : size ? "Add to Cart" : "Select options"}
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
            lightboxFullscreen ? "bg-black" : "bg-black/70 backdrop-blur-[2px]"
          }`}
          onClick={closeLightbox}
        >
          {/* Top Bar: Counter & Controls */}
          <div className="absolute top-0 left-0 right-0 z-[110] flex h-12 items-center justify-between px-3 sm:px-6">
            {/* Top-Left: Counter (Matches Image 1 & 2) */}
            <div className="text-[13px] font-normal tracking-wide text-white/90">
              {activeImage + 1} / {images.length}
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
                setActiveImage((prev) => (prev > 0 ? prev - 1 : images.length - 1));
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
                src={activeImg}
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
                setActiveImage((prev) => (prev < images.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-[110] flex h-24 w-12 items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8 stroke-[1.5]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
