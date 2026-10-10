"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { getProducts } from "@/services/products.service";
import { formatPrice } from "@/utils/price";

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
          name: p.name,
          slug: p.slug,
          price: formatPrice(p.price),
          image: p.images[0]?.src || "https://placehold.co/800x1000/111/fff.png?text=Jersey",
          category: p.categories[0]?.name || "Uncategorized",
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
          name: p.name,
          slug: p.slug,
          price: formatPrice(p.price),
          image: p.images[0]?.src || "https://placehold.co/800x1000/111/fff.png?text=Jersey",
          category: p.categories[0]?.name || "Uncategorized",
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
      // Cmd+K or Ctrl+K to open
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
    if (!open) {
      return;
    }

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
    if (!open) {
      return;
    }

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
        className="relative inline-flex h-9 w-9 items-center justify-center gap-2 rounded-full border border-[#5c0f0d] bg-[#4a0705] text-[#E1B76F] transition hover:border-[#E1B76F] hover:text-white sm:h-10 sm:w-auto sm:px-3"
        aria-label="Search products"
      >
        <Search className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="hidden text-sm font-medium sm:inline">Search</span>
        <span className="sr-only">
          Search products (Ctrl+K)
        </span>
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
                className="absolute inset-0 bg-black/75 backdrop-blur-[4px]"
                onClick={closeModal}
              />

              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.99 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="fixed inset-0 z-[101] flex items-start justify-center px-4 pt-24"
                onClick={closeModal}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Search products"
                  className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-[#5c0f0d] bg-[#400604]/98 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-[10px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="border-b border-[#5c0f0d] px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#cbb18a]" />
                        <input
                          ref={inputRef}
                          type="text"
                          placeholder="Search shirts, polos, drops..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="h-12 w-full rounded-xl border border-[#5c0f0d] bg-[#2b0403] py-2 pl-10 pr-4 text-base text-[#E1B76F] placeholder-[#cbb18a]/60 outline-none transition focus:border-[#E1B76F] focus-visible:ring-2 focus-visible:ring-[#E1B76F]/30"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-[#cbb18a] transition hover:text-[#E1B76F]"
                        aria-label="Close search"
                      >
                        <X className="h-6 w-6 stroke-[2.6]" />
                      </button>
                    </div>
                  </div>

                  <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto p-4">
                    {loading ? (
                      <div className="py-8 text-center text-[#cbb18a]">
                        Loading...
                      </div>
                    ) : displayResults.length === 0 ? (
                      <div className="py-10 text-center text-[#cbb18a]">
                        {search.trim() ? "No products found" : "No products available"}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {displayResults.map((product) => (
                          <Link
                            key={product.id}
                            href={`/products/${product.slug}`}
                            onClick={closeModal}
                            className="group flex translate-y-0 gap-3 rounded-xl border border-transparent bg-[#2b0403] p-3 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#5c0f0d] hover:bg-[#4a0705] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1B76F]/40"
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-12 w-12 rounded object-cover border border-[#5c0f0d]"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="line-clamp-1 font-medium text-[#E1B76F] group-hover:text-white">
                                {product.name}
                              </h4>
                              <p className="text-xs text-[#cbb18a]">
                                {product.category}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[#E1B76F]">
                                {product.price}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-[#5c0f0d] px-4 py-3 text-xs text-[#cbb18a]">
                    <div className="flex items-center gap-3">
                      <span>Enter to open</span>
                      <span>Esc to close</span>
                    </div>
                    {displayResults.length > 8 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-[#5c0f0d] bg-[#2b0403] px-3 py-1.5 text-xs text-[#cbb18a] transition hover:bg-[#4a0705] hover:text-[#E1B76F]"
                          onClick={() => resultsRef.current?.scrollBy({ top: -220, behavior: "smooth" })}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                          Up
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-[#5c0f0d] bg-[#2b0403] px-3 py-1.5 text-xs text-[#cbb18a] transition hover:bg-[#4a0705] hover:text-[#E1B76F]"
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
