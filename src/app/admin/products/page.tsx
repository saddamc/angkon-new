"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";

/* ─── Types (raw from WooCommerce API, not the mapped WooProduct) ── */
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta_data?: { id?: number; key: string; value: any }[];
}

// Per-product delivery cost, sourced from _delivery_inside / _delivery_outside
// meta fields — the same fields the Edit Product form writes to and the same
// fields cart/checkout/orders actually charge. Defaults match the rest of the app.
function getDeliveryFees(product: WCProductRaw): { inside: number; outside: number } {
  const insideStr = product.meta_data?.slice().reverse().find((m) => m.key === "_delivery_inside")?.value;
  const outsideStr = product.meta_data?.slice().reverse().find((m) => m.key === "_delivery_outside")?.value;
  return {
    inside: insideStr ? parseInt(insideStr) : 50,
    outside: outsideStr ? parseInt(outsideStr) : 80,
  };
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AdminProductsPage() {
  const { authFetch } = useAuth();
  const [products, setProducts] = useState<WCProductRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const actionBtnRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const load = async () => {
    setLoading(true);
    try {
      // Use admin products API to get raw WC data (includes sku, total_sales, date_created, etc.)
      const res = await authFetch("/api/admin/products?per_page=100");
      if (res.ok) {
        const data = await res.json();
        const list = data.products ?? data;
        setProducts(Array.isArray(list) ? list : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    await authFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleting(null);
    setActionMenu(null);
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

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Package className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Products</h1>
            <p className="text-[12px] text-gray-400">
              Product List — {products.length} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-500 hover:text-purple-600 hover:border-purple-300 transition"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-purple-500 transition shadow-md shadow-purple-200"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Link>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100/60 p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
          />
        </div>
      </div>

      {/* ── Products Table ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100/60 overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="hidden xl:grid grid-cols-[50px_70px_1fr_120px_120px_80px_80px_90px_130px_140px_60px] gap-2 px-5 py-3 bg-purple-50/70 text-[10px] font-bold uppercase tracking-widest text-purple-500">
          <span>SL</span>
          <span>Image</span>
          <span>Product Name</span>
          <span>Product Code</span>
          <span>Selling Price</span>
          <span>Quantity</span>
          <span>Status</span>
          <span>Added On</span>
          <span>Shipping Cost</span>
          <span>Update</span>
          <span>Action</span>
        </div>

        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-purple-50/50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-purple-200 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">No products found.</p>
            <Link
              href="/admin/products/new"
              className="text-purple-600 hover:underline text-sm font-medium"
            >
              Add your first product →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-purple-50">
            {filteredProducts.map((product, idx) => (
              <div
                key={product.id}
                className="grid grid-cols-[auto_1fr_auto] xl:grid-cols-[50px_70px_1fr_120px_120px_80px_80px_90px_130px_140px_60px] items-center gap-2 px-5 py-3 hover:bg-purple-50/30 transition"
              >
                {/* SL */}
                <span className="text-[12px] text-purple-500 font-bold">
                  {idx + 1}
                </span>

                {/* Image */}
                <div className="h-14 w-14 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-purple-100">
                  {product.images[0]?.src ? (
                    <Image
                      src={product.images[0].src}
                      alt={product.images[0].alt || product.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Product Name */}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-700 truncate">
                    {product.name}
                  </p>
                  {product.categories[0] && (
                    <p className="text-[11px] text-purple-400 truncate">
                      {product.categories[0].name}
                    </p>
                  )}
                </div>

                {/* Product Code / SKU */}
                <div className="hidden xl:block">
                  <span className="text-[12px] text-gray-600 font-mono">
                    {product.sku || "—"}
                  </span>
                </div>

                {/* Selling Price */}
                <div className="hidden xl:block">
                  <span className="text-[13px] font-bold text-gray-700">
                    ৳{Number(product.price || 0).toLocaleString()}
                  </span>
                  {product.on_sale && product.regular_price && (
                    <span className="block text-[10px] text-gray-400 line-through">
                      ৳{Number(product.regular_price).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Quantity (stock) */}
                <div className="hidden xl:block">
                  <span className="text-[12px] text-gray-600">
                    {product.manage_stock
                      ? product.stock_quantity ?? "—"
                      : "∞"}
                  </span>
                </div>

                {/* Status */}
                <div className="hidden xl:block">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      product.status === "publish"
                        ? "bg-emerald-50 text-emerald-600"
                        : product.status === "draft"
                        ? "bg-gray-100 text-gray-500"
                        : "bg-amber-50 text-amber-600"
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
                <div className="hidden xl:block">
                  <span className="text-[11px] text-gray-500">
                    {new Date(product.date_created).toLocaleDateString(
                      "en-GB",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </span>
                </div>

                {/* Shipping Cost — per-product, from _delivery_inside / _delivery_outside meta */}
                <div className="hidden xl:block">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500 leading-tight">
                      Inside Dhaka - {getDeliveryFees(product).inside}TK
                    </p>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      Outside Dhaka - {getDeliveryFees(product).outside}TK
                    </p>
                  </div>
                </div>

                {/* Update — jump straight to the editable fields */}
                <div className="hidden xl:block">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="inline-flex items-center gap-1 text-[11px] text-purple-500 font-medium hover:text-purple-700 hover:underline"
                  >
                    <Pencil className="h-3 w-3" /> Update
                  </Link>
                </div>

                {/* Action */}
                <div>
                  <button
                    ref={(el) => {
                      if (el) actionBtnRefs.current.set(product.id, el);
                      else actionBtnRefs.current.delete(product.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (actionMenu === product.id) {
                        setActionMenu(null);
                        setMenuPos(null);
                      } else {
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                        setMenuPos({
                          top: rect.bottom + window.scrollY + 4,
                          right: window.innerWidth - rect.right,
                        });
                        setActionMenu(product.id);
                      }
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ── Action dropdown portal (fixed, never clipped) ─── */}
      {actionMenu !== null && menuPos && (() => {
        const product = filteredProducts.find((p) => p.id === actionMenu);
        if (!product) return null;
        return (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => { setActionMenu(null); setMenuPos(null); }}
            />
            <div
              className="fixed z-50 bg-white rounded-xl border border-purple-100 shadow-xl py-1 min-w-[148px]"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <Link
                href={`/admin/products/${product.id}`}
                onClick={() => { setActionMenu(null); setMenuPos(null); }}
                className="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
              <Link
                href={`/products/${product.slug}`}
                target="_blank"
                onClick={() => { setActionMenu(null); setMenuPos(null); }}
                className="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition"
              >
                <Eye className="h-3.5 w-3.5" /> View
              </Link>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(product.sku || String(product.id));
                  setActionMenu(null);
                  setMenuPos(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition"
              >
                <Copy className="h-3.5 w-3.5" /> Copy SKU
              </button>
              <hr className="my-1 border-purple-50" />
              <button
                onClick={() => {
                  setActionMenu(null);
                  setMenuPos(null);
                  void handleDelete(product.id, product.name);
                }}
                disabled={deleting === product.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 transition disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting === product.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}
