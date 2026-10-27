"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  X,
  Package,
  Layers,
  Loader2,
  Save,
  DollarSign,
  Truck,
  Boxes,
  Coins,
  AlertTriangle,
  Ruler,
  Palette,
  Sparkles,
  FolderTree,
  Folder,
  ImageIcon,
} from "lucide-react";
import type { WooCategory } from "@/types/product";
import { toWpDescription } from "@/utils/html";
import { DescriptionEditor } from "@/components/admin/description-editor";
import { slugifyProductName } from "@/utils/product-url";
import {
  emptySizeChart,
  serializeSizeChart,
  sizeChartHasValues,
  SIZE_CHART_META_KEY,
  normalizeToMultiSectionChart,
  GARMENT_PRESETS,
  type MultiSectionSizeChart,
} from "@/utils/size-chart";
import { SizeMeasurementBuilder } from "@/components/admin/size-measurement-builder";

import {
  type ProductFormProps,
  type ImageItem,
  type PendingUpload,
  type UploadFolderContext,
  STOCK_OPTIONS,
} from "./types";
import { resolveColorStyle } from "./color-swatches";
import { cropImageCanvas, type CropMode, type CropAlign } from "./crop-utils";
import { uploadImageWithProgress } from "./upload-utils";
import { ImageCropModal } from "./ImageCropModal";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { ProductColorModal } from "./ProductColorModal";
import { ProductCategorySelector, type CategorySelectionItem } from "./ProductCategorySelector";
import { ProductImageManager } from "./ProductImageManager";

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const router = useRouter();
  const { authFetch } = useAuth();
  const MAX_IMAGES = 6;

  // Track images uploaded in this editing session for server cleanup if cancelled
  const sessionUploadedRef = useRef<{ id?: number; url: string }[]>([]);
  const isSubmittedRef = useRef<boolean>(false);

  // Form states
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
  const [buyPrice, setBuyPrice] = useState(initialData?.buyPrice || "");
  const [stockStatus, setStockStatus] = useState(
    initialData?.stockStatus || "instock"
  );
  const [stockQuantity, setStockQuantity] = useState(
    initialData?.stockQuantity || ""
  );
  const [manageStock, setManageStock] = useState(
    initialData?.manageStock !== undefined
      ? initialData.manageStock
      : Boolean(initialData?.stockQuantity && initialData.stockQuantity !== "0")
  );

  const [selectedCategories, setSelectedCategories] = useState<CategorySelectionItem[]>(
    initialData?.categories || []
  );
  const [sizes, setSizes] = useState<string[]>(initialData?.sizes || []);
  const [colors, setColors] = useState<string[]>(initialData?.colors || []);
  const [sizeChart, setSizeChart] = useState<MultiSectionSizeChart>(() =>
    normalizeToMultiSectionChart(initialData?.sizeChart, initialData?.sizes)
  );

  const [slugManual, setSlugManual] = useState(Boolean(initialData?.slug));
  const [slug, setSlug] = useState(
    initialData?.slug || slugifyProductName(initialData?.name || "")
  );
  const [images, setImages] = useState<ImageItem[]>(initialData?.images || []);
  const [deliveryInside, setDeliveryInside] = useState(
    initialData?.deliveryInside !== undefined ? initialData.deliveryInside : ""
  );
  const [deliveryOutside, setDeliveryOutside] = useState(
    initialData?.deliveryOutside !== undefined ? initialData.deliveryOutside : ""
  );

  const [availableCategories, setAvailableCategories] = useState<WooCategory[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Modals
  const [previewModalIndex, setPreviewModalIndex] = useState<number | null>(null);
  const [cropModalIndex, setCropModalIndex] = useState<number | null>(null);
  const [processingCrop, setProcessingCrop] = useState(false);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);

  const uploading = pendingUploads.some(
    (u) => u.phase === "uploading" || u.phase === "processing"
  );

  // Load available categories
  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      try {
        const res = await authFetch("/api/admin/categories");
        if (!res.ok) return;
        const data = await res.json().catch(() => []);
        if (!cancelled && Array.isArray(data)) {
          setAvailableCategories(
            data.sort((a: WooCategory, b: WooCategory) =>
              a.name.localeCompare(b.name)
            )
          );
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  // Clean up freshly uploaded images if navigation cancels
  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current && sessionUploadedRef.current.length > 0) {
        sessionUploadedRef.current.forEach((item) => {
          void authFetch("/api/admin/upload", {
            method: "DELETE",
            body: JSON.stringify({ url: item.url, id: item.id }),
          }).catch((err) => {
            console.warn("Failed to delete unused uploaded image on unmount:", err);
          });
        });
      }
    };
  }, [authFetch]);

  // Stock quantity handlers
  const handleStockQuantityChange = (val: string) => {
    setStockQuantity(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      setManageStock(true);
      if (parsed === 0) {
        setStockStatus("outofstock");
      } else if (parsed > 0 && stockStatus === "outofstock") {
        setStockStatus("instock");
      }
    }
  };

  const handleQuickAddStock = (delta: number) => {
    const current = parseInt(stockQuantity || "0", 10);
    const safeCurrent = isNaN(current) ? 0 : current;
    const next = Math.max(0, safeCurrent + delta);
    handleStockQuantityChange(String(next));
  };

  // Category handlers
  const toggleCategory = (cat: CategorySelectionItem) => {
    setSelectedCategories((prev) =>
      prev.some((c) => c.id === cat.id)
        ? prev.filter((c) => c.id !== cat.id)
        : [...prev, { id: cat.id, name: cat.name, slug: cat.slug, parent: cat.parent || 0 }]
    );
  };

  const makePrimaryCategory = (id: number) => {
    setSelectedCategories((prev) => {
      const target = prev.find((c) => c.id === id);
      return target ? [target, ...prev.filter((c) => c.id !== id)] : prev;
    });
  };

  const clearCategories = () => {
    setSelectedCategories([]);
  };

  // Sizes sorting & manipulation
  const sortSizes = (list: string[]): string[] => {
    const clothingOrder: Record<string, number> = {
      xs: 1,
      s: 2,
      m: 3,
      l: 4,
      xl: 5,
      xxl: 6,
      "2xl": 6,
      "3xl": 7,
      "4xl": 8,
      "5xl": 9,
    };
    return [...list].sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      const ordA = clothingOrder[a.toLowerCase()];
      const ordB = clothingOrder[b.toLowerCase()];
      if (ordA && ordB) return ordA - ordB;
      if (ordA) return -1;
      if (ordB) return 1;
      return a.localeCompare(b);
    });
  };

  const toggleSize = (s: string) => {
    const clean = s.trim();
    if (!clean) return;
    setSizes((prev) => {
      const exists = prev.some((x) => x.toLowerCase() === clean.toLowerCase());
      const nextSizes = exists
        ? prev.filter((x) => x.toLowerCase() !== clean.toLowerCase())
        : sortSizes([...prev, clean]);

      setSizeChart((prevChart) => {
        const chartSizes = exists
          ? prevChart.sizes.filter((x) => x.toLowerCase() !== clean.toLowerCase())
          : prevChart.sizes.includes(clean)
          ? prevChart.sizes
          : [...prevChart.sizes, clean];

        return {
          ...prevChart,
          sizes: chartSizes,
        };
      });

      return nextSizes;
    });
  };

  const clearAllSizes = () => {
    setSizes([]);
    setSizeChart((prev) => ({ ...prev, sizes: [] }));
  };

  // Color handlers
  const toggleColor = (c: string) => {
    setColors((prev) =>
      prev.some((x) => x.toLowerCase() === c.toLowerCase())
        ? prev.filter((x) => x.toLowerCase() !== c.toLowerCase())
        : [...prev, c]
    );
  };

  const addCustomColor = (custom: string) => {
    const clean = custom.trim();
    if (!clean) return;
    if (!colors.some((x) => x.toLowerCase() === clean.toLowerCase())) {
      setColors((prev) => [...prev, clean]);
    }
  };

  // Resolve upload folder context based on selected categories and product slug
  const getFolderContext = (): UploadFolderContext => {
    let catSlug = "";
    let subSlug = "";

    const primary = selectedCategories[0];
    if (primary) {
      if (primary.parent && primary.parent > 0) {
        subSlug = primary.slug || primary.name;
        const parentCat =
          availableCategories.find((c) => c.id === primary.parent) ||
          selectedCategories.find((c) => c.id === primary.parent);
        if (parentCat) catSlug = parentCat.slug || parentCat.name;
      } else {
        catSlug = primary.slug || primary.name;
        const childCat = selectedCategories.find((c) => c.parent === primary.id);
        if (childCat) subSlug = childCat.slug || childCat.name;
      }
    }

    if (!subSlug) {
      const anySub = selectedCategories.find((c) => c.parent && c.parent > 0);
      if (anySub) {
        subSlug = anySub.slug || anySub.name;
        if (!catSlug) {
          const parentCat =
            availableCategories.find((c) => c.id === anySub.parent) ||
            selectedCategories.find((c) => c.id === anySub.parent);
          if (parentCat) catSlug = parentCat.slug || parentCat.name;
        }
      }
    }

    const prodSlug = (slug || slugifyProductName(name || "") || "").trim();

    return {
      category: catSlug || undefined,
      subcategory: subSlug || undefined,
      product: prodSlug || undefined,
      sku: sku ? sku.trim() : undefined,
    };
  };

  const updatePending = (id: string, patch: Partial<PendingUpload>) => {
    setPendingUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  };

  const removePending = (id: string) => {
    setPendingUploads((prev) => {
      const target = prev.find((u) => u.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((u) => u.id !== id);
    });
  };

  // Upload handler with progress
  const handleImageUpload = async (files: FileList | File[]) => {
    setError("");
    const currentCount =
      images.length +
      pendingUploads.filter(
        (u) => u.phase === "uploading" || u.phase === "processing"
      ).length;
    const remainingSlots = MAX_IMAGES - currentCount;

    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_IMAGES} images allowed per product.`);
      return;
    }

    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) {
      setError("Please select or drop valid image files (JPG, PNG, WEBP, etc.).");
      return;
    }

    let filesToProcess = fileList;
    if (fileList.length > remainingSlots) {
      filesToProcess = fileList.slice(0, remainingSlots);
      setError(
        `Only ${remainingSlots} photo(s) will upload. Maximum is ${MAX_IMAGES} photos per product.`
      );
    }

    const batch: PendingUpload[] = filesToProcess.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      phase: "uploading" as const,
    }));

    setPendingUploads((prev) => [...prev, ...batch]);
    const folderCtx = getFolderContext();

    await Promise.all(
      batch.map(async (item, index) => {
        const file = filesToProcess[index];
        try {
          const { url, id: wpId } = await uploadImageWithProgress(
            file,
            (pct) => updatePending(item.id, { progress: pct, phase: "uploading" }),
            () => updatePending(item.id, { progress: 95, phase: "processing" }),
            folderCtx
          );

          const newImg: ImageItem = {
            src: url,
            alt: name || file.name,
            ...(typeof wpId === "number" ? { wpId } : {}),
          };

          sessionUploadedRef.current.push({
            ...(typeof wpId === "number" ? { id: wpId } : {}),
            url,
          });

          setImages((prev) => [...prev, newImg].slice(0, MAX_IMAGES));
          removePending(item.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Image upload failed";
          updatePending(item.id, { phase: "error", error: msg, progress: 0 });
          setError(msg);
        }
      })
    );
  };

  const removeImage = (i: number) => {
    const img = images[i];
    if (!img) return;

    setImages((prev) => prev.filter((_, idx) => idx !== i));

    const wasUploadedInSession = sessionUploadedRef.current.some(
      (item) => item.url === img.src || (img.wpId && item.id === img.wpId)
    );

    if (wasUploadedInSession) {
      sessionUploadedRef.current = sessionUploadedRef.current.filter(
        (item) => (item.id && item.id === img.wpId) || item.url === img.src
      );

      void authFetch("/api/admin/upload", {
        method: "DELETE",
        body: JSON.stringify({ url: img.src }),
      }).catch((err) => {
        console.warn("Failed to delete removed session image from Cloudinary:", err);
      });
    }
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    setImages((prev) => {
      const newArr = [...prev];
      const targetIdx = direction === "left" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
      const temp = newArr[index];
      newArr[index] = newArr[targetIdx];
      newArr[targetIdx] = temp;
      return newArr;
    });
  };

  const handleReorderImages = (sourceIndex: number, targetIndex: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  // Crop handler
  const handleApplyCrop = async (cropMode: CropMode, cropAlign: CropAlign) => {
    if (cropModalIndex === null) return;
    const targetImg = images[cropModalIndex];
    if (!targetImg) return;

    try {
      setProcessingCrop(true);
      setError("");
      const blob = await cropImageCanvas(targetImg.src, cropMode, cropAlign);
      const filename = `product-${Date.now()}.jpg`;
      const form = new FormData();
      form.append("image", blob, filename);

      const folderCtx = getFolderContext();
      if (folderCtx.category) form.append("category", folderCtx.category);
      if (folderCtx.subcategory) form.append("subcategory", folderCtx.subcategory);
      if (folderCtx.product) form.append("product", folderCtx.product);
      if (folderCtx.folder) form.append("folder", folderCtx.folder);

      const res = await authFetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to upload cropped image");
        return;
      }

      const { url, id: wpId } = (await res.json()) as { url: string; id: number };

      const oldImg = targetImg;
      if (oldImg) {
        const wasOldInSession = sessionUploadedRef.current.some(
          (item) => item.url === oldImg.src || (oldImg.wpId && item.id === oldImg.wpId)
        );
        if (wasOldInSession) {
          sessionUploadedRef.current = sessionUploadedRef.current.filter(
            (item) => (item.id && item.id === oldImg.wpId) || item.url === oldImg.src
          );
          void authFetch("/api/admin/upload", {
            method: "DELETE",
            body: JSON.stringify({ url: oldImg.src }),
          }).catch(() => {});
        }
      }

      sessionUploadedRef.current.push({ id: wpId, url });

      setImages((prev) =>
        prev.map((img, idx) =>
          idx === cropModalIndex ? { ...img, src: url, wpId } : img
        )
      );
      setCropModalIndex(null);
    } catch (err) {
      console.error("Crop error:", err);
      setError(err instanceof Error ? err.message : "Error cropping image");
    } finally {
      setProcessingCrop(false);
    }
  };

  // Cancel action
  const handleCancel = () => {
    if (sessionUploadedRef.current.length > 0) {
      sessionUploadedRef.current.forEach((item) => {
        void authFetch("/api/admin/upload", {
          method: "DELETE",
          body: JSON.stringify({ url: item.url, id: item.id }),
        }).catch(() => {});
      });
      sessionUploadedRef.current = [];
    }
    if (onCancel) onCancel();
    else router.push("/admin/products");
  };

  // Submit action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) {
      setError("Please wait for image uploads to finish.");
      return;
    }
    if (selectedCategories.length === 0) {
      setError("Please select at least one category so the product appears on the website.");
      return;
    }
    setError("");
    setSaving(true);

    const attributes: Array<{
      id?: number;
      name: string;
      visible: boolean;
      variation: boolean;
      options: string[];
    }> = [
      ...(initialData?.otherAttributes ?? []).map((a) => ({
        ...(typeof a.id === "number" ? { id: a.id } : {}),
        name: a.name,
        visible: a.visible ?? true,
        variation: a.variation ?? false,
        options: a.options ?? [],
      })),
      {
        name: "Size",
        visible: true,
        variation: false,
        options: sizes,
      },
      {
        name: "Color",
        visible: true,
        variation: false,
        options: colors,
      },
    ];

    const productSlug = slugManual
      ? slugifyProductName(slug || name)
      : slugifyProductName(name);

    const wcBody: Record<string, unknown> = {
      name,
      slug: productSlug,
      sku: sku || undefined,
      short_description: toWpDescription(shortDescription),
      description: toWpDescription(description),
      regular_price: regularPrice,
      sale_price: salePrice || "",
      buy_price: buyPrice || "",
      price: salePrice || regularPrice || "0",
      stock_status: stockStatus,
      manage_stock: Boolean(
        manageStock || (stockQuantity.trim() !== "" && !isNaN(Number(stockQuantity)))
      ),
      ...(stockQuantity.trim() !== "" && !isNaN(Number(stockQuantity))
        ? { stock_quantity: Number(stockQuantity) }
        : manageStock
        ? { stock_quantity: 0 }
        : { stock_quantity: null }),
      images: images.map((img) =>
        img.wpId
          ? { id: img.wpId, src: img.src, alt: img.alt }
          : { src: img.src, alt: img.alt }
      ),
      categories: selectedCategories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent: c.parent || 0,
      })),
      sizes,
      meta_data: [
        ...(buyPrice ? [{ key: "_buy_price", value: buyPrice }] : []),
        { ...(initialData?.deliveryInsideId ? { id: initialData.deliveryInsideId } : {}), key: "_delivery_inside", value: deliveryInside },
        { ...(initialData?.deliveryOutsideId ? { id: initialData.deliveryOutsideId } : {}), key: "_delivery_outside", value: deliveryOutside },
        {
          ...(initialData?.sizeChartMetaId ? { id: initialData.sizeChartMetaId } : {}),
          key: SIZE_CHART_META_KEY,
          value: sizeChartHasValues(sizeChart) ? serializeSizeChart(sizeChart) : "",
        },
        {
          key: "_plainstitch_size_chart",
          value: sizeChartHasValues(sizeChart) ? serializeSizeChart(sizeChart) : "",
        },
      ],
      attributes,
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

      isSubmittedRef.current = true;
      sessionUploadedRef.current = [];
      onSuccess();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const primaryCategory = selectedCategories[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column — Main Content & Images ────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-purple-600" />
              <h3 className="text-[14px] font-bold text-gray-800">
                Basic Information
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">
                  Product Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => {
                    const next = e.target.value;
                    setName(next);
                    if (!slugManual) setSlug(slugifyProductName(next));
                  }}
                  required
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] text-stone-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                  placeholder="e.g. Elegant Handloom Cotton Panjabi"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">
                    SKU / Product Code
                  </label>
                  <input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] text-stone-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                    placeholder="e.g. ANK-PNJ-26"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">
                    URL Slug
                    <button
                      type="button"
                      onClick={() => {
                        setSlugManual(false);
                        setSlug(slugifyProductName(name));
                      }}
                      className="ml-2 font-semibold normal-case tracking-normal text-purple-600 hover:underline cursor-pointer"
                    >
                      Reset from name
                    </button>
                  </label>
                  <input
                    value={slug}
                    onChange={(e) => {
                      setSlugManual(true);
                      setSlug(slugifyProductName(e.target.value));
                    }}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] font-mono text-stone-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                    placeholder="product-name-in-url"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Categories (Hierarchy & Multi-Select) ── */}
          <ProductCategorySelector
            availableCategories={availableCategories}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            onMakePrimary={makePrimaryCategory}
            onClearCategories={clearCategories}
            productName={name}
            productSlug={slug}
            slugManual={slugManual}
          />

          {/* Descriptions */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-4 w-4 text-purple-600" />
              <h3 className="text-[14px] font-bold text-gray-800">
                Descriptions
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Short Description
                  <span className="ml-1.5 font-semibold normal-case tracking-normal text-gray-300">
                    (WordPress excerpt)
                  </span>
                </label>
                <DescriptionEditor
                  value={shortDescription}
                  onChange={setShortDescription}
                  minHeight={88}
                  placeholder="Paste or type a short summary — formatting is kept"
                />
                <p className="mt-1.5 text-[11px] text-gray-400 leading-relaxed">
                  Paste from Word, Google Docs, or a website — paragraphs, bold, and lists stay the same on the product page.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Full Description
                </label>
                <DescriptionEditor
                  value={description}
                  onChange={setDescription}
                  minHeight={180}
                  placeholder="Paste or type the full product description — same look as the storefront"
                />
                <p className="mt-1.5 text-[11px] text-gray-400 leading-relaxed">
                  Copy-paste keeps the same layout customers see (headings, lists, tables, links).
                </p>
              </div>
            </div>
          </div>

          {/* ── Product Images & Drag & Drop Studio ── */}
          <ProductImageManager
            images={images}
            pendingUploads={pendingUploads}
            uploading={uploading}
            maxImages={MAX_IMAGES}
            onFilesSelected={handleImageUpload}
            onMoveImage={moveImage}
            onRemoveImage={removeImage}
            onReorderImages={handleReorderImages}
            onPreviewImage={(i) => setPreviewModalIndex(i)}
            onCropImage={(i) => {
              setCropModalIndex(i);
            }}
            onRemovePending={removePending}
          />
        </div>

        {/* ── Right Column — Pricing, Delivery, Inventory, Sizes, Colors ── */}
        <div className="space-y-5">
          {/* Pricing */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-gray-800">Pricing &amp; Margins</h3>
                  <p className="text-[11px] text-stone-400">Regular price, sale price &amp; inventory cost</p>
                </div>
              </div>
              {(salePrice || regularPrice) && (
                <span className="text-[12px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200/60 px-2.5 py-0.5 rounded-full">
                  ৳{Number(salePrice || regularPrice).toLocaleString()}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Regular Price (৳) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-stone-400 select-none">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={regularPrice}
                    onChange={(e) => setRegularPrice(e.target.value)}
                    required
                    className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-4 py-2.5 text-[14px] font-semibold text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                    placeholder="1650"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Sale Price (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-stone-400 select-none">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-4 py-2.5 text-[14px] font-semibold text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                    placeholder="Leave empty if no sale"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700">
                    Buy Price / Cost (৳)
                  </label>
                  <span className="text-[10px] text-stone-400">Inventory Cost</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-stone-400 select-none">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-4 py-2.5 text-[14px] font-semibold text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                    placeholder="e.g. 950 (cost per unit)"
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-400 leading-tight">
                  Your purchase or production cost. Powers stock valuation &amp; margins.
                </p>
              </div>

              {/* Profit Margin Preview */}
              {(() => {
                const effectiveRetail = parseFloat(salePrice || regularPrice || "0");
                const unitCost = parseFloat(buyPrice || "0");
                if (effectiveRetail > 0 && unitCost > 0) {
                  const profit = effectiveRetail - unitCost;
                  const marginPct = ((profit / effectiveRetail) * 100).toFixed(1);
                  const isProfitable = profit >= 0;
                  return (
                    <div
                      className={`rounded-xl p-3 border text-[12px] ${
                        isProfitable
                          ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                          : "bg-rose-50/80 border-rose-200 text-rose-900"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{isProfitable ? "Gross Profit per Unit" : "Negative Margin Warning"}</span>
                        <span>৳{profit.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-1 opacity-85">
                        <span>Gross Margin:</span>
                        <span className="font-semibold">{marginPct}%</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Delivery Charges */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-gray-800">Delivery Charges</h3>
                  <p className="text-[11px] text-stone-400">City-specific shipping or store default</p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="text-[11.5px] text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                💡 <strong>Leave empty</strong> to use standard store delivery rates. Enter <strong>0</strong> to give <strong>Free Delivery</strong> for this product.
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Inside Dhaka (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-stone-400 select-none">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={deliveryInside}
                    onChange={(e) => setDeliveryInside(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-4 py-2.5 text-[13px] font-semibold text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                    placeholder="Empty = store rate · 0 = Free"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Outside Dhaka (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-stone-400 select-none">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={deliveryOutside}
                    onChange={(e) => setDeliveryOutside(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-4 py-2.5 text-[13px] font-semibold text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                    placeholder="Empty = store rate · 0 = Free"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stock & Inventory Valuation */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
                  <Boxes className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-gray-800">
                    Inventory &amp; Stock
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Quantity, fulfillment status &amp; valuation
                  </p>
                </div>
              </div>
              {(() => {
                const qty = parseInt(stockQuantity || "0", 10);
                if (stockStatus === "outofstock" || (manageStock && stockQuantity !== "" && qty === 0)) {
                  return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Out of Stock
                    </span>
                  );
                }
                if (manageStock && stockQuantity !== "" && qty > 0 && qty <= 3) {
                  return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                      Low Stock ({qty})
                    </span>
                  );
                }
                if (manageStock && stockQuantity !== "" && qty > 3) {
                  return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {qty} In Stock
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                    {stockStatus === "onbackorder" ? "Backorder" : "In Stock"}
                  </span>
                );
              })()}
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-600">
                    Stock Quantity (Units)
                  </label>
                  <span className="text-[10px] text-stone-400">Available to sell</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => handleStockQuantityChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-gray-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                    placeholder="Enter quantity (e.g. 25)"
                  />
                  {stockQuantity && (
                    <button
                      type="button"
                      onClick={() => handleStockQuantityChange("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 hover:text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Add Pills */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-gray-400 font-medium mr-1">Quick Add:</span>
                  {[
                    { label: "+1", delta: 1 },
                    { label: "+5", delta: 5 },
                    { label: "+10", delta: 10 },
                    { label: "+25", delta: 25 },
                    { label: "+50", delta: 50 },
                  ].map((pill) => (
                    <button
                      key={pill.label}
                      type="button"
                      onClick={() => handleQuickAddStock(pill.delta)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-gray-200 bg-gray-50 hover:bg-white hover:border-purple-500 hover:text-purple-600 text-gray-600 transition shadow-2xs cursor-pointer"
                    >
                      {pill.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleStockQuantityChange("0")}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                    title="Mark quantity as 0 (Out of stock)"
                  >
                    Set 0
                  </button>
                </div>
              </div>

              {/* Stock Status Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                  Stock Status
                </label>
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                >
                  {STOCK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Track Stock Quantity Checkbox */}
              <div className="flex items-center gap-3 pt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manageStock}
                    onChange={(e) => setManageStock(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
                <div>
                  <span className="text-[12px] font-bold text-stone-700">
                    Track Inventory Quantity
                  </span>
                  <p className="text-[11px] text-stone-400">
                    Auto-decrement on orders &amp; prevent overselling
                  </p>
                </div>
              </div>

              {/* Inventory Valuation & Economics Card */}
              {(() => {
                const qty = parseInt(stockQuantity || "0", 10);
                const costPerUnit = parseFloat(buyPrice || "0");
                const retailPerUnit = parseFloat(salePrice || regularPrice || "0");

                if (costPerUnit > 0 || (qty > 0 && retailPerUnit > 0)) {
                  const totalCostVal = costPerUnit * (qty > 0 ? qty : 1);
                  const totalRetailVal = retailPerUnit * (qty > 0 ? qty : 1);
                  const unitGrossProfit =
                    retailPerUnit > 0 && costPerUnit > 0 ? retailPerUnit - costPerUnit : 0;
                  const marginPct =
                    retailPerUnit > 0 ? ((unitGrossProfit / retailPerUnit) * 100).toFixed(1) : "0";

                  return (
                    <div className="mt-3 rounded-2xl bg-gradient-to-br from-purple-50/60 via-stone-50 to-indigo-50/40 border border-purple-100/80 p-3.5 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-600 border-b border-purple-100 pb-2">
                        <span className="flex items-center gap-1.5 text-purple-700">
                          <Coins className="h-3.5 w-3.5" />
                          Inventory Valuation &amp; Economics
                        </span>
                        {qty > 0 && (
                          <span className="font-mono text-stone-500 font-bold">
                            {qty} units
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                        <div className="bg-white/80 rounded-xl p-2.5 border border-purple-100/60 shadow-2xs">
                          <p className="text-[10px] uppercase font-bold text-stone-400">
                            {qty > 0 ? "Total Stock Cost" : "Unit Buy Price"}
                          </p>
                          <p className="text-[14px] font-extrabold text-purple-700 mt-0.5">
                            ৳{(qty > 0 ? totalCostVal : costPerUnit).toLocaleString()}
                          </p>
                          {qty > 0 && costPerUnit > 0 && (
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              ৳{costPerUnit.toLocaleString()} × {qty} pcs
                            </p>
                          )}
                        </div>

                        <div className="bg-white/80 rounded-xl p-2.5 border border-purple-100/60 shadow-2xs">
                          <p className="text-[10px] uppercase font-bold text-stone-400">
                            {qty > 0 ? "Total Retail Value" : "Unit Retail"}
                          </p>
                          <p className="text-[14px] font-extrabold text-stone-800 mt-0.5">
                            ৳{(qty > 0 ? totalRetailVal : retailPerUnit).toLocaleString()}
                          </p>
                          {qty > 0 && retailPerUnit > 0 && (
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              ৳{retailPerUnit.toLocaleString()} × {qty} pcs
                            </p>
                          )}
                        </div>
                      </div>

                      {costPerUnit > 0 && retailPerUnit > 0 && (
                        <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-200/70 flex items-center justify-between text-[12px]">
                          <div>
                            <span className="font-bold text-stone-700">Projected Gross Profit:</span>
                            <span className="ml-1 text-[11px] font-bold text-emerald-600">
                              ({marginPct}% margin)
                            </span>
                          </div>
                          <span className="font-black text-emerald-700 text-[13px]">
                            ৳{(qty > 0 ? totalRetailVal - totalCostVal : unitGrossProfit).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="rounded-xl bg-purple-50/40 border border-purple-100/60 p-2.5 text-[11.5px] text-stone-600 leading-relaxed flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Inventory Tip:</strong> Enter your <strong>Buy Price</strong> in the Pricing card to unlock real-time warehouse valuation, total capital invested, and profit margins.
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Sizes & Measurements */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
                  <Ruler className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-gray-800">
                    Sizes &amp; Measurements
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Selectable sizes &amp; garment specs chart
                  </p>
                </div>
              </div>
              {sizes.length > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                  {sizes.length} {sizes.length === 1 ? "size" : "sizes"}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSizeModalOpen(true)}
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-bold border border-purple-200 bg-white text-stone-800 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 transition cursor-pointer shadow-xs select-none"
                >
                  <Ruler className="h-3.5 w-3.5 text-purple-600" />
                  <span>{sizes.length > 0 ? "+ Configure Sizes & Specs" : "+ Setup Sizes & Measurements"}</span>
                </button>

                {sizes.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllSizes}
                    className="text-[11px] font-semibold text-stone-400 hover:text-rose-600 transition cursor-pointer px-2 py-1"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {sizes.length > 0 ? (
                <div className="p-3 rounded-xl bg-purple-50/30 border border-purple-100/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-500">
                      Active Product Sizes ({sizes.length})
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Click &times; to remove
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sizes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-xs font-bold bg-white text-purple-700 border border-purple-200 shadow-2xs group hover:border-purple-400 transition"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => toggleSize(s)}
                          className="h-4 w-4 rounded flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title={`Remove ${s}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {sizeChart.sections && sizeChart.sections.length > 0 && (
                    <div className="pt-2 border-t border-purple-100/60 flex items-center justify-between text-[11px]">
                      <span className="text-stone-600 flex items-center gap-1.5 truncate mr-2">
                        <Sparkles className="h-3 w-3 text-purple-600 shrink-0" />
                        <strong className="text-stone-800 shrink-0">
                          {GARMENT_PRESETS[sizeChart.preset || "suit"]?.label || "Garment Specs"}:
                        </strong>{" "}
                        <span className="truncate">
                          {sizeChart.sections.map((s) => s.title).join(" + ")}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSizeModalOpen(true)}
                        className="font-bold text-purple-600 hover:underline cursor-pointer shrink-0"
                      >
                        Edit Specs &rarr;
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-stone-200 p-3.5 text-center bg-stone-50/50">
                  <p className="text-[11.5px] text-stone-500">
                    No sizes selected yet (product will have no size selector).
                  </p>
                  <p className="text-[10.5px] text-stone-400 mt-0.5">
                    Click &ldquo;+ Setup Sizes &amp; Measurements&rdquo; to pick sizes and customize garment measurements.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Product Colors */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-purple-600" />
                <h3 className="text-[14px] font-bold text-gray-800">
                  Product Colors
                </h3>
              </div>
              {colors.length > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                  {colors.length} {colors.length === 1 ? "color" : "colors"}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setColorModalOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-bold border border-purple-200 bg-white text-stone-800 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 transition cursor-pointer shadow-xs select-none"
              >
                <Palette className="h-3.5 w-3.5 text-purple-600" />
                <span>{colors.length > 0 ? "+ Add More Colors" : "+ Select Colors"}</span>
              </button>

              {colors.map((c) => {
                const style = resolveColorStyle(c);
                return (
                  <span
                    key={c}
                    className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-xl text-xs font-bold border border-purple-100 bg-white text-stone-800 shadow-2xs group hover:border-purple-300 transition"
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded-full shrink-0 ${style.swatchBorder}`}
                      style={{ backgroundColor: style.bg }}
                      title={`Color swatch: ${c}`}
                    />
                    <span className="font-semibold">{c}</span>
                    <button
                      type="button"
                      onClick={() => toggleColor(c)}
                      className="h-4 w-4 rounded flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-stone-100 transition cursor-pointer"
                      title={`Remove ${c}`}
                      aria-label={`Remove ${c}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}

              {colors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setColors([])}
                  className="text-[11px] font-semibold text-stone-400 hover:text-red-600 transition cursor-pointer ml-1"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Save Action Bar ──────────── */}
      <div className="fixed bottom-0 left-0 lg:left-[var(--admin-sidebar-width,78px)] right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-[left] duration-300">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          {error && (
            <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2 text-[12px] text-red-700">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span className="truncate">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-700 p-0.5 shrink-0"
                aria-label="Dismiss error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Left summary info */}
            <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
              {images.length > 0 && images[0]?.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[0].src}
                  alt={name || "Product"}
                  className="h-11 w-11 rounded-xl object-cover border border-stone-200/90 shadow-2xs shrink-0 ring-1 ring-black/5"
                />
              ) : (
                <div className="h-11 w-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-stone-400" />
                </div>
              )}

              <div className="min-w-0 flex-1 sm:flex-initial">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] sm:text-[14px] font-bold text-stone-900 truncate max-w-[200px] sm:max-w-sm md:max-w-md">
                    {name.trim() || (initialData?.id ? "Edit Product" : "New Product")}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                      initialData?.id
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {initialData?.id ? "Editing" : "Draft"}
                  </span>
                </div>

                {/* Subtitle / Category line & stats */}
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-600 flex-wrap">
                  {primaryCategory ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium border border-stone-200/80 max-w-[240px] sm:max-w-xs md:max-w-sm truncate"
                    >
                      <FolderTree className="h-3 w-3 text-stone-500 shrink-0" />
                      <span className="truncate">{primaryCategory.name}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 text-stone-500 text-[11px] font-medium border border-stone-200/80 shrink-0">
                      <Folder className="h-3 w-3 text-stone-400 shrink-0" />
                      <span>No category</span>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium border border-stone-200/80 shrink-0">
                    <ImageIcon className="h-3 w-3 text-stone-500 shrink-0" />
                    <span>{images.length} {images.length === 1 ? "image" : "images"}</span>
                  </span>

                  {sizes.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium border border-stone-200/80 shrink-0">
                      <Ruler className="h-3 w-3 text-stone-500 shrink-0" />
                      <span>{sizes.length} sizes</span>
                    </span>
                  )}

                  {colors.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium border border-stone-200/80 shrink-0">
                      <Palette className="h-3 w-3 text-stone-500 shrink-0" />
                      <span>{colors.length} {colors.length === 1 ? "color" : "colors"}</span>
                    </span>
                  )}

                  {uploading && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-300 animate-pulse shrink-0">
                      <Loader2 className="h-3 w-3 animate-spin text-amber-700 shrink-0" />
                      <span>Uploading…</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right action buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 sm:px-5 py-2.5 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-400 disabled:opacity-50 transition shadow-2xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 sm:px-6 py-2.5 text-[13px] font-bold text-white disabled:opacity-50 transition shadow-md shadow-purple-200 hover:shadow-lg cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-purple-200" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 text-purple-200" />
                    <span>{initialData?.id ? "Update Product" : "Save Product"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      <ImagePreviewModal
        isOpen={previewModalIndex !== null && !!images[previewModalIndex]}
        imageSrc={previewModalIndex !== null && images[previewModalIndex] ? images[previewModalIndex].src : null}
        imageAlt={previewModalIndex !== null && images[previewModalIndex] ? images[previewModalIndex].alt : undefined}
        currentIndex={previewModalIndex ?? 0}
        totalImages={images.length}
        onClose={() => setPreviewModalIndex(null)}
        onOpenCrop={() => {
          if (previewModalIndex !== null) {
            setCropModalIndex(previewModalIndex);
            setPreviewModalIndex(null);
          }
        }}
      />

      {/* ── Interactive Crop Modal ── */}
      <ImageCropModal
        isOpen={cropModalIndex !== null && !!images[cropModalIndex]}
        imageSrc={cropModalIndex !== null && images[cropModalIndex] ? images[cropModalIndex].src : null}
        imageAlt={cropModalIndex !== null && images[cropModalIndex] ? images[cropModalIndex].alt : undefined}
        processingCrop={processingCrop}
        onClose={() => setCropModalIndex(null)}
        onApply={handleApplyCrop}
      />

      {/* ── Color Modal ── */}
      <ProductColorModal
        isOpen={colorModalOpen}
        selectedColors={colors}
        onToggleColor={toggleColor}
        onAddCustomColor={addCustomColor}
        onClearColors={() => setColors([])}
        onClose={() => setColorModalOpen(false)}
      />

      {/* ── Size & Measurement Builder Modal ── */}
      {sizeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto"
        >
          <div
            className="fixed inset-0"
            onClick={() => setSizeModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-7xl max-h-[96vh] flex flex-col rounded-3xl bg-[#f0f0f8] shadow-2xl overflow-y-auto border border-purple-100/60">
            <SizeMeasurementBuilder
              initialChart={sizeChart}
              productName={name}
              availableProductSizes={sizes}
              onSave={(newChart) => {
                setSizeChart(newChart);
                if (newChart.sizes && newChart.sizes.length > 0) {
                  setSizes(newChart.sizes);
                }
                setSizeModalOpen(false);
              }}
              onCancel={() => setSizeModalOpen(false)}
            />
          </div>
        </div>
      )}
    </form>
  );
}
