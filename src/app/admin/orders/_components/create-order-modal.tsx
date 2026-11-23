"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { CreateOrderPayload } from "../_types/orders.types";

interface CreateOrderModalProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (payload: CreateOrderPayload) => Promise<{ orderNumber: string } | null>;
}

interface CatalogProduct {
  id: number;
  name: string;
  slug?: string;
  sku?: string;
  price?: string | number;
  sale_price?: string | number;
  regular_price?: string | number;
  images?: { src?: string }[];
  stock_quantity?: number | null;
  manage_stock?: boolean;
  stock_status?: string;
  sizes?: string[];
}

interface DraftLine {
  productId: number;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
  stockQuantity?: number | null;
  manageStock?: boolean;
  availableSizes?: string[];
}

const CITIES = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Cumilla",
  "Narayanganj",
  "Gazipur",
  "Savar",
];

function productPrice(p: CatalogProduct): number {
  const raw = String(p.price || p.sale_price || p.regular_price || "0").trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatBdt(n: number): string {
  return `৳${Math.round(n).toLocaleString("en-BD")}`;
}

export function CreateOrderModal({ open, busy, onClose, onCreate }: CreateOrderModalProps) {
  const { authFetch } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [district, setDistrict] = useState("");
  const [notes, setNotes] = useState("");

  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [productQuery, setProductQuery] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"cod" | "manual_paid">("cod");
  const [shippingOverride, setShippingOverride] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setFullName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setCity("Dhaka");
    setDistrict("");
    setNotes("");
    setLines([]);
    setProductQuery("");
    setPaymentMethod("cod");
    setShippingOverride("");
    setDiscountInput("");
    setError(null);
  }, []);

  const loadCatalog = useCallback(async (query = "") => {
    setCatalogLoading(true);
    try {
      const q = query.trim();
      const endpoint = q
        ? `/api/admin/products?search=${encodeURIComponent(q)}&per_page=50`
        : `/api/admin/products?per_page=50`;

      const res = await authFetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : [];
        if (items.length > 0) {
          setCatalog(items);
          return;
        }
      }

      // Public endpoint fallback (returns array directly or { products: [...] })
      const pubRes = await fetch(
        q ? `/api/products?search=${encodeURIComponent(q)}&per_page=50` : `/api/products?per_page=50`
      );
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        const pubItems = Array.isArray(pubData?.products)
          ? pubData.products
          : Array.isArray(pubData)
          ? pubData
          : [];
        if (pubItems.length > 0) {
          setCatalog(pubItems);
        }
      }
    } catch (err) {
      console.warn("[CreateOrderModal] Could not fetch products catalog:", err);
    } finally {
      setCatalogLoading(false);
    }
  }, [authFetch]);

  // Load catalog as soon as the modal opens
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      reset();
      void loadCatalog();
      setTimeout(() => searchRef.current?.focus(), 80);
    }
    wasOpen.current = open;
  }, [open, reset, loadCatalog]);

  // Debounced search for server queries
  useEffect(() => {
    if (!open) return;
    const q = productQuery.trim();
    if (!q) return;

    const timer = setTimeout(() => {
      void loadCatalog(q);
    }, 300);

    return () => clearTimeout(timer);
  }, [productQuery, open, loadCatalog]);

  // Filter catalog locally in real time for immediate feedback
  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const slug = (p.slug || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      return name.includes(q) || slug.includes(q) || sku.includes(q);
    });
  }, [catalog, productQuery]);

  const addProduct = (p: CatalogProduct, chosenSize?: string) => {
    const price = productPrice(p);
    if (price <= 0) {
      setError(`"${p.name}" has no valid price and cannot be added.`);
      return;
    }
    const defaultSize = chosenSize || p.sizes?.[0] || "";
    setLines((prev) => {
      const existing = prev.find(
        (l) => l.productId === p.id && (!chosenSize || l.size === chosenSize)
      );
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id && (!chosenSize || l.size === chosenSize)
            ? { ...l, quantity: Math.min(99, l.quantity + 1) }
            : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          slug: p.slug || "",
          name: p.name,
          price,
          quantity: 1,
          size: defaultSize,
          image: p.images?.[0]?.src || "",
          stockQuantity: p.stock_quantity,
          manageStock: p.manage_stock,
          availableSizes: p.sizes || [],
        },
      ];
    });
    setError(null);
  };

  const updateQty = (productId: number, delta: number, size?: string) => {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId || (size !== undefined && l.size !== size)) return l;
          const next = l.quantity + delta;
          return next > 0 ? { ...l, quantity: Math.min(99, next) } : null;
        })
        .filter((l): l is DraftLine => l !== null)
    );
  };

  const updateSize = (productId: number, newSize: string, oldSize?: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId && (oldSize === undefined || l.size === oldSize)
          ? { ...l, size: newSize }
          : l
      )
    );
  };

  const removeLine = (productId: number, size?: string) => {
    setLines((prev) =>
      prev.filter((l) => !(l.productId === productId && (size === undefined || l.size === size)))
    );
  };

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [lines]
  );

  const discount = useMemo(() => {
    const n = Number(discountInput || 0);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(subtotal, Math.round(n));
  }, [discountInput, subtotal]);

  // Default delivery fee: Dhaka = ৳80, Outside Dhaka = ৳150
  const autoShippingFee = useMemo(() => {
    return city.trim().toLowerCase() === "dhaka" ? 80 : 150;
  }, [city]);

  const effectiveShippingFee = useMemo(() => {
    if (shippingOverride.trim() !== "") {
      const n = Number(shippingOverride);
      return Number.isFinite(n) ? Math.max(0, Math.min(5000, Math.round(n))) : 0;
    }
    return autoShippingFee;
  }, [shippingOverride, autoShippingFee]);

  const estimatedTotal = Math.max(0, subtotal - discount + effectiveShippingFee);

  const handleSubmit = async () => {
    setError(null);
    if (!fullName.trim()) return setError("Customer name is required.");
    if (!/^[0-9+\-\s()]{6,20}$/.test(phone.trim()))
      return setError("Enter a valid customer phone number (e.g. 01XXXXXXXXX).");
    if (!address.trim()) return setError("Delivery address is required.");
    if (!city.trim()) return setError("City is required.");
    if (lines.length === 0) return setError("Add at least one product to the order.");

    const payload: CreateOrderPayload = {
      customer: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        district: (district.trim() || city.trim()).trim(),
      },
      items: lines.map((l) => ({
        productId: l.productId,
        slug: l.slug || undefined,
        quantity: l.quantity,
        size: l.size.trim() || undefined,
      })),
      paymentMethod,
      shippingFee: effectiveShippingFee,
      ...(discount > 0 ? { discount } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    await onCreate(payload);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Create order"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-[980px] flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-gradient-to-r from-purple-50 via-white to-white px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm shadow-purple-200">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-bold tracking-tight text-gray-900">Create Order</h2>
                <span className="rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                  Manual / Phone Order
                </span>
              </div>
              <p className="text-[11.5px] text-gray-500">
                Pick products from the catalog, specify sizes & quantities, and confirm customer delivery.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-stone-100 hover:text-gray-700 cursor-pointer"
            aria-label="Close create order dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_370px]">
            {/* Left Column: Customer details + Selected Items + Product Catalog */}
            <div className="space-y-4">
              {/* Customer Information */}
              <section className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-purple-600" />
                  <h3 className="text-[12px] font-bold uppercase tracking-wide text-gray-700">
                    Customer Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-semibold text-gray-500">
                      Full Name <span className="text-rose-500">*</span>
                    </span>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Nusrat Jahan"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-semibold text-gray-500">
                      Phone Number <span className="text-rose-500">*</span>
                    </span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      inputMode="tel"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-[10.5px] font-semibold text-gray-500">
                      Delivery Address <span className="text-rose-500">*</span>
                    </span>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House number, road, area..."
                      className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-semibold text-gray-500">
                      City <span className="text-rose-500">*</span>
                    </span>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      list="create-order-cities"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                    <datalist id="create-order-cities">
                      {CITIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-semibold text-gray-500">
                      District / Area
                    </span>
                    <input
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Defaults to city"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-[10.5px] font-semibold text-gray-500">
                      Email Address (optional)
                    </span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@email.com"
                      type="email"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                </div>
              </section>

              {/* Selected Order Items */}
              <section className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-3.5 w-3.5 text-purple-600" />
                    <h3 className="text-[12px] font-bold uppercase tracking-wide text-gray-700">
                      Selected Order Items
                    </h3>
                  </div>
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                    {lines.reduce((s, l) => s + l.quantity, 0)} item
                    {lines.reduce((s, l) => s + l.quantity, 0) === 1 ? "" : "s"}
                  </span>
                </div>

                {lines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 py-5 text-center">
                    <Package className="h-6 w-6 text-stone-300" />
                    <p className="mt-1 text-[12px] font-semibold text-stone-600">
                      No products added to this order yet
                    </p>
                    <p className="text-[10.5px] text-stone-400">
                      Click <strong>+ Add</strong> on any product from the catalog below to add it.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {lines.map((l) => (
                      <li
                        key={`${l.productId}-${l.size}`}
                        className="flex items-center gap-2.5 rounded-xl border border-stone-200/90 bg-white p-2.5 shadow-2xs"
                      >
                        {l.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={l.image}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-lg object-cover border border-stone-100"
                          />
                        ) : (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                            <Package className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold text-gray-900">{l.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-purple-700">
                              {formatBdt(l.price)}
                            </span>
                            {/* Size selector */}
                            {l.availableSizes && l.availableSizes.length > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-medium text-gray-400">Size:</span>
                                <select
                                  value={l.size}
                                  onChange={(e) => updateSize(l.productId, e.target.value, l.size)}
                                  className="rounded-md border border-gray-200 bg-stone-50 px-1.5 py-0.5 text-[10.5px] font-bold text-gray-700 focus:border-purple-400 focus:outline-none"
                                >
                                  {l.availableSizes.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <input
                                value={l.size}
                                onChange={(e) => updateSize(l.productId, e.target.value, l.size)}
                                placeholder="Size (optional)"
                                className="w-20 rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] focus:border-purple-400 focus:outline-none"
                              />
                            )}
                          </div>
                        </div>
                        {/* Quantity and Line Total */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50/50 p-0.5">
                            <button
                              type="button"
                              onClick={() => updateQty(l.productId, -1, l.size)}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-stone-600 hover:bg-white hover:shadow-2xs cursor-pointer"
                              aria-label={`Decrease ${l.name}`}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-[12px] font-bold tabular-nums text-gray-900">
                              {l.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(l.productId, 1, l.size)}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-stone-600 hover:bg-white hover:shadow-2xs cursor-pointer"
                              aria-label={`Increase ${l.name}`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="min-w-[65px] text-right text-[12px] font-bold tabular-nums text-gray-900">
                            {formatBdt(l.price * l.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeLine(l.productId, l.size)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Product Catalog Browser (Always visible, instantly searchable) */}
              <section className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-purple-600" />
                    <h3 className="text-[12px] font-bold uppercase tracking-wide text-gray-700">
                      Product Catalog
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-semibold text-gray-400">
                      {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void loadCatalog(productQuery)}
                      disabled={catalogLoading}
                      className="text-stone-400 hover:text-purple-600 cursor-pointer"
                      title="Refresh product list"
                    >
                      <RefreshCw className={`h-3 w-3 ${catalogLoading ? "animate-spin text-purple-600" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchRef}
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Search catalog by product name or SKU…"
                    className="w-full rounded-xl border border-gray-200 pl-9 pr-8 py-2 text-[12.5px] focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    aria-label="Search products"
                  />
                  {productQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setProductQuery("");
                        void loadCatalog("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : catalogLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-purple-500" />
                  ) : null}
                </div>

                {/* Catalog Product List */}
                <div className="max-h-60 overflow-y-auto divide-y divide-stone-100 rounded-xl border border-stone-200/90 bg-stone-50/20">
                  {catalogLoading && catalog.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-stone-400">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                      <span className="text-[12px] font-medium">Loading store catalog…</span>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-stone-400">
                      <Package className="h-6 w-6 text-stone-300" />
                      <p className="mt-1 text-[12px] font-medium text-stone-500">
                        No products match &ldquo;{productQuery}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setProductQuery("");
                          void loadCatalog("");
                        }}
                        className="mt-1.5 text-[11px] font-bold text-purple-600 hover:underline cursor-pointer"
                      >
                        Show all products
                      </button>
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const price = productPrice(p);
                      const inCart = lines.find((l) => l.productId === p.id);
                      const isOutOfStock =
                        p.stock_status === "outofstock" ||
                        (p.manage_stock && typeof p.stock_quantity === "number" && p.stock_quantity <= 0);

                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 transition hover:bg-purple-50/40"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {p.images?.[0]?.src ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.images[0].src}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-lg object-cover border border-stone-100"
                              />
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                                <Package className="h-4 w-4" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-bold text-gray-800">
                                {p.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                                <span className="font-bold text-purple-700">
                                  {price > 0 ? formatBdt(price) : "No price"}
                                </span>
                                {isOutOfStock ? (
                                  <span className="font-bold text-rose-600">Out of stock</span>
                                ) : typeof p.stock_quantity === "number" ? (
                                  <span className="text-gray-400">
                                    Stock: <strong className="text-gray-600">{p.stock_quantity}</strong>
                                  </span>
                                ) : null}
                                {p.sizes && p.sizes.length > 0 && (
                                  <span className="text-gray-400">
                                    Sizes: {p.sizes.join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Add Button */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {inCart && (
                              <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700">
                                In Order ({inCart.quantity})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => addProduct(p)}
                              className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-purple-700 transition cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Payment + Financial Summary */}
            <div className="space-y-4">
              {/* Payment Method & Delivery Charges */}
              <section className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 text-purple-600" />
                  <h3 className="text-[12px] font-bold uppercase tracking-wide text-gray-700">
                    Payment & Delivery
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                      paymentMethod === "cod"
                        ? "border-purple-500 bg-purple-50 ring-1 ring-purple-200"
                        : "border-stone-200 hover:border-purple-300"
                    }`}
                  >
                    <span className="block text-[11.5px] font-bold text-gray-800">
                      Cash on Delivery
                    </span>
                    <span className="block text-[10px] text-gray-500">Collect full amount</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("manual_paid")}
                    className={`rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                      paymentMethod === "manual_paid"
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200"
                        : "border-stone-200 hover:border-emerald-300"
                    }`}
                  >
                    <span className="block text-[11.5px] font-bold text-gray-800">
                      Paid Already
                    </span>
                    <span className="block text-[10px] text-gray-500">Record advance paid</span>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-semibold text-gray-500">
                      Delivery Charge (৳)
                    </span>
                    <input
                      value={shippingOverride}
                      onChange={(e) => setShippingOverride(e.target.value)}
                      placeholder={`Auto (${formatBdt(autoShippingFee)})`}
                      inputMode="numeric"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] font-semibold text-gray-500">Discount (৳)</span>
                    <input
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="0"
                      inputMode="numeric"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-[12.5px] focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                </div>

                <label className="mt-3 flex flex-col gap-1">
                  <span className="text-[10.5px] font-semibold text-gray-500">
                    Order Note (optional)
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Delivery instructions, caller notes, preferred delivery time…"
                    className="resize-none rounded-xl border border-gray-200 px-3 py-2 text-[12px] focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                  />
                </label>
              </section>

              {/* Order Financials Summary */}
              <section className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-purple-100 pb-2">
                  <CalendarDays className="h-3.5 w-3.5 text-purple-600" />
                  <h3 className="text-[12px] font-bold uppercase tracking-wide text-gray-700">
                    Order Financials
                  </h3>
                </div>
                <dl className="mt-3 space-y-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Items Subtotal</dt>
                    <dd className="font-semibold tabular-nums text-gray-800">
                      {formatBdt(subtotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1 text-gray-500">
                      <Truck className="h-3 w-3 text-purple-600" /> Delivery Fee
                    </dt>
                    <dd className="font-semibold tabular-nums text-gray-800">
                      {formatBdt(effectiveShippingFee)}
                      {shippingOverride.trim() === "" && (
                        <span className="ml-1 text-[9.5px] font-normal text-gray-400">
                          ({city.trim().toLowerCase() === "dhaka" ? "Inside Dhaka" : "Outside Dhaka"})
                        </span>
                      )}
                    </dd>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-500">Discount</dt>
                      <dd className="font-semibold tabular-nums text-emerald-700">
                        −{formatBdt(discount)}
                      </dd>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between border-t border-purple-200 pt-2.5">
                    <dt className="text-[13px] font-bold text-gray-900">Total Collectible</dt>
                    <dd className="text-[17px] font-extrabold tabular-nums text-purple-800">
                      {formatBdt(estimatedTotal)}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Error Banner */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] font-semibold text-rose-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-stone-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-stone-50 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || lines.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-[12px] font-bold text-white shadow-sm shadow-purple-200 transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating Order…
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Create Order ({formatBdt(estimatedTotal)})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
