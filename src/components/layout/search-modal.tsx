"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { getProducts } from "@/services/products.service";
import { formatPrice } from "@/utils/price";
import { decodeEntities } from "@/utils/html";

interface SearchResult {
  id: number;
  name: string;
  slug: string;
  price: string;
  image: string;
  category: string;
}

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [latestProducts, setLatestProducts] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const closeModal = () => {
    setOpen(false);
    setSearch("");
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  };

  // Load the latest products on mount
  useEffect(() => {
    const loadLatestProducts = async () => {
      try {
        const products = await getProducts({ perPage: 100 });
        const latest = [...products]
          .sort((left, right) => right.id - left.id)
          .slice(0, 20)
          .map((p) => ({
            id: p.id,
            name: decodeEntities(p.name),
            slug: p.slug,
            price: formatPrice(p.price),
            image: p.images[0]?.src || "https://placehold.co/800x1000/f5f5f5/999.png?text=Product",
            category: p.categories[0]?.name ? decodeEntities(p.categories[0].name) : "Apparel",
          }));
        setLatestProducts(latest);
      } catch (error) {
        console.error("Failed to load latest products:", error);
      }
    };

    loadLatestProducts();
  }, []);

  // Handle search
  useEffect(() => {
    const searchProducts = async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const products = await getProducts({ search: search.trim(), perPage: 100 });
        const mapped = products.slice(0, 20).map((p) => ({
          id: p.id,
          name: decodeEntities(p.name),
          slug: p.slug,
          price: formatPrice(p.price),
          image: p.images[0]?.src || "https://placehold.co/800x1000/f5f5f5/999.png?text=Product",
          category: p.categories[0]?.name ? decodeEntities(p.categories[0].name) : "Apparel",
        }));
        setResults(mapped);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchProducts, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
        setSearch("");
      }
      if (e.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Keep desktop page from scrolling when modal is open.
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const displayResults = search.trim() ? results : latestProducts;

  return (
    <>
      {/* Search Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className="p-1.5 text-black hover:text-[#512da8] transition flex items-center justify-center"
        aria-label="Search products"
      >
        <Search className="h-5 w-5" />
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="search-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-[100]"
            >
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                onClick={closeModal}
              />

              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.99 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="fixed inset-0 z-[101] flex items-start justify-center px-4 pt-20"
                onClick={closeModal}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Search products"
                  className="w-full max-w-[700px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl text-black"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="border-b border-neutral-200 px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                        <input
                          ref={inputRef}
                          type="text"
                          placeholder="Search shirts, polos, drops..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-11 pr-4 text-base text-black placeholder-neutral-400 outline-none transition focus:border-black focus:bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
                        aria-label="Close search"
                      >
                        <X className="h-5 w-5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto p-4">
                    {loading ? (
                      <div className="py-8 text-center text-neutral-400 text-sm">
                        Loading products...
                      </div>
                    ) : displayResults.length === 0 ? (
                      <div className="py-10 text-center text-neutral-400 text-sm">
                        {search.trim() ? "No products found" : "No products available"}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {displayResults.map((product) => (
                          <Link
                            key={product.id}
                            href={`/products/${product.slug}`}
                            onClick={closeModal}
                            className="group flex gap-3 rounded-xl border border-transparent p-2.5 transition hover:bg-neutral-100"
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-12 w-12 rounded object-cover border border-neutral-200"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="line-clamp-1 text-sm font-semibold text-black group-hover:text-[#512da8]">
                                {product.name}
                              </h4>
                              <p className="text-xs text-neutral-500">
                                {product.category}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm text-black">
                                {product.price}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-xs text-neutral-500 bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <span>Enter to open</span>
                      <span>Esc to close</span>
                    </div>
                    {displayResults.length > 8 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100 hover:text-black"
                          onClick={() => resultsRef.current?.scrollBy({ top: -220, behavior: "smooth" })}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                          Up
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100 hover:text-black"
                          onClick={() => resultsRef.current?.scrollBy({ top: 220, behavior: "smooth" })}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          Down
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
