"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Package,
  MoreVertical,
  Eye,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  X,
  Loader2,
  CopyPlus,
} from "lucide-react";
import { getProductPageUrl } from "@/utils/product-url";

/* ─── Types ───────────────────────────────────────────────────────── */
interface WCProductRaw {
  id: number;
  name: string;
  slug: string;
  sku: string;
  status: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  total_sales: number;
  date_created: string;
  shipping_class: string;
  shipping_class_id: number;
  images: { id: number; src: string; alt: string }[];
  categories: { id: number; name: string; slug: string }[];
  buy_price?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta_data?: { id?: number; key: string; value: any }[];
}

function getBuyPrice(product: WCProductRaw): number {
  if (product.buy_price) {
    const parsed = parseFloat(product.buy_price);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const metaVal = product.meta_data?.slice().reverse().find((m) => m.key === "_buy_price")?.value;
  if (metaVal != null) {
    const parsed = parseFloat(String(metaVal));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function getDeliveryFees(product: WCProductRaw): { inside: number; outside: number } {
  const insideRaw = product.meta_data?.slice().reverse().find((m) => m.key === "_delivery_inside")?.value;
  const outsideRaw = product.meta_data?.slice().reverse().find((m) => m.key === "_delivery_outside")?.value;
  const insideStr = insideRaw != null ? String(insideRaw).trim() : "";
  const outsideStr = outsideRaw != null ? String(outsideRaw).trim() : "";
  const insideParsed = insideStr !== "" ? Number.parseInt(insideStr, 10) : NaN;
  const outsideParsed = outsideStr !== "" ? Number.parseInt(outsideStr, 10) : NaN;
  return {
    inside: Number.isFinite(insideParsed) ? insideParsed : 60,
    outside: Number.isFinite(outsideParsed) ? outsideParsed : 120,
  };
}

/* ─── Client Cache for Instant Tab Switching ──────────────────────── */
let cachedProductsList: WCProductRaw[] | null = null;

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AdminProductsPage() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [products, setProducts] = useState<WCProductRaw[]>(cachedProductsList || []);
  const [loading, setLoading] = useState(!cachedProductsList);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toast notifications & selection
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ ids: number[]; names: string[] } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => {
      setToast((curr) => (curr?.msg === msg ? null : curr));
    }, 3500);
  }, []);

  const load = async (soft = false) => {
    if (!cachedProductsList && !soft) setLoading(true);
    try {
      const res = await authFetch("/api/admin/products?per_page=150");
      if (res.ok) {
        const data = await res.json();
        const list = data.products ?? data;
        const validList = Array.isArray(list) ? list : [];
        cachedProductsList = validList;
        setProducts(validList);
        setSelectedIds((prev) => {
          const next = new Set<number>();
          validList.forEach((p: WCProductRaw) => {
            if (prev.has(p.id)) next.add(p.id);
          });
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(Boolean(cachedProductsList));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (actionMenu === null) return;
    const closeMenu = () => {
      setActionMenu(null);
      setMenuPos(null);
    };
    window.addEventListener("scroll", closeMenu, { passive: true });
    window.addEventListener("resize", closeMenu, { passive: true });
    return () => {
      window.removeEventListener("scroll", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, [actionMenu]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // fallback
    }
  };

  const toggleMenu = (id: number, buttonEl: HTMLButtonElement) => {
    if (actionMenu === id) {
      setActionMenu(null);
      setMenuPos(null);
      return;
    }

    const rect = buttonEl.getBoundingClientRect();
    const menuHeight = 220;

    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = showAbove ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const right = Math.max(16, window.innerWidth - rect.right);

    setMenuPos({ top, right });
    setActionMenu(id);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.categories?.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const inventorySummary = useMemo(() => {
    let totalStockQty = 0;
    let totalCostVal = 0;
    let itemsWithCost = 0;
    let inStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      const isManaged = Boolean(p.manage_stock);
      const qty = typeof p.stock_quantity === "number" ? p.stock_quantity : 0;
      if (p.stock_status === "outofstock" || (isManaged && qty <= 0)) {
        outOfStockCount++;
      } else {
        inStockCount++;
      }
      // Only count finite, tracked inventory with explicit buy price
      if (isManaged && qty > 0) {
        totalStockQty += qty;
        const cost = getBuyPrice(p);
        if (cost > 0) {
          totalCostVal += cost * qty;
          itemsWithCost++;
        }
      }
    });

    return {
      totalUnits: totalStockQty,
      costVal: totalCostVal,
      itemsWithCost,
      inStockCount,
      outOfStockCount,
    };
  }, [products]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.has(p.id));
  const someSelected =
    filteredProducts.some((p) => selectedIds.has(p.id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const openDeleteSingle = (id: number, name: string) => {
    setActionMenu(null);
    setMenuPos(null);
    setDeleteTarget({ ids: [id], names: [name] });
  };

  const handleDuplicate = async (product: WCProductRaw) => {
    setActionMenu(null);
    setMenuPos(null);
    setDuplicating(product.id);
    try {
      const res = await authFetch(`/api/admin/products/${product.id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) {
        showToast(data.error || data.message || "Failed to duplicate product.", false);
        return;
      }
      showToast(
        `Duplicated as draft: "${data.product?.name || `${product.name} (Copy)`}"`,
        true,
      );
      const nextSlug = data.product?.slug as string | undefined;
      if (nextSlug) {
        router.push(`/admin/products/${encodeURIComponent(nextSlug)}/edit`);
      } else if (data.id) {
        router.push(`/admin/products/${data.id}/edit`);
      }
    } catch {
      showToast("Failed to duplicate product. Check your network.", false);
    } finally {
      setDuplicating(null);
    }
  };

  const openBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const selected = products.filter((p) => selectedIds.has(p.id));
    setDeleteTarget({
      ids: selected.map((p) => p.id),
      names: selected.map((p) => p.name),
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.ids.length === 0) return;
    const { ids, names } = deleteTarget;
    setIsDeleting(true);

    try {
      if (ids.length === 1) {
        const id = ids[0];
        const res = await authFetch(`/api/admin/products/${id}`, { method: "DELETE" });
        if (res.ok) {
          setProducts((prev) => prev.filter((p) => p.id !== id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          showToast(`Product "${names[0]}" deleted successfully!`, true);
          setDeleteTarget(null);
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || err.message || "Failed to delete product.", false);
        }
      } else {
        const res = await authFetch("/api/admin/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          const deletedSet = new Set<number>(data.deletedIds ?? ids);
          setProducts((prev) => prev.filter((p) => !deletedSet.has(p.id)));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            deletedSet.forEach((delId) => next.delete(delId));
            return next;
          });
          showToast(
            `${data.deletedCount ?? ids.length} products deleted successfully!`,
            true
          );
          setDeleteTarget(null);
        } else {
          showToast(data.error || "Failed to delete selected products.", false);
        }
      }
    } catch {
      showToast("Failed to delete product(s). Please check your network connection.", false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#400604]/10 border border-[#E1B76F]/30 flex items-center justify-center">
            <Package className="h-5 w-5 text-[#400604]" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1A0302]">Products Catalog</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-600 hover:text-[#400604] hover:border-[#400604] transition"
            title="Refresh product list"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 rounded-xl bg-[#400604] hover:bg-[#250302] px-4 py-2.5 text-[13px] font-bold text-white transition shadow-sm"
          >
            <Plus className="h-4 w-4 text-[#E1B76F]" /> Add Product
          </Link>
        </div>
      </div>

      {/* ── Inventory & Valuation Summary Cards ────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-[#E1B76F]/25 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Products</p>
          <p className="text-xl font-serif font-bold text-[#1A0302] mt-1">{products.length}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">{inventorySummary.inStockCount} active in catalog</p>
        </div>
        <div className="rounded-2xl bg-white border border-amber-200 bg-amber-50/20 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Tracked Stock Units</p>
          <p className="text-xl font-serif font-bold text-[#1A0302] mt-1">{inventorySummary.totalUnits.toLocaleString()}</p>
          <p className="text-[11px] text-stone-500 mt-0.5">Physical items in inventory</p>
        </div>
        <div className="rounded-2xl bg-white border border-[#400604]/20 bg-[#400604]/5 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Stock Value (Buy Price)</p>
          <p className="text-xl font-serif font-bold text-[#400604] mt-1">
            {inventorySummary.costVal > 0 ? `৳${Math.round(inventorySummary.costVal).toLocaleString()}` : "—"}
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {inventorySummary.itemsWithCost > 0 ? `${inventorySummary.itemsWithCost} products with buy price` : "No buy price provided"}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Stock Availability</p>
          <p className="text-xl font-serif font-bold text-stone-900 mt-1">
            <span className="text-emerald-700">{inventorySummary.inStockCount}</span>
            <span className="text-stone-400 text-sm font-normal mx-1">in</span>
            <span className="text-stone-300">/</span>
            <span className="text-rose-600 ml-1">{inventorySummary.outOfStockCount}</span>
            <span className="text-stone-400 text-sm font-normal ml-1">out</span>
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">Catalog availability status</p>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20 transition"
          />
        </div>
      </div>

      {/* ── Selection / Bulk Actions Banner ─────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#400604] to-[#1A0302] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#E1B76F]/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#E1B76F]/20 border border-[#E1B76F]/40 flex items-center justify-center text-xs font-black text-[#E1B76F]">
              {selectedIds.size}
            </div>
            <div>
              <span className="text-[13px] font-bold">
                {selectedIds.size} {selectedIds.size === 1 ? "product" : "products"} selected
              </span>
              <span className="text-[#E1B76F] text-[12px] ml-2">
                (out of {filteredProducts.length})
              </span>
            </div>
            {selectedIds.size < filteredProducts.length && (
              <button
                type="button"
                onClick={() => setSelectedIds(new Set(filteredProducts.map((p) => p.id)))}
                className="text-[12px] font-semibold underline underline-offset-2 text-[#E1B76F] hover:text-white transition ml-1"
              >
                Select all {filteredProducts.length}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-semibold transition"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={openBulkDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[12px] font-bold transition shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* ── Products Table ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E1B76F]/25 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1150px]">
            {/* Table header */}
            <div className="grid grid-cols-[40px_45px_64px_1fr_120px_115px_80px_80px_90px_130px_95px_65px] items-center gap-3 px-5 py-3.5 bg-[#FDFBF7] text-[10px] font-bold uppercase tracking-widest text-[#400604] border-b border-stone-100">
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-stone-300 text-[#400604] focus:ring-[#400604] cursor-pointer transition"
                  title={allSelected ? "Deselect all" : "Select all"}
                />
              </div>
              <span>SL</span>
              <span>Image</span>
              <span>Product Name</span>
              <span>SKU</span>
              <span>Selling Price</span>
              <span>Quantity</span>
              <span>Status</span>
              <span>Added On</span>
              <span>Shipping</span>
              <span className="text-center">Update</span>
              <span className="text-center">Action</span>
            </div>

            {loading ? (
              <div className="divide-y divide-stone-100" role="status" aria-busy="true">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[40px_45px_64px_1fr_120px_115px_80px_80px_90px_130px_95px_65px] items-center gap-3 px-5 py-3.5 animate-pulse"
                  >
                    <div className="h-4 w-4 mx-auto rounded bg-stone-200" />
                    <div className="h-3 w-5 rounded bg-stone-200" />
                    <div className="h-14 w-14 rounded-xl bg-stone-200" />
                    <div className="h-4 w-3/4 rounded bg-stone-200" />
                    <div className="h-4 w-16 rounded bg-stone-200" />
                    <div className="h-4 w-16 rounded bg-stone-200" />
                    <div className="h-4 w-12 rounded bg-stone-200" />
                    <div className="h-4 w-12 rounded bg-stone-200" />
                    <div className="h-4 w-16 rounded bg-stone-200" />
                    <div className="h-4 w-16 rounded bg-stone-200" />
                    <div className="h-6 w-16 rounded bg-stone-200 mx-auto" />
                    <div className="h-6 w-6 rounded bg-stone-200 mx-auto" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-24 text-center">
                <Package className="h-12 w-12 mx-auto text-stone-300 mb-3" />
                <p className="text-[15px] font-bold text-stone-700">No products found</p>
                <p className="text-[12px] text-stone-400 mt-1">
                  Try adjusting your search criteria or add a new product.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredProducts.map((product, idx) => {
                  const isSelected = selectedIds.has(product.id);
                  const thumb = product.images?.[0]?.src;
                  const fees = getDeliveryFees(product);

                  return (
                    <div
                      key={product.id}
                      className={`grid grid-cols-[40px_45px_64px_1fr_120px_115px_80px_80px_90px_130px_95px_65px] items-center gap-3 px-5 py-3.5 hover:bg-stone-50/70 transition ${
                        isSelected ? "bg-[#400604]/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(product.id)}
                          className="h-4 w-4 rounded border-stone-300 text-[#400604] focus:ring-[#400604] cursor-pointer"
                        />
                      </div>

                      {/* SL */}
                      <span className="text-[11px] font-bold text-stone-400">
                        {idx + 1}
                      </span>

                      {/* Image */}
                      <div className="h-14 w-14 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200 relative">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt={product.name}
                            width={56}
                            height={56}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-stone-400 text-xs font-bold">
                            {product.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Name & Categories */}
                      <div className="min-w-0 pr-2">
                        <Link
                          href={`/admin/products/${encodeURIComponent(product.slug || String(product.id))}/edit`}
                          className="text-[13px] font-semibold text-stone-800 hover:text-[#400604] transition truncate block"
                          title={product.name}
                        >
                          {product.name}
                        </Link>
                        {product.categories && product.categories.length > 0 && (
                          <p className="text-[11px] text-stone-400 truncate mt-0.5">
                            {product.categories.map((c) => c.name).join(", ")}
                          </p>
                        )}
                      </div>

                      {/* SKU */}
                      <div>
                        <div className="inline-flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200/80">
                          <span className="text-[11px] text-stone-700 font-mono font-medium truncate max-w-[70px]" title={product.sku || undefined}>
                            {product.sku || "—"}
                          </span>
                          {product.sku && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(product.sku, `col-sku-${product.id}`)}
                              title="Copy SKU"
                              className="p-0.5 rounded text-stone-400 hover:text-[#400604] transition"
                            >
                              {copiedKey === `col-sku-${product.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div>
                        <span className="text-[13px] font-bold text-stone-900">
                          ৳{Number(product.price || 0).toLocaleString()}
                        </span>
                        {product.on_sale && product.regular_price && (
                          <span className="block text-[10px] text-stone-400 line-through">
                            ৳{Number(product.regular_price).toLocaleString()}
                          </span>
                        )}
                        {getBuyPrice(product) > 0 && (
                          <span className="block text-[10.5px] text-emerald-700 font-medium">
                            Cost: ৳{getBuyPrice(product).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Quantity */}
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-50 text-stone-600 border border-stone-200">
                          {product.manage_stock
                            ? product.stock_quantity ?? "0"
                            : "∞ In Stock"}
                        </span>
                      </div>

                      {/* Status */}
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            product.status === "publish"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : product.status === "draft"
                              ? "bg-stone-100 text-stone-600 border border-stone-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {product.status === "publish"
                            ? "Active"
                            : product.status === "draft"
                            ? "Draft"
                            : product.status}
                        </span>
                      </div>

                      {/* Added On */}
                      <div>
                        <span className="text-[11px] text-stone-500 whitespace-nowrap">
                          {product.date_created
                            ? new Date(product.date_created).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                      </div>

                      {/* Delivery */}
                      <div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] text-stone-600 leading-tight">
                            Inside: <span className="font-semibold text-[#400604]">{fees.inside} TK</span>
                          </p>
                          <p className="text-[11px] text-stone-600 leading-tight">
                            Outside: <span className="font-semibold text-[#400604]">{fees.outside} TK</span>
                          </p>
                        </div>
                      </div>

                      {/* Update Button */}
                      <div className="flex justify-center">
                        <Link
                          href={`/admin/products/${encodeURIComponent(product.slug || String(product.id))}/edit`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-[#400604] hover:bg-[#400604] hover:text-white text-[12px] font-semibold transition border border-stone-200 shadow-sm"
                          title="Edit Product"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Link>
                      </div>

                      {/* Action Menu Toggle */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={(e) => toggleMenu(product.id, e.currentTarget)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                          title="More options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Fixed Action Dropdown Menu ──────────────────── */}
      {actionMenu !== null && menuPos !== null && (() => {
        const product = products.find((p) => p.id === actionMenu);
        if (!product) return null;
        return (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setActionMenu(null);
                setMenuPos(null);
              }}
            />
            <div
              style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
              className="fixed z-50 w-52 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 text-[13px] animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 py-1.5 border-b border-stone-100">
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Product Options</p>
                <p className="text-[12px] font-semibold text-stone-800 truncate">{product.name}</p>
              </div>

              <div className="py-1 border-b border-stone-100">
                <Link
                  href={`/admin/products/${encodeURIComponent(product.slug || String(product.id))}/edit`}
                  onClick={() => {
                    setActionMenu(null);
                    setMenuPos(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-stone-700 hover:bg-stone-50 hover:text-[#400604] transition"
                >
                  <Pencil className="h-4 w-4 text-stone-400" />
                  <span>Edit Product</span>
                </Link>

                <button
                  type="button"
                  disabled={duplicating === product.id}
                  onClick={() => void handleDuplicate(product)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-stone-700 hover:bg-stone-50 hover:text-[#400604] transition text-left disabled:opacity-50"
                >
                  {duplicating === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#400604]" />
                  ) : (
                    <CopyPlus className="h-4 w-4 text-stone-400" />
                  )}
                  <span>{duplicating === product.id ? "Duplicating…" : "Duplicate as Draft"}</span>
                </button>

                <a
                  href={getProductPageUrl(product.slug || product.name, { fromName: !product.slug })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-stone-700 hover:bg-stone-50 hover:text-[#400604] transition"
                >
                  <Eye className="h-4 w-4 text-stone-400" />
                  <span>View on Store</span>
                  <ExternalLink className="h-3 w-3 text-stone-400 ml-auto" />
                </a>
              </div>

              <div className="py-1 border-b border-stone-100">
                {product.sku && (
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(product.sku, `sku-${product.id}`)}
                    className="w-full flex items-center justify-between px-4 py-2 text-stone-700 hover:bg-stone-50 transition text-left"
                  >
                    <span className="flex items-center gap-2.5">
                      <Copy className="h-4 w-4 text-stone-400" />
                      <span>Copy SKU</span>
                    </span>
                    {copiedKey === `sku-${product.id}` && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Copied!
                      </span>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const url = getProductPageUrl(product.slug || product.name, { fromName: !product.slug });
                    void copyToClipboard(url, `url-${product.id}`);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-stone-700 hover:bg-stone-50 transition text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <Copy className="h-4 w-4 text-stone-400" />
                    <span>Copy Link</span>
                  </span>
                  {copiedKey === `url-${product.id}` && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Copied!
                    </span>
                  )}
                </button>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => openDeleteSingle(product.id, product.name)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 transition text-left font-medium"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                  <span>Delete Product</span>
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Bulk / Single Delete Confirmation Modal ───────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center flex-shrink-0 text-rose-600 border border-rose-100">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  {deleteTarget.ids.length === 1
                    ? "Delete Product?"
                    : `Delete ${deleteTarget.ids.length} Products?`}
                </h3>
                <p className="text-[13px] text-stone-500 leading-relaxed">
                  {deleteTarget.ids.length === 1
                    ? `Are you sure you want to permanently delete "${deleteTarget.names[0]}"?`
                    : `Are you sure you want to permanently delete ${deleteTarget.ids.length} selected products?`}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3.5 flex items-start gap-3 text-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-[12px] leading-relaxed">
                <p className="font-bold text-amber-900">Database & Cloudinary Cleanup</p>
                <p className="text-amber-700 mt-0.5">
                  The product record and attached Cloudinary images will be permanently removed from MongoDB Atlas and CDN storage.
                </p>
              </div>
            </div>

            {deleteTarget.ids.length > 1 && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200 text-[12px] text-stone-700">
                {deleteTarget.names.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-[13px] font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void confirmDelete()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold transition shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>
                      {deleteTarget.ids.length === 1
                        ? "Delete Product"
                        : `Delete ${deleteTarget.ids.length} Products`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl text-[13px] font-bold text-white transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.ok
              ? "bg-emerald-600 shadow-emerald-500/20"
              : "bg-rose-600 shadow-rose-500/20"
          }`}
        >
          {toast.ok ? (
            <Check className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{toast.msg}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 p-1 rounded-lg hover:bg-white/20 transition text-white/80 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
