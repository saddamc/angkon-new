"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";
import type { WooProduct, WooCategory } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";
import { formatPrice } from "@/utils/price";
import { categoryEmoji, decodeHtmlCharCodes } from "@/utils/category-display";
import { decodeEntities } from "@/utils/html";

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryItem = WooCategory;

interface Filters {
  search: string;
  categories: string[];
  priceRange: [number, number];
  inStockOnly: boolean;
  sort: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "default", label: "Featured" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "name-asc", label: "Name: A → Z" },
  { value: "name-desc", label: "Name: Z → A" },
];

const PRICE_MAX = 10000;
const PRICE_STEP = 100;
const PAGE_SIZE = 12;
const CATEGORY_PREVIEW = 10;

// ─── Dual Range Slider ────────────────────────────────────────────────────────

function DualRangeSlider({
  min,
  max,
  value,
  step = PRICE_STEP,
  onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  step?: number;
  onChange: (v: [number, number]) => void;
}) {
  const [minVal, maxVal] = value;
  const minPercent = ((minVal - min) / (max - min)) * 100;
  const maxPercent = ((maxVal - min) / (max - min)) * 100;

  const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Number(e.target.value), maxVal - step);
    onChange([v, maxVal]);
  };

  const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(Number(e.target.value), minVal + step);
    onChange([minVal, v]);
  };

  return (
    <div className="relative pt-1 pb-2">
      {/* Track */}
      <div className="relative h-1.5 w-full rounded-full bg-neutral-200">
        <div
          className="absolute h-full rounded-full bg-[#ffd800]"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
      </div>

      {/* Visual thumb — min */}
      <div
        className="pointer-events-none absolute top-0 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-black bg-[#ffd800] shadow-sm"
        style={{ left: `${minPercent}%` }}
      />
      {/* Visual thumb — max */}
      <div
        className="pointer-events-none absolute top-0 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-black bg-[#ffd800] shadow-sm"
        style={{ left: `${maxPercent}%` }}
      />

      {/* Transparent range inputs for interaction */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={minVal}
        onChange={handleMin}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ zIndex: minVal > max - step * 5 ? 5 : 3 }}
        aria-label="Minimum price"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxVal}
        onChange={handleMax}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ zIndex: 4 }}
        aria-label="Maximum price"
      />
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function SidebarSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-neutral-200 py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-black transition hover:text-neutral-600"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
      </button>
      {open && <div className="mt-3.5">{children}</div>}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  categories,
  filters,
  onFiltersChange,
  onClear,
}: {
  categories: CategoryItem[];
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}) {
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.inStockOnly ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < PRICE_MAX;

  const [showAllCategories, setShowAllCategories] = useState(false);
  const usableCategories = useMemo(() => {
    const withProducts = categories.filter((c) => (c.count ?? 0) > 0);
    const topLevel = withProducts.filter((c) => !c.parent);
    return topLevel.length > 0 ? topLevel : withProducts;
  }, [categories]);
  const visibleCategories = showAllCategories
    ? usableCategories
    : usableCategories.slice(0, CATEGORY_PREVIEW);

  const toggleCategory = (slug: string) => {
    const next = filters.categories.includes(slug)
      ? filters.categories.filter((c) => c !== slug)
      : [...filters.categories, slug];
    onFiltersChange({ categories: next });
  };

  return (
    <aside className="flex flex-col">
      {/* Heading row */}
      <div className="mb-1 flex items-center justify-between pb-3 border-b border-neutral-200">
        <h2 className="text-xs font-bold uppercase tracking-wider text-black">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-semibold uppercase tracking-wider text-[#7a7a7a] underline underline-offset-2 transition hover:text-black"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Categories */}
      <SidebarSection title="Category">
        <div className="space-y-2.5">
          {visibleCategories.map((cat) => {
            const checked = filters.categories.includes(cat.slug);
            return (
              <label
                key={cat.slug}
                className="flex cursor-pointer items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded border transition ${
                      checked
                        ? "border-black bg-black text-white"
                        : "border-neutral-300 bg-white group-hover:border-black"
                    }`}
                    style={{ width: 18, height: 18 }}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {cat.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.image.src} alt={cat.name} className="h-5 w-5 object-contain" />
                    ) : null}
                    <span className="text-sm text-neutral-700 group-hover:text-black transition capitalize">
                      {cat.image
                        ? decodeEntities(cat.name)
                        : decodeHtmlCharCodes(cat.description)
                        ? `${decodeHtmlCharCodes(cat.description)} ${decodeEntities(cat.name)}`
                        : `${categoryEmoji()} ${decodeEntities(cat.name)}`}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-neutral-400">{cat.count}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCategory(cat.slug)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
        {usableCategories.length > CATEGORY_PREVIEW && (
          <button
            type="button"
            onClick={() => setShowAllCategories((v) => !v)}
            className="mt-4 text-[11px] font-bold uppercase tracking-wider text-black underline underline-offset-4 hover:text-neutral-600"
          >
            {showAllCategories ? "Show less" : `Show all (${usableCategories.length})`}
          </button>
        )}
      </SidebarSection>

      {/* Price Range */}
      <SidebarSection title="Price Range">
        <div className="px-1">
          <div className="mb-4 flex items-center justify-between text-sm font-semibold text-black">
            <span>{formatPrice(filters.priceRange[0])}</span>
            <span>{formatPrice(filters.priceRange[1])}{filters.priceRange[1] >= PRICE_MAX ? "+" : ""}</span>
          </div>
          <DualRangeSlider
            min={0}
            max={PRICE_MAX}
            value={filters.priceRange}
            onChange={(v) => onFiltersChange({ priceRange: v })}
          />
          <div className="mt-3 flex gap-2">
            <div className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Min</p>
              <input
                type="number"
                min={0}
                max={filters.priceRange[1] - PRICE_STEP}
                step={PRICE_STEP}
                value={filters.priceRange[0]}
                onChange={(e) =>
                  onFiltersChange({ priceRange: [Math.max(0, Number(e.target.value)), filters.priceRange[1]] })
                }
                className="w-full bg-transparent text-sm font-semibold text-black outline-none"
              />
            </div>
            <div className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Max</p>
              <input
                type="number"
                min={filters.priceRange[0] + PRICE_STEP}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={filters.priceRange[1]}
                onChange={(e) =>
                  onFiltersChange({ priceRange: [filters.priceRange[0], Math.min(PRICE_MAX, Number(e.target.value))] })
                }
                className="w-full bg-transparent text-sm font-semibold text-black outline-none"
              />
            </div>
          </div>
        </div>
      </SidebarSection>

      {/* Availability */}
      <SidebarSection title="Availability" defaultOpen={false}>
        <label className="flex cursor-pointer items-center gap-3">
          <div
            className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
              filters.inStockOnly ? "bg-black" : "bg-neutral-200"
            }`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full shadow transition-transform ${
                filters.inStockOnly ? "translate-x-4 bg-[#ffd800]" : "translate-x-0.5 bg-white"
              }`}
            />
          </div>
          <span className="text-sm text-neutral-700">In stock only</span>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={() => onFiltersChange({ inStockOnly: !filters.inStockOnly })}
            className="sr-only"
          />
        </label>
      </SidebarSection>
    </aside>
  );
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
  categories,
  filters,
  onFiltersChange,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 max-h-[85dvh] lg:hidden overflow-y-auto rounded-t-3xl border-t border-neutral-200 bg-white px-5 pb-8 pt-4 shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-neutral-300" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black">Filters</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-neutral-500 transition hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <Sidebar
          categories={categories}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onClear={onClear}
        />
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-[#ffd800] py-3.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
        >
          Show Results
        </button>
      </div>
    </>
  );
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

export function ProductsShell({
  products,
  categories,
}: {
  products: WooProduct[];
  categories: WooCategory[];
}) {
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>({
    search: searchParams.get("q") || "",
    categories: searchParams.get("category") ? [searchParams.get("category")!] : [],
    priceRange: [0, PRICE_MAX],
    inStockOnly: false,
    sort: "default",
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const patchFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      categories: [],
      priceRange: [0, PRICE_MAX],
      inStockOnly: false,
    }));
  }, []);

  const filtered = useMemo(() => {
    let result = [...products];

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.short_description.toLowerCase().includes(q),
      );
    }

    if (filters.categories.length > 0) {
      result = result.filter((p) => p.categories.some((c) => filters.categories.includes(c.slug)));
    }

    result = result.filter((p) => {
      const price = Number(p.price || 0);
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    if (filters.inStockOnly) {
      result = result.filter((p) => p.stock_status === "instock");
    }

    switch (filters.sort) {
      case "price-asc":
        result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case "price-desc":
        result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return result;
  }, [products, filters]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginatedProducts = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const activeChips: { label: string; onRemove: () => void }[] = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];

    filters.categories.forEach((slug) => {
      const cat = categories.find((c) => c.slug === slug);
      chips.push({
        label: cat?.name ?? slug,
        onRemove: () => patchFilters({ categories: filters.categories.filter((c) => c !== slug) }),
      });
    });

    if (filters.priceRange[0] > 0 || filters.priceRange[1] < PRICE_MAX) {
      chips.push({
        label: `${formatPrice(filters.priceRange[0])} – ${formatPrice(filters.priceRange[1])}`,
        onRemove: () => patchFilters({ priceRange: [0, PRICE_MAX] }),
      });
    }

    if (filters.inStockOnly) {
      chips.push({ label: "In Stock", onRemove: () => patchFilters({ inStockOnly: false }) });
    }

    return chips;
  }, [filters, categories, patchFilters]);

  return (
    <>
      {/* Mobile drawer */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        categories={categories}
        filters={filters}
        onFiltersChange={patchFilters}
        onClear={clearFilters}
      />

      <div className="flex gap-8 lg:gap-10">
        {/* ── Sidebar (desktop) ── */}
        <div className="hidden w-[260px] flex-shrink-0 lg:block">
          <div className="sticky top-24">
            <Sidebar
              categories={categories}
              filters={filters}
              onFiltersChange={patchFilters}
              onClear={clearFilters}
            />
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => patchFilters({ search: e.target.value })}
                placeholder="Search products…"
                className="h-10 w-full rounded-full border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm text-black shadow-none outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Result count */}
              <span className="hidden text-sm text-neutral-500 sm:block">
                Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} 
              </span>

              {/* Sort */}
              <select
                value={filters.sort}
                onChange={(e) => patchFilters({ sort: e.target.value })}
                className="h-10 rounded-full border border-neutral-200 bg-white px-4 pr-8 text-sm text-black shadow-none outline-none transition focus:border-black appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white text-black">
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Mobile filter button */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold text-black shadow-sm transition hover:bg-neutral-100 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeChips.length > 0 && (
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white"
                    style={{ width: 18, height: 18 }}>
                    {activeChips.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile result count */}
          <p className="mb-3 text-sm text-neutral-500 sm:hidden">
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} 
          </p>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[12px] font-semibold text-black shadow-none"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="rounded-full transition hover:text-red-500"
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    <X className="h-3 w-3 text-neutral-400" />
                  </button>
                </span>
              ))}
              {activeChips.length > 1 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full px-3 py-1 text-[12px] font-semibold text-neutral-500 underline underline-offset-2 transition hover:text-black"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Product grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 py-20 text-center">
              <div className="mb-4 text-5xl">🔍</div>
              <p className="font-heading text-lg font-bold uppercase text-black">No products match your filters</p>
              <p className="mt-1.5 text-sm text-neutral-500">Try adjusting or clearing your filters</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-full bg-[#ffd800] px-6 py-2.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-5 gap-y-8 sm:gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
                {paginatedProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} eager={index < 4} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-black shadow-sm transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="min-w-[80px] text-center text-sm font-semibold text-black">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-black shadow-sm transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
