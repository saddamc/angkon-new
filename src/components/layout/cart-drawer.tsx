"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X, ArrowRight, Truck } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/utils/price";

interface Props {
  open: boolean;
  onClose: () => void;
}

const FREE_SHIPPING_THRESHOLD = 3000;

export function CartDrawer({ open, onClose }: Props) {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const itemCount = useCartStore((s) => s.itemCount());
  const subtotal = useCartStore((s) => s.subtotal());

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!mounted) return null;

  const freeShippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountNeeded = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="astra-cart-overlay"
          className="fixed inset-0 z-[9999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <button
            className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-[2px] transition-opacity"
            onClick={onClose}
            aria-label="Close cart"
          />

          {/* Astra Cart Drawer Panel — Right side */}
          <motion.aside
            aria-label="Shopping Cart Drawer"
            className="absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-[#400604] border-l border-[#5c0f0d] shadow-[-8px_0_30px_rgba(0,0,0,0.5)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
          >
            {/* ── 1. Drawer Header ── */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[#5c0f0d] px-6 py-4 bg-[#2b0403]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#E1B76F]" />
                <h2 className="font-heading text-[16px] font-bold uppercase tracking-wider text-[#E1B76F]">
                  Shopping Cart
                </h2>
                {itemCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E1B76F] px-1.5 text-[11px] font-black text-[#400604]">
                    {itemCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#E1B76F] hover:bg-[#400604] transition"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── 2. Free Shipping Bar ── */}
            {items.length > 0 && (
              <div className="border-b border-[#5c0f0d] bg-[#2b0403] px-6 py-3">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[#cbb18a]">
                  <Truck className="h-4 w-4 text-[#E1B76F]" />
                  {amountNeeded === 0 ? (
                    <span className="text-[#E1B76F] font-bold">🎉 You qualify for FREE shipping!</span>
                  ) : (
                    <span>
                      Add <strong className="text-[#E1B76F]">{formatPrice(amountNeeded)}</strong> more to get{" "}
                      <strong className="text-[#E1B76F]">FREE Shipping</strong>
                    </span>
                  )}
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#400604]">
                  <div
                    className="h-full bg-[#E1B76F] transition-all duration-300"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── 3. Drawer Body (Items) ── */}
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2b0403] border border-[#5c0f0d]">
                  <ShoppingBag className="h-10 w-10 text-[#cbb18a]" />
                </div>
                <div>
                  <p className="font-heading text-lg font-bold text-[#E1B76F]">No products in the cart.</p>
                  <p className="mt-1 text-sm text-[#cbb18a]">Discover our latest drops and heritage designs!</p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-3 inline-flex items-center justify-center rounded-[12px] border-2 border-[#E1B76F] bg-[#E1B76F] px-8 py-3 text-sm font-bold text-[#400604] transition hover:bg-[#f3cb87] hover:border-[#f3cb87]"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#5c0f0d]">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    {/* Thumbnail */}
                    <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#2b0403] border border-[#5c0f0d]">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="line-clamp-2 text-[13px] font-semibold text-[#E1B76F] leading-snug">
                            {item.name}
                          </p>
                          {item.size && (
                            <p className="mt-1 text-[11px] font-medium text-[#cbb18a] uppercase">
                              Size: <span className="font-bold text-[#E1B76F]">{item.size}</span>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.productId, item.size)}
                          className="text-[#cbb18a] hover:text-[#E1B76F] transition p-1"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Quantity Stepper & Price */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-[#5c0f0d] bg-[#2b0403] px-2 py-0.5">
                          <button
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="p-1 text-[#cbb18a] hover:text-[#E1B76F] disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-[12px] font-bold text-[#E1B76F]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                            className="p-1 text-[#cbb18a] hover:text-[#E1B76F]"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-[14px] font-bold text-[#E1B76F]">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── 4. Drawer Footer ── */}
            {items.length > 0 && (
              <div className="flex-shrink-0 border-t border-[#5c0f0d] bg-[#2b0403] p-6 space-y-4">
                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="font-heading text-sm font-bold uppercase tracking-wider text-[#cbb18a]">
                    Subtotal:
                  </span>
                  <span className="font-heading text-xl font-black text-[#E1B76F]">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <p className="text-[12px] text-[#cbb18a]">
                  Taxes and shipping calculated at checkout
                </p>

                {/* CTAs */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    href="/cart"
                    onClick={onClose}
                    className="flex items-center justify-center rounded-[12px] border border-[#E1B76F] bg-transparent py-3 text-[13px] font-bold text-[#E1B76F] transition hover:bg-[#E1B76F] hover:text-[#400604]"
                  >
                    View Cart
                  </Link>
                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 rounded-[12px] border-2 border-[#E1B76F] bg-[#E1B76F] py-3 text-[13px] font-black text-[#400604] transition hover:bg-[#f3cb87] hover:border-[#f3cb87] shadow-sm"
                  >
                    Checkout <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
