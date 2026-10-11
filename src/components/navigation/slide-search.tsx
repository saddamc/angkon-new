"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";
import { getProducts } from "@/services/products.service";
import { formatPrice } from "@/utils/price";
import { decodeEntities } from "@/utils/html";

interface SearchProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  category: string;
}

export function SlideSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset / debounced search request
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch search results on query change
  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset / debounced search request
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const products = await getProducts({ search: query.trim(), perPage: 6 });
        setResults(
          products.map((p) => ({
            id: p.id,
            name: decodeEntities(p.name),
            slug: p.slug,
            price: Number(p.sale_price || p.price || 0),
            image: p.images[0]?.src || "https://placehold.co/800x800/f5f5f5/999.png?text=Product",
            category: p.categories[0]?.name ? decodeEntities(p.categories[0].name) : "Apparel",
          }))
        );
      } catch (err) {
        console.error("Failed to search products:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="p-1 text-white hover:text-[#f3cb87] transition flex items-center justify-center"
          aria-label="Open search"
          title="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      ) : (
        <div className="relative flex items-center animate-in fade-in slide-in-from-right-3 duration-200">
          <form
            onSubmit={handleSubmit}
            className="flex items-center border border-[#E1B76F]/40 bg-[#340402] px-2.5 py-1 rounded-[4px] transition-all shadow-sm focus-within:border-[#E1B76F]"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-40 sm:w-56 text-[13px] text-white placeholder:text-[#E1B76F]/50 bg-transparent outline-none pr-1.5 font-normal"
            />
            <button
              type="submit"
              className="p-0.5 text-white hover:text-[#f3cb87] transition flex items-center justify-center"
              aria-label="Submit search"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 text-white/60 hover:text-[#E1B76F] transition ml-1"
              aria-label="Close search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Instant Dropdown Results (Professional & Seamless) */}
          {query.trim().length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-[300px] sm:w-[350px] bg-[#340402] border border-[#E1B76F]/30 shadow-2xl rounded-lg p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {loading && results.length === 0 ? (
                <div className="py-6 text-center text-xs text-white/70 flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  Searching products...
                </div>
              ) : results.length === 0 ? (
                <div className="py-6 text-center text-xs text-white/80">
                  No products found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/60 px-2 py-1">
                    Matching Products
                  </div>
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-[#400604] transition group"
                    >
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-[#2b0403] border border-[#E1B76F]/20">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-1 text-xs font-semibold text-white group-hover:text-[#f3cb87] transition">
                          {product.name}
                        </h4>
                        <p className="text-[10px] text-white/70">
                          {product.category}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-white flex-shrink-0">
                        {formatPrice(product.price)}
                      </span>
                    </Link>
                  ))}
                  <div className="pt-2 mt-1 border-t border-[#E1B76F]/20">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="w-full text-center py-1.5 text-xs font-bold text-[#E1B76F] hover:text-[#f3cb87] hover:underline"
                    >
                      View all results for &ldquo;{query}&rdquo; &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
