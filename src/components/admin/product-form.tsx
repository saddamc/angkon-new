"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Upload,
  X,
  Plus,
  FolderPlus,
  Check,
  Loader2,
  Save,
  ImageIcon,
  DollarSign,
  Tag,
  FileText,
  Ruler,
  Package,
  Trash,
} from "lucide-react";
import type { WooCategory } from "@/types/product";

interface ImageItem {
  src: string;
  alt: string;
  wpId?: number;
  public_id?: string;
}
interface ProductFormData {
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  regularPrice: string;
  salePrice: string;
  stockStatus: string;
  stockQuantity: string;
  manageStock: boolean;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  sizes: string[];
  images: ImageItem[];
  deliveryInside?: string;
  deliveryInsideId?: number;
  deliveryOutside?: string;
  deliveryOutsideId?: number;
}

interface Props {
  initialData?: Partial<ProductFormData & { id: number }>;
  onSuccess: () => void;
}

const STOCK_OPTIONS = [
  { value: "instock", label: "In Stock" },
  { value: "outofstock", label: "Out of Stock" },
  { value: "onbackorder", label: "On Backorder" },
];

const CLOTHING_SIZES = ["S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["38", "39", "40", "41", "42", "43", "44"];

export function ProductForm({ initialData, onSuccess }: Props) {
  const { authFetch } = useAuth();
  const [name, setName] = useState(initialData?.name || "");
  const [sku, setSku] = useState(initialData?.sku || "");
  const [shortDescription, setShortDescription] = useState(
    initialData?.shortDescription || ""
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [regularPrice, setRegularPrice] = useState(
    initialData?.regularPrice || ""
  );
  const [salePrice, setSalePrice] = useState(initialData?.salePrice || "");
  const [stockStatus, setStockStatus] = useState(
    initialData?.stockStatus || "instock"
  );
  const [stockQuantity, setStockQuantity] = useState(
    initialData?.stockQuantity || ""
  );
  const [manageStock, setManageStock] = useState(
    initialData?.manageStock || false
  );
  const [categoryId, setCategoryId] = useState<number>(
    initialData?.categoryId || 0
  );
  const [categoryName, setCategoryName] = useState(
    initialData?.categoryName || ""
  );
  const [categorySlug, setCategorySlug] = useState(
    initialData?.categorySlug || ""
  );
  const [sizes, setSizes] = useState<string[]>(initialData?.sizes || []);
  const [images, setImages] = useState<ImageItem[]>(
    initialData?.images || []
  );
  const [deliveryInside, setDeliveryInside] = useState(
    initialData?.deliveryInside || "60"
  );
  const [deliveryOutside, setDeliveryOutside] = useState(
    initialData?.deliveryOutside || "120"
  );
  const [availableCategories, setAvailableCategories] = useState<
    WooCategory[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchCategories = async (): Promise<WooCategory[] | null> => {
    const res = await authFetch("/api/admin/categories");
    if (!res.ok) return null;
    const data = await res.json().catch(() => []);
    if (!Array.isArray(data)) return null;
    return data.sort((a: WooCategory, b: WooCategory) =>
      a.name.localeCompare(b.name)
    );
  };

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      const sorted = await fetchCategories();
      if (!cancelled && sorted) setAvailableCategories(sorted);
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch]);

  const formattedCategories = (() => {
    const parentMap = new Map<number, WooCategory[]>();
    availableCategories.forEach((c) => {
      const p = c.parent || 0;
      if (!parentMap.has(p)) parentMap.set(p, []);
      parentMap.get(p)!.push(c);
    });

    const result: { id: number; name: string; slug: string; level: number }[] = [];
    const traverse = (parentId: number, level: number) => {
      const children = parentMap.get(parentId) || [];
      children.sort((a, b) => a.name.localeCompare(b.name));
      children.forEach((c) => {
        result.push({ id: c.id, name: c.name, slug: c.slug, level });
        traverse(c.id, level + 1);
      });
    };
    traverse(0, 0);
    return result;
  })();

  const toggleSize = (s: string) =>
    setSizes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const handleImageUpload = async (files: FileList) => {
    setUploading(true);
    setError("");
    const newImgs: ImageItem[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("image", file);
      if (categoryName || categorySlug) {
        form.append("category", categoryName || categorySlug);
      }
      if (name) {
        form.append("product", name);
      }
      const res = await authFetch("/api/admin/upload", {
        method: "POST",
        body: form,
        headers: {},
      });
      if (res.ok) {
        const data = (await res.json()) as {
          url: string;
          id: number;
          public_id?: string;
        };
        newImgs.push({
          src: data.url,
          alt: name || file.name,
          wpId: data.id,
          public_id: data.public_id,
        });
        continue;
      }

      const data = await res.json().catch(() => ({}));
      setError(data.error || "Image upload failed");
      break;
    }
    setImages((prev) => [...prev, ...newImgs]);
    setUploading(false);
  };

  const removeImage = (i: number) => {
    const img = images[i];
    // Remove from UI immediately
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    // Immediately delete from Cloudinary / storage
    if (img?.public_id || img?.src || img?.wpId) {
      void authFetch("/api/admin/upload", {
        method: "DELETE",
        body: JSON.stringify({
          public_id: img.public_id,
          url: img.src,
          id: img.wpId,
        }),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Build WooCommerce-compatible payload
    const wcBody: Record<string, unknown> = {
      name,
      sku: sku || undefined,
      short_description: shortDescription,
      description,
      regular_price: regularPrice,
      sale_price: salePrice || "",
      stock_status: stockStatus,
      manage_stock: manageStock,
      ...(manageStock && stockQuantity
        ? { stock_quantity: Number(stockQuantity) }
        : {}),
      // Include wpId (id) so WooCommerce re-uses the existing media attachment
      images: images.map((img) =>
        img.wpId
          ? { id: img.wpId, src: img.src, alt: img.alt }
          : { src: img.src, alt: img.alt }
      ),
      categories: categoryId ? [{ id: categoryId }] : [],
      meta_data: [
        { ...(initialData?.deliveryInsideId ? { id: initialData.deliveryInsideId } : {}), key: "_delivery_inside", value: deliveryInside },
        { ...(initialData?.deliveryOutsideId ? { id: initialData.deliveryOutsideId } : {}), key: "_delivery_outside", value: deliveryOutside }
      ],

      // Store sizes as a product attribute
      attributes:
        sizes.length > 0
          ? [
              {
                name: "Size",
                visible: true,
                variation: false,
                options: sizes,
              },
            ]
          : [],
    };

    try {
      const isEdit = !!initialData?.id;
      const url = isEdit
        ? `/api/admin/products/${initialData.id}`
        : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(wcBody),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Save failed");
        return;
      }

      onSuccess();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column — Main Info ────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Product Name */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-purple-500" />
              <h3 className="text-[14px] font-bold text-gray-700">
                Basic Information
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Product Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  placeholder="e.g. Argentina Home Jersey 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    SKU / Product Code
                  </label>
                  <input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                    placeholder="e.g. ARG-HOME-26"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      Category
                    </label>
                  </div>
                  <select
                    value={categoryId || ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const cat = availableCategories.find(
                        (c) => c.id === id
                      );
                      setCategoryId(id);
                      setCategoryName(cat?.name || "");
                      setCategorySlug(cat?.slug || "");
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  >
                    <option value="">— Select category —</option>
                    {formattedCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {"— ".repeat(cat.level)}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-purple-500" />
              <h3 className="text-[14px] font-bold text-gray-700">
                Description
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Short Description
                </label>
                <textarea
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition resize-none"
                  placeholder="One-line product summary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Full Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition resize-y"
                  placeholder="Detailed product description (HTML supported)"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon className="h-4 w-4 text-purple-500" />
              <h3 className="text-[14px] font-bold text-gray-700">
                Product Images
              </h3>
            </div>
            <div className="mb-4 rounded-xl bg-purple-50/60 border border-purple-100 p-3 text-[12px]">
              <span className="font-bold text-purple-800 block mb-1">
                Recommended Image Specifications:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] text-gray-600">
                <span className="bg-white rounded-lg px-2 py-1 border border-purple-100/80">
                  <strong className="text-purple-900">Preferred:</strong> 2000 × 2000 px
                </span>
                <span className="bg-white rounded-lg px-2 py-1 border border-purple-100/80">
                  <strong className="text-purple-900">Minimum:</strong> 1000 × 1000 px
                </span>
                <span className="bg-white rounded-lg px-2 py-1 border border-purple-100/80">
                  <strong className="text-purple-900">Max File Size:</strong> ~5 MB
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 rounded-xl overflow-hidden border border-purple-100 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="h-24 w-24 rounded-xl border-2 border-dashed border-purple-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-purple-400 hover:text-purple-500 transition disabled:opacity-40"
              >
                {uploading ? (
                  <span className="text-[10px]">Uploading…</span>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span className="text-[10px]">Add Image</span>
                  </>
                )}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) =>
                e.target.files && handleImageUpload(e.target.files)
              }
            />
          </div>
        </div>

        {/* ── Right Column — Price, Stock, Sizes ──────── */}
        <div className="space-y-5">
          {/* Pricing */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <h3 className="text-[14px] font-bold text-gray-700">Pricing</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Regular Price (৳) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={regularPrice}
                  onChange={(e) => setRegularPrice(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  placeholder="1650"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Sale Price (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  placeholder="Leave empty if no sale"
                />
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-purple-500" />
              <h3 className="text-[14px] font-bold text-gray-700">Delivery Charges</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Inside Dhaka (৳) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={deliveryInside}
                  onChange={(e) => setDeliveryInside(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  placeholder="60"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Outside Dhaka (৳) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={deliveryOutside}
                  onChange={(e) => setDeliveryOutside(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  placeholder="120"
                />
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-4 w-4 text-purple-500" />
              <h3 className="text-[14px] font-bold text-gray-700">
                Inventory
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Stock Status
                </label>
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                >
                  {STOCK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manageStock}
                    onChange={(e) => setManageStock(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
                <span className="text-[12px] text-gray-600">
                  Track stock quantity
                </span>
              </div>

              {manageStock && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sizes */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="h-4 w-4 text-purple-500" />
              <h3 className="text-[14px] font-bold text-gray-700">Sizes</h3>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-gray-400 mb-2 font-medium">
                  Clothing
                </p>
                <div className="flex flex-wrap gap-2">
                  {CLOTHING_SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`h-9 min-w-[2.5rem] px-3 rounded-xl text-sm font-semibold border transition ${
                        sizes.includes(s)
                          ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-2 font-medium">
                  Shoe / Euro
                </p>
                <div className="flex flex-wrap gap-2">
                  {SHOE_SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`h-9 min-w-[2.5rem] px-3 rounded-xl text-sm font-semibold border transition ${
                        sizes.includes(s)
                          ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {sizes.length > 0 && (
              <p className="mt-3 text-[11px] text-purple-500 font-medium">
                Selected: {sizes.join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Error + Submit ──────────────────────────────── */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-[14px] font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition shadow-md shadow-purple-200"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {initialData?.id ? "Update Product" : "Create Product"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
