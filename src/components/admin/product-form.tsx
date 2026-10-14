"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
  ArrowRight,
  Crop,
  Eye,
  Sparkles,
  Search,
  Palette,
  Link2,
  Boxes,
  Coins,
  AlertTriangle,
} from "lucide-react";
import type { WooCategory } from "@/types/product";
import { toWpDescription } from "@/utils/html";
import { DescriptionEditor } from "@/components/admin/description-editor";
import { getProductPageUrl, slugifyProductName } from "@/utils/product-url";
import {
  DEFAULT_SIZE_CHART_COLUMNS,
  emptySizeChart,
  serializeSizeChart,
  sizeChartHasValues,
  SIZE_CHART_META_KEY,
  type SizeChartData,
} from "@/utils/size-chart";

interface ImageItem {
  src: string;
  alt: string;
  wpId?: number;
}

interface PendingUpload {
  id: string;
  name: string;
  previewUrl: string;
  /** 0–100 while bytes are sending */
  progress: number;
  phase: "uploading" | "processing" | "error";
  error?: string;
}

/** Upload one image with real byte-level progress (fetch has no upload progress). */
function uploadImageWithProgress(
  file: File,
  onProgress: (pct: number) => void,
  onProcessing: () => void,
): Promise<{ url: string; id: number | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("image", file);

    xhr.open("POST", "/api/admin/upload");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      // Cap at 95 until the server finishes WordPress/media processing
      const pct = Math.min(95, Math.round((e.loaded / e.total) * 95));
      onProgress(pct);
    };

    xhr.upload.onload = () => {
      onProgress(95);
      onProcessing();
    };

    xhr.onload = () => {
      let data: { url?: string; id?: number | null; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {
        /* ignore */
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        onProgress(100);
        resolve({ url: data.url, id: typeof data.id === "number" ? data.id : null });
        return;
      }

      reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(form);
  });
}
interface ProductFormData {
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  regularPrice: string;
  salePrice: string;
  buyPrice?: string;
  stockStatus: string;
  stockQuantity: string;
  manageStock: boolean;
  /** Every category the product belongs to. The first one is the "primary" (breadcrumbs). */
  categories: { id: number; name: string; slug: string; parent?: number }[];
  sizes: string[];
  colors: string[];
  sizeChart?: SizeChartData;
  sizeChartMetaId?: number;
  /** Preserve Brand / other WC attrs that this form does not edit */
  otherAttributes?: Array<{
    id?: number;
    name: string;
    options: string[];
    visible?: boolean;
    variation?: boolean;
  }>;
  images: ImageItem[];
  slug?: string;
  deliveryInside?: string;
  deliveryInsideId?: number;
  deliveryOutside?: string;
  deliveryOutsideId?: number;
}

interface Props {
  initialData?: Partial<ProductFormData & { id: number }>;
  onSuccess: () => void;
  onCancel?: () => void;
}

const STOCK_OPTIONS = [
  { value: "instock", label: "In Stock" },
  { value: "outofstock", label: "Out of Stock" },
  { value: "onbackorder", label: "On Backorder" },
];

const CLOTHING_SIZES = ["S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["38", "39", "40", "41", "42", "43", "44"];
export function resolveColorStyle(name: string): {
  bg: string;
  isLight: boolean;
  borderClass: string;
  swatchBorder: string;
} {
  const clean = name.trim().toLowerCase();
  const map: Record<string, { bg: string; isLight?: boolean }> = {
    white: { bg: "#ffffff", isLight: true },
    "pure white": { bg: "#ffffff", isLight: true },
    "off-white": { bg: "#fafaf9", isLight: true },
    "off white": { bg: "#fafaf9", isLight: true },
    cream: { bg: "#fffdd0", isLight: true },
    ivory: { bg: "#fffff0", isLight: true },
    beige: { bg: "#f5f5dc", isLight: true },
    snow: { bg: "#fffafa", isLight: true },
    black: { bg: "#171717" },
    red: { bg: "#dc2626" },
    blue: { bg: "#2563eb" },
    navy: { bg: "#1e3a8a" },
    "navy blue": { bg: "#1e3a8a" },
    green: { bg: "#16a34a" },
    "emerald green": { bg: "#059669" },
    emerald: { bg: "#059669" },
    yellow: { bg: "#eab308", isLight: true },
    mustard: { bg: "#ca8a04" },
    pink: { bg: "#ec4899" },
    "baby pink": { bg: "#fbcfe8", isLight: true },
    "dusty rose": { bg: "#d4a373" },
    grey: { bg: "#9ca3af" },
    gray: { bg: "#9ca3af" },
    "light grey": { bg: "#e5e7eb", isLight: true },
    "light gray": { bg: "#e5e7eb", isLight: true },
    brown: { bg: "#78350f" },
    purple: { bg: "#9333ea" },
    orange: { bg: "#ea580c" },
    maroon: { bg: "#400604" },
    olive: { bg: "#65a30d" },
    "sky blue": { bg: "#38bdf8", isLight: true },
    gold: { bg: "#E1B76F", isLight: true },
    silver: { bg: "#cbd5e1", isLight: true },
    charcoal: { bg: "#334155" },
    teal: { bg: "#0d9488" },
    turquoise: { bg: "#06b6d4" },
    peach: { bg: "#fed7aa", isLight: true },
    lavender: { bg: "#e9d5ff", isLight: true },
    magenta: { bg: "#d946ef" },
    khaki: { bg: "#c3b091", isLight: true },
    burgundy: { bg: "#800020" },
    rust: { bg: "#b45309" },
  };

  if (map[clean]) {
    const isLight = !!map[clean].isLight;
    return {
      bg: map[clean].bg,
      isLight,
      borderClass: isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-black/20",
      swatchBorder: isLight
        ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
        : "border border-black/30 shadow-2xs",
    };
  }

  // Hex format #fff or #ffffff
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean)) {
    let hex = clean.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const isLight = lum > 0.72;
    return {
      bg: clean,
      isLight,
      borderClass: isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-black/20",
      swatchBorder: isLight
        ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
        : "border border-black/30 shadow-2xs",
    };
  }

  const isLight =
    clean.includes("white") ||
    clean.includes("light") ||
    clean.includes("cream") ||
    clean.includes("beige") ||
    clean.includes("ivory") ||
    clean.includes("snow") ||
    clean.includes("silver");

  return {
    bg: clean,
    isLight,
    borderClass: isLight ? "border-stone-300 ring-1 ring-stone-200" : "border-stone-300",
    swatchBorder: isLight
      ? "border-2 border-stone-400 ring-1 ring-stone-300 shadow-2xs"
      : "border border-stone-300 shadow-2xs",
  };
}

const COLOR_OPTIONS = [
  "White",
  "Off-White",
  "Cream",
  "Black",
  "Maroon",
  "Red",
  "Navy",
  "Blue",
  "Green",
  "Olive",
  "Yellow",
  "Pink",
  "Grey",
  "Beige",
  "Gold",
  "Brown",
  "Purple",
  "Orange",
  "Sky Blue",
];

const POPULAR_SUGGESTIONS = [
  "White",
  "Off-White",
  "Cream",
  "Maroon",
  "Black",
  "Gold",
  "Navy",
  "Emerald Green",
];

async function cropImageCanvas(
  imageUrl: string,
  mode: "3:4" | "1:1" | "fit",
  align: "top" | "center" | "bottom"
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));

      if (mode === "fit") {
        const targetW = 1200;
        const targetH = 1600;
        canvas.width = targetW;
        canvas.height = targetH;

        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(0, 0, targetW, targetH);

        const imgAspect = img.width / img.height;
        const targetAspect = targetW / targetH;

        let drawW = targetW;
        let drawH = targetH;
        let drawX = 0;
        let drawY = 0;

        if (imgAspect > targetAspect) {
          drawW = targetW;
          drawH = targetW / imgAspect;
          drawX = 0;
          drawY = (targetH - drawH) / 2;
        } else {
          drawH = targetH;
          drawW = targetH * imgAspect;
          drawX = (targetW - drawW) / 2;
          drawY = 0;
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      } else {
        const targetAspect = mode === "3:4" ? 3 / 4 : 1;
        const targetW = 1200;
        const targetH = mode === "3:4" ? 1600 : 1200;
        canvas.width = targetW;
        canvas.height = targetH;

        const imgAspect = img.width / img.height;
        let sX = 0;
        let sY = 0;
        let sW = img.width;
        let sH = img.height;

        if (imgAspect > targetAspect) {
          sW = img.height * targetAspect;
          if (align === "center") {
            sX = (img.width - sW) / 2;
          } else if (align === "top") {
            sX = 0;
          } else {
            sX = img.width - sW;
          }
        } else {
          sH = img.width / targetAspect;
          if (align === "top") {
            sY = 0;
          } else if (align === "center") {
            sY = (img.height - sH) / 2;
          } else {
            sY = img.height - sH;
          }
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, sX, sY, sW, sH, 0, 0, targetW, targetH);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas blob conversion failed"));
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error("Failed to load image for cropping"));
    img.src = imageUrl;
  });
}

export function ProductForm({ initialData, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const { authFetch } = useAuth();
  const MAX_IMAGES = 5;

  // Track images uploaded in this editing session for server cleanup if cancelled
  const sessionUploadedRef = useRef<{ id?: number; url: string }[]>([]);
  const isSubmittedRef = useRef<boolean>(false);
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
  const [selectedCategories, setSelectedCategories] = useState<
    { id: number; name: string; slug: string; parent?: number }[]
  >(initialData?.categories || []);
  const [sizes, setSizes] = useState<string[]>(initialData?.sizes || []);
  const [colors, setColors] = useState<string[]>(initialData?.colors || []);
  const [sizeChart, setSizeChart] = useState<SizeChartData>(
    initialData?.sizeChart ?? emptySizeChart([...DEFAULT_SIZE_CHART_COLUMNS]),
  );
  const [newMeasureField, setNewMeasureField] = useState("");
  const [customColor, setCustomColor] = useState("");
  // Keep existing WP slug on edit until admin resets from name
  const [slugManual, setSlugManual] = useState(Boolean(initialData?.slug));
  const [slug, setSlug] = useState(
    initialData?.slug || slugifyProductName(initialData?.name || "")
  );
  const [images, setImages] = useState<ImageItem[]>(
    initialData?.images || []
  );
  const [deliveryInside, setDeliveryInside] = useState(
    initialData?.deliveryInside !== undefined ? initialData.deliveryInside : ""
  );
  const [deliveryOutside, setDeliveryOutside] = useState(
    initialData?.deliveryOutside !== undefined ? initialData.deliveryOutside : ""
  );
  const [availableCategories, setAvailableCategories] = useState<
    WooCategory[]
  >([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewModalIndex, setPreviewModalIndex] = useState<number | null>(null);
  const [cropModalIndex, setCropModalIndex] = useState<number | null>(null);
  const [cropMode, setCropMode] = useState<"3:4" | "1:1" | "fit">("3:4");
  const [cropAlign, setCropAlign] = useState<"top" | "center" | "bottom">("top");
  const [processingCrop, setProcessingCrop] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingUploadsRef = useRef<PendingUpload[]>([]);
  const uploading = pendingUploads.some(
    (u) => u.phase === "uploading" || u.phase === "processing",
  );

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
    const byId = new Map<number, WooCategory>();
    availableCategories.forEach((c) => {
      byId.set(c.id, c);
      const p = c.parent || 0;
      if (!parentMap.has(p)) parentMap.set(p, []);
      parentMap.get(p)!.push(c);
    });

    const getBreadcrumb = (cat: WooCategory): string => {
      const parts = [cat.name];
      let curr = cat;
      while (curr.parent && byId.has(curr.parent)) {
        curr = byId.get(curr.parent)!;
        parts.unshift(curr.name);
      }
      return parts.join(" → ");
    };

    const result: { id: number; name: string; slug: string; level: number; parent?: number; path: string }[] = [];
    const traverse = (parentId: number, level: number) => {
      const children = parentMap.get(parentId) || [];
      children.sort((a, b) => a.name.localeCompare(b.name));
      children.forEach((c) => {
        result.push({ id: c.id, name: c.name, slug: c.slug, level, parent: c.parent, path: getBreadcrumb(c) });
        traverse(c.id, level + 1);
      });
    };
    traverse(0, 0);
    return result;
  })();

  // Searchable category combobox state
  const [categoryQuery, setCategoryQuery] = useState("");
  const categoryBoxRef = useRef<HTMLDivElement>(null);

  const filteredCategories = (() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return formattedCategories;
    return formattedCategories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || c.path.toLowerCase().includes(q)
    );
  })();

  const isCategorySelected = (id: number) => selectedCategories.some((c) => c.id === id);

  const toggleCategory = (cat: { id: number; name: string; slug: string; parent?: number }) => {
    setSelectedCategories((prev) =>
      prev.some((c) => c.id === cat.id)
        ? prev.filter((c) => c.id !== cat.id)
        : [...prev, { id: cat.id, name: cat.name, slug: cat.slug, parent: cat.parent || 0 }],
    );
  };

  /** Move a category to the front — the first one is the primary (used for breadcrumbs). */
  const makePrimaryCategory = (id: number) => {
    setSelectedCategories((prev) => {
      const target = prev.find((c) => c.id === id);
      return target ? [target, ...prev.filter((c) => c.id !== id)] : prev;
    });
  };

  const clearCategories = () => {
    setSelectedCategories([]);
    setCategoryQuery("");
  };

  const primaryCategory = selectedCategories[0];

  const toggleSize = (s: string) =>
    setSizes((prev) => {
      if (prev.includes(s)) {
        setSizeChart((chart) => {
          const rows = { ...chart.rows };
          delete rows[s];
          return { ...chart, rows };
        });
        return prev.filter((x) => x !== s);
      }
      return [...prev, s];
    });

  const setMeasureValue = (size: string, column: string, value: string) => {
    setSizeChart((prev) => ({
      ...prev,
      rows: {
        ...prev.rows,
        [size]: {
          ...(prev.rows[size] || {}),
          [column]: value,
        },
      },
    }));
  };

  const addMeasureColumn = () => {
    const label = newMeasureField.trim();
    if (!label) return;
    const exists = sizeChart.columns.some(
      (c) => c.toLowerCase() === label.toLowerCase(),
    );
    if (exists) {
      setNewMeasureField("");
      return;
    }
    setSizeChart((prev) => ({
      ...prev,
      columns: [...prev.columns, label],
    }));
    setNewMeasureField("");
  };

  const removeMeasureColumn = (column: string) => {
    setSizeChart((prev) => {
      if (prev.columns.length <= 1) {
        // Keep at least the default measurement fields
        return emptySizeChart([...DEFAULT_SIZE_CHART_COLUMNS]);
      }
      const columns = prev.columns.filter((c) => c !== column);
      const rows: SizeChartData["rows"] = {};
      for (const [size, vals] of Object.entries(prev.rows)) {
        const next = { ...vals };
        delete next[column];
        rows[size] = next;
      }
      return { columns, rows };
    });
  };

  const fillDefaultShirtMeasurements = () => {
    setSizeChart((prev) => {
      const columns =
        prev.columns.length > 0
          ? prev.columns
          : [...DEFAULT_SIZE_CHART_COLUMNS];
      const defaults: Record<string, Record<string, string>> = {
        S: { Chest: '38"', Length: '27"', Sleeve: '8"' },
        M: { Chest: '40"', Length: '28"', Sleeve: '8.5"' },
        L: { Chest: '42"', Length: '29"', Sleeve: '9"' },
        XL: { Chest: '44"', Length: '30"', Sleeve: '9.5"' },
        XXL: { Chest: '46"', Length: '31"', Sleeve: '10"' },
      };
      const rows = { ...prev.rows };
      for (const s of sizes) {
        const defKey = Object.keys(defaults).find(
          (k) => k.toUpperCase() === s.toUpperCase(),
        );
        if (!defKey) continue;
        const defRow = defaults[defKey];
        rows[s] = {
          ...(rows[s] || {}),
          ...Object.fromEntries(
            columns.map((col) => {
              const defCol = Object.keys(defRow).find(
                (k) => k.toLowerCase() === col.toLowerCase(),
              );
              return [
                col,
                rows[s]?.[col] || (defCol ? defRow[defCol] : "") || "",
              ];
            }),
          ),
        };
      }
      return { columns, rows };
    });
  };

  const toggleColor = (c: string) =>
    setColors((prev) => {
      const exists = prev.some((x) => x.toLowerCase() === c.toLowerCase());
      if (exists) return prev.filter((x) => x.toLowerCase() !== c.toLowerCase());
      return [...prev, c];
    });

  const addCustomColor = (colorToAdd?: string) => {
    const raw = (colorToAdd !== undefined ? colorToAdd : customColor).trim();
    if (!raw) return;
    const formatted =
      raw.length > 1 && !raw.startsWith("#")
        ? raw.charAt(0).toUpperCase() + raw.slice(1)
        : raw;
    const exists = colors.some((c) => c.toLowerCase() === raw.toLowerCase());
    if (!exists) setColors((prev) => [...prev, formatted]);
    setCustomColor("");
  };

  // Keep a ref in sync so unmount can revoke blob URLs safely
  useEffect(() => {
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  // Revoke blob previews for in-flight uploads on unmount
  useEffect(() => {
    return () => {
      pendingUploadsRef.current.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });
    };
  }, []);

  // Cleanup unsaved uploaded images when unmounting or navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isSubmittedRef.current && sessionUploadedRef.current.length > 0) {
        const payload = JSON.stringify({ items: sessionUploadedRef.current });
        void fetch("/api/admin/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
          credentials: "include",
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (!isSubmittedRef.current && sessionUploadedRef.current.length > 0) {
        const toDelete = [...sessionUploadedRef.current];
        sessionUploadedRef.current = [];
        void fetch("/api/admin/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: toDelete }),
          keepalive: true,
          credentials: "include",
        });
      }
    };
  }, []);

  const handleCancel = async () => {
    if (sessionUploadedRef.current.length > 0) {
      const toDelete = [...sessionUploadedRef.current];
      sessionUploadedRef.current = [];
      try {
        await authFetch("/api/admin/upload", {
          method: "DELETE",
          body: JSON.stringify({ items: toDelete }),
        });
      } catch {
        // ignore
      }
    }
    if (onCancel) {
      onCancel();
    } else {
      router.push("/admin/products");
    }
  };

  const updatePending = (
    id: string,
    patch: Partial<PendingUpload>,
  ) => {
    setPendingUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    );
  };

  const removePending = (id: string) => {
    setPendingUploads((prev) => {
      const target = prev.find((u) => u.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((u) => u.id !== id);
    });
  };

  const handleImageUpload = async (files: FileList) => {
    setError("");
    const currentCount = images.length + pendingUploads.filter(
      (u) => u.phase === "uploading" || u.phase === "processing",
    ).length;
    const remainingSlots = MAX_IMAGES - currentCount;

    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_IMAGES} images allowed per product.`);
      return;
    }

    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) {
      setError("Please select image files only.");
      return;
    }

    let filesToProcess = fileList;
    if (fileList.length > remainingSlots) {
      filesToProcess = fileList.slice(0, remainingSlots);
      setError(
        `Only ${remainingSlots} photo(s) will upload. Maximum is ${MAX_IMAGES} photos per product.`,
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

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    // Upload all selected files in parallel — each shows its own %
    await Promise.all(
      batch.map(async (item, index) => {
        const file = filesToProcess[index];
        try {
          const { url, id: wpId } = await uploadImageWithProgress(
            file,
            (pct) => updatePending(item.id, { progress: pct, phase: "uploading" }),
            () => updatePending(item.id, { progress: 95, phase: "processing" }),
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
      }),
    );
  };

  const removeImage = async (i: number) => {
    const img = images[i];
    if (!img) return;

    // Remove from UI immediately
    setImages((prev) => prev.filter((_, idx) => idx !== i));

    // Remove from session tracking if present
    sessionUploadedRef.current = sessionUploadedRef.current.filter(
      (item) => (item.id && item.id === img.wpId) || item.url === img.src
    );

    // Immediately delete from WordPress media library and server storage
    if (img.wpId || img.src) {
      try {
        await authFetch("/api/admin/upload", {
          method: "DELETE",
          body: JSON.stringify({ id: img.wpId, url: img.src }),
        });
      } catch (err) {
        console.error("Failed to delete image:", err);
      }
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

  const applyCrop = async () => {
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

      // Delete the previous uncropped version if it was uploaded in this session
      const oldImg = targetImg;
      if (oldImg) {
        sessionUploadedRef.current = sessionUploadedRef.current.filter(
          (item) => (item.id && item.id === oldImg.wpId) || item.url === oldImg.src
        );
        void authFetch("/api/admin/upload", {
          method: "DELETE",
          body: JSON.stringify({ id: oldImg.wpId, url: oldImg.src }),
        });
      }

      // Track new cropped image in this session
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

    // Always send Size + Color (empty options clears them). Keep other attrs (Brand, etc.).
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

    // Build WooCommerce-compatible payload
    const wcBody: Record<string, unknown> = {
      name,
      slug: productSlug,
      sku: sku || undefined,
      // WooCommerce short_description + description — keep pasted formatting as HTML
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
      // Include wpId (id) so WooCommerce re-uses the existing media attachment
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
      meta_data: [
        ...(buyPrice ? [{ key: "_buy_price", value: buyPrice }] : []),
        { ...(initialData?.deliveryInsideId ? { id: initialData.deliveryInsideId } : {}), key: "_delivery_inside", value: deliveryInside },
        { ...(initialData?.deliveryOutsideId ? { id: initialData.deliveryOutsideId } : {}), key: "_delivery_outside", value: deliveryOutside },
        {
          ...(initialData?.sizeChartMetaId ? { id: initialData.sizeChartMetaId } : {}),
          key: SIZE_CHART_META_KEY,
          value: (() => {
            // Only keep rows for currently selected sizes
            const pruned: SizeChartData = {
              columns:
                sizeChart.columns.length > 0
                  ? sizeChart.columns
                  : [...DEFAULT_SIZE_CHART_COLUMNS],
              rows: Object.fromEntries(
                sizes
                  .filter((s) => sizeChart.rows[s])
                  .map((s) => [s, sizeChart.rows[s]]),
              ),
            };
            return sizeChartHasValues(pruned)
              ? serializeSizeChart(pruned)
              : "";
          })(),
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column — Main Info ────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Product Name & Basic Information */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-[#400604]" />
              <h3 className="text-[14px] font-bold text-stone-800">
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
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] text-stone-800 focus:outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#400604]/10 transition"
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
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] text-stone-800 focus:outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#400604]/10 transition"
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
                      className="ml-2 font-semibold normal-case tracking-normal text-[#400604] hover:underline"
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
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] font-mono text-stone-800 focus:outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#400604]/10 transition"
                    placeholder="product-name-in-url"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Categories (multi-select) ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#400604]">
                  <FolderPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-stone-900">Categories *</h3>
                  <p className="text-[11px] text-stone-500">
                    Choose every collection this product should appear in — it shows in all of them on the website.
                  </p>
                </div>
              </div>
              {selectedCategories.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check className="h-3 w-3" /> {selectedCategories.length} selected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Select at least one
                </span>
              )}
            </div>

            {/* Selected categories */}
            {selectedCategories.length > 0 ? (
              <div className="mb-4 rounded-xl border border-amber-200/80 bg-[#FAF7F2] p-3.5">
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((cat, i) => {
                    const path = formattedCategories.find((c) => c.id === cat.id)?.path || cat.name;
                    return (
                      <span
                        key={cat.id}
                        title={path}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#400604]/20 bg-white pl-2.5 pr-1 py-1 text-[12px] font-semibold text-[#400604] shadow-xs"
                      >
                        {i === 0 ? (
                          <span className="rounded bg-[#400604] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#E1B76F]">
                            Primary
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => makePrimaryCategory(cat.id)}
                            className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-400 hover:bg-stone-100 hover:text-[#400604]"
                            title="Make this the primary category"
                          >
                            Make primary
                          </button>
                        )}
                        {cat.name}
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove ${cat.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-stone-500">
                  <span>
                    Primary: <strong className="text-stone-700">{formattedCategories.find((c) => c.id === primaryCategory?.id)?.path || primaryCategory?.name}</strong>
                  </span>
                  <button type="button" onClick={clearCategories} className="font-semibold text-rose-600 hover:underline">
                    Clear all
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3.5 text-[12px] text-amber-800 flex items-center gap-2.5">
                <Tag className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Pick one or more categories below so this product appears in the right collections.</span>
              </div>
            )}

            {/* Searchable multi-select list */}
            <div ref={categoryBoxRef}>
              <div className="relative mb-2">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  placeholder="Search categories (e.g. Panjabi, Saree, Women)…"
                  className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-9 py-2.5 text-[13px] text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#400604]/10 transition"
                />
                {categoryQuery && (
                  <button
                    type="button"
                    onClick={() => setCategoryQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-stone-200 bg-white py-1">
                {availableCategories.length === 0 ? (
                  <div className="px-4 py-4 text-center text-[13px] text-stone-400">Loading categories…</div>
                ) : filteredCategories.length === 0 ? (
                  <div className="px-4 py-4 text-center text-[13px] text-stone-400">No matching categories found</div>
                ) : (
                  filteredCategories.map((cat) => {
                    const checked = isCategorySelected(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-[13px] transition hover:bg-stone-50 ${
                          checked ? "bg-amber-50/70 font-semibold text-[#400604]" : "text-stone-700"
                        }`}
                        style={{ paddingLeft: categoryQuery ? undefined : 16 + cat.level * 20 }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(cat)}
                          className="h-4 w-4 shrink-0 rounded border-stone-300 accent-[#400604]"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {cat.name}
                          {categoryQuery && cat.level > 0 && (
                            <span className="ml-2 text-[11px] font-normal text-stone-400">{cat.path}</span>
                          )}
                        </span>
                        {cat.level === 0 && (
                          <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-500">
                            Main
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-2 text-[11px] text-stone-400">
                Tip: a product in a sub-category automatically shows under its parent collection too — you only need to tick the parent if you want it listed there on its own.
              </p>
            </div>

            {/* Storefront routing preview */}
            <div className="mt-4 rounded-xl bg-stone-50 border border-stone-200 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-3.5 w-3.5 text-[#400604]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                  Storefront URLs &amp; Category Routing
                </span>
              </div>
              <div className="space-y-1.5 text-[11.5px]">
                <div className="flex items-start gap-2">
                  <span className="text-stone-400 font-medium shrink-0 w-24">Product URL:</span>
                  <code className="text-[#400604] font-mono break-all font-semibold">
                    {getProductPageUrl(slugManual ? slug || name : name, { fromName: true })}
                  </code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-stone-400 font-medium shrink-0 w-24">Appears in:</span>
                  <span className="text-stone-700 break-all">
                    {selectedCategories.length
                      ? selectedCategories.map((c) => `/category/${c.slug}`).join("  ·  ")
                      : "— Select a category above —"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-stone-400 font-medium shrink-0 w-24">Breadcrumbs:</span>
                  <span className="text-stone-600">
                    Home &gt; {primaryCategory?.name || "Unassigned"} &gt; {name || "Product Name"}
                  </span>
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

          {/* Images */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-purple-500" />
                <h3 className="text-[14px] font-bold text-gray-700">
                  Product Images & Angles
                </h3>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  images.length + pendingUploads.filter((u) => u.phase !== "error").length >= MAX_IMAGES
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-purple-50 text-purple-700 border-purple-100"
                }`}
              >
                {images.length}
                {pendingUploads.some((u) => u.phase === "uploading" || u.phase === "processing")
                  ? ` +${pendingUploads.filter((u) => u.phase === "uploading" || u.phase === "processing").length}`
                  : ""}{" "}
                / {MAX_IMAGES}{" "}
                {images.length >= MAX_IMAGES
                  ? "(Max Limit Reached)"
                  : uploading
                    ? "Uploading…"
                    : "Photos"}
              </span>
            </div>

            {/* Recommended Specifications Banner */}
            <div className="mb-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50/60 border border-purple-100 p-4 text-[12px]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="font-bold text-purple-900 text-[13px]">
                  Recommended Specifications for Fashion & Apparel:
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-700 mb-2.5">
                <div className="bg-white rounded-xl p-2.5 border border-purple-100/80 shadow-xs">
                  <span className="text-purple-600 font-bold block mb-0.5">📐 Aspect Ratio</span>
                  <strong className="text-gray-900 font-extrabold text-[12px]">3:4 Portrait</strong>
                  <p className="text-[10px] text-gray-500 mt-0.5">Fashion industry standard (Zara, ASOS)</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-purple-100/80 shadow-xs">
                  <span className="text-purple-600 font-bold block mb-0.5">📏 Ideal Dimensions</span>
                  <strong className="text-gray-900 font-extrabold text-[12px]">1200 × 1600 px</strong>
                  <p className="text-[10px] text-gray-500 mt-0.5">Minimum 900 × 1200 px (Crisp zoom)</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-purple-100/80 shadow-xs">
                  <span className="text-purple-600 font-bold block mb-0.5">📁 Format & Size</span>
                  <strong className="text-gray-900 font-extrabold text-[12px]">WebP or JPG</strong>
                  <p className="text-[10px] text-gray-500 mt-0.5">Under 2.5 MB for instant mobile load</p>
                </div>
              </div>
              <p className="text-[11px] text-purple-900/80 leading-relaxed bg-white/60 p-2 rounded-lg border border-purple-100/60">
                💡 <strong>Why 3:4?</strong> Shirts, dresses, and clothing are vertical. 3:4 portrait photos prevent collars and bottom hems from being cut off. You can use the <strong>&quot;Crop / Fit&quot;</strong> button on any photo below to align it!
              </p>
            </div>

            {/* Images List (3:4 Aspect Ratio Cards) */}
            <div className="flex flex-wrap gap-3.5">
              {images.map((img, i) => (
                <div
                  key={`${img.wpId ?? img.src}-${i}`}
                  className="relative w-28 aspect-[3/4] rounded-xl overflow-hidden border-2 border-purple-100 bg-[#f8f9fa] shadow-sm group transition hover:border-purple-300"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="h-full w-full object-contain object-center"
                  />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 rounded-md bg-purple-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                      Cover
                    </span>
                  )}

                  {/* Hover Actions Overlay */}
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-1.5 transition duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => moveImage(i, "left")}
                            className="h-5 w-5 rounded bg-white/20 text-white hover:bg-white/40 flex items-center justify-center transition"
                            title="Move left"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </button>
                        )}
                        {i < images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveImage(i, "right")}
                            className="h-5 w-5 rounded bg-white/20 text-white hover:bg-white/40 flex items-center justify-center transition"
                            title="Move right"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="h-5 w-5 rounded bg-red-500/90 text-white hover:bg-red-600 flex items-center justify-center transition"
                        title="Remove image"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewModalIndex(i)}
                        className="w-full rounded bg-white/20 py-1 text-[10px] font-semibold text-white hover:bg-white/30 flex items-center justify-center gap-1 transition"
                      >
                        <Eye className="h-3 w-3" /> Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCropModalIndex(i);
                          setCropMode("3:4");
                          setCropAlign("top");
                        }}
                        className="w-full rounded bg-purple-600 py-1 text-[10px] font-semibold text-white hover:bg-purple-700 flex items-center justify-center gap-1 transition shadow-sm"
                      >
                        <Crop className="h-3 w-3" /> Crop / Fit
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* In-progress / failed uploads — each with its own % bar */}
              {pendingUploads.map((item) => (
                <div
                  key={item.id}
                  className={`relative w-28 aspect-[3/4] rounded-xl overflow-hidden border-2 bg-[#f8f9fa] shadow-sm ${
                    item.phase === "error"
                      ? "border-red-300"
                      : "border-purple-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="h-full w-full object-cover object-center opacity-50"
                  />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-black/10 p-2">
                    {item.phase === "error" ? (
                      <>
                        <p className="text-[9px] font-bold text-red-200 leading-tight line-clamp-2 mb-1.5">
                          {item.error || "Upload failed"}
                        </p>
                        <button
                          type="button"
                          onClick={() => removePending(item.id)}
                          className="w-full rounded bg-red-500/90 py-1 text-[10px] font-bold text-white hover:bg-red-600 transition"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold text-white/90 truncate pr-1">
                            {item.phase === "processing" ? "Saving…" : "Uploading"}
                          </span>
                          <span className="text-[10px] font-black text-white tabular-nums">
                            {item.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-[width] duration-150 ease-out ${
                              item.phase === "processing"
                                ? "bg-amber-300 animate-pulse"
                                : "bg-purple-400"
                            }`}
                            style={{ width: `${Math.max(item.progress, 2)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[8px] text-white/60 truncate">{item.name}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Upload Button or Max Limit State */}
              {images.length + pendingUploads.filter((u) => u.phase !== "error").length < MAX_IMAGES ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-28 aspect-[3/4] rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/30 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-purple-400 hover:bg-purple-50/60 hover:text-purple-600 transition cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-purple-600">
                    <Upload className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-700">Add Photo</span>
                  <span className="text-[9px] text-gray-400">3:4 Portrait</span>
                </button>
              ) : images.length >= MAX_IMAGES ? (
                <div className="w-28 aspect-[3/4] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-400 p-2 text-center select-none">
                  <Check className="h-5 w-5 text-emerald-500" />
                  <span className="text-[11px] font-bold text-gray-700">Max Limit</span>
                  <span className="text-[9px] text-gray-400 leading-tight">5/5 photos added</span>
                </div>
              ) : null}
            </div>

            {/* Overall batch progress when multiple files uploading */}
            {uploading && pendingUploads.length > 0 && (
              <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50/50 px-3.5 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-purple-800">
                    Uploading {pendingUploads.filter((u) => u.phase !== "error").length} photo
                    {pendingUploads.filter((u) => u.phase !== "error").length !== 1 ? "s" : ""}…
                  </span>
                  <span className="text-[11px] font-black text-purple-700 tabular-nums">
                    {Math.round(
                      pendingUploads
                        .filter((u) => u.phase !== "error")
                        .reduce((sum, u) => sum + u.progress, 0) /
                        Math.max(1, pendingUploads.filter((u) => u.phase !== "error").length),
                    )}
                    % overall
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white overflow-hidden border border-purple-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-[width] duration-200 ease-out"
                    style={{
                      width: `${Math.round(
                        pendingUploads
                          .filter((u) => u.phase !== "error")
                          .reduce((sum, u) => sum + u.progress, 0) /
                          Math.max(1, pendingUploads.filter((u) => u.phase !== "error").length),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              disabled={images.length >= MAX_IMAGES}
              className="hidden"
              onChange={(e) =>
                e.target.files && void handleImageUpload(e.target.files)
              }
            />

            {/* ── Live Details Page Preview Modal ───────────────────────── */}
            {previewModalIndex !== null && images[previewModalIndex] && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                onClick={() => setPreviewModalIndex(null)}
              >
                <div
                  className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b pb-3 mb-3">
                    <div>
                      <h4 className="text-[14px] font-bold text-gray-900">
                        Customer Details Page Preview
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        This is exactly how this photo looks on the product page
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewModalIndex(null)}
                      className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Simulated 3:4 Product Details Frame */}
                  <div className="relative aspect-[3/4] w-full max-w-[320px] mx-auto overflow-hidden rounded-xl border border-gray-200 bg-[#f8f9fa] shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={images[previewModalIndex].src}
                      alt={images[previewModalIndex].alt}
                      className="h-full w-full object-contain object-center"
                    />
                    <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white shadow backdrop-blur-sm">
                      3:4 Full View
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-2 border-t text-[11px]">
                    <span className="text-gray-500">
                      Photo {previewModalIndex + 1} of {images.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCropModalIndex(previewModalIndex);
                        setPreviewModalIndex(null);
                        setCropMode("3:4");
                        setCropAlign("top");
                      }}
                      className="rounded-lg bg-purple-600 px-3 py-1.5 font-bold text-white hover:bg-purple-700 transition"
                    >
                      Adjust / Crop This Photo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Interactive Crop & Fit Modal ──────────────────────────── */}
            {cropModalIndex !== null && images[cropModalIndex] && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
                onClick={() => !processingCrop && setCropModalIndex(null)}
              >
                <div
                  className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div>
                      <h4 className="text-[15px] font-bold text-gray-900 flex items-center gap-1.5">
                        <Crop className="h-4 w-4 text-purple-600" />
                        Crop & Frame for Product Details Page
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Adjust framing so the garment displays with full visibility
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={processingCrop}
                      onClick={() => setCropModalIndex(null)}
                      className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Mode Options */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Framing Mode
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setCropMode("3:4")}
                          className={`rounded-xl border p-2 text-center text-[12px] font-bold transition ${
                            cropMode === "3:4"
                              ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs ring-1 ring-purple-500"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          3:4 Portrait
                          <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                            Recommended
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCropMode("fit")}
                          className={`rounded-xl border p-2 text-center text-[12px] font-bold transition ${
                            cropMode === "fit"
                              ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs ring-1 ring-purple-500"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          Fit Full Photo
                          <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                            No Crop (Soft Edge)
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCropMode("1:1")}
                          className={`rounded-xl border p-2 text-center text-[12px] font-bold transition ${
                            cropMode === "1:1"
                              ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs ring-1 ring-purple-500"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          1:1 Square
                          <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                            Square crop
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Alignment options when cropping */}
                    {cropMode !== "fit" && (
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                          Crop Alignment (Focus Area)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setCropAlign("top")}
                            className={`rounded-xl border p-2 text-[11px] font-bold transition ${
                              cropAlign === "top"
                                ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            Top (Collar & Neck)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCropAlign("center")}
                            className={`rounded-xl border p-2 text-[11px] font-bold transition ${
                              cropAlign === "center"
                                ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            Center (Balanced)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCropAlign("bottom")}
                            className={`rounded-xl border p-2 text-[11px] font-bold transition ${
                              cropAlign === "bottom"
                                ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            Bottom
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Visual Preview Box */}
                  <div className="relative aspect-[3/4] w-full max-w-[260px] mx-auto overflow-hidden rounded-xl border border-gray-200 bg-[#f8f9fa] shadow-inner mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={images[cropModalIndex].src}
                      alt={images[cropModalIndex].alt}
                      className={`h-full w-full ${
                        cropMode === "fit"
                          ? "object-contain"
                          : cropAlign === "top"
                          ? "object-cover object-top"
                          : cropAlign === "bottom"
                          ? "object-cover object-bottom"
                          : "object-cover object-center"
                      }`}
                    />
                    <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white shadow backdrop-blur-sm">
                      {cropMode === "fit"
                        ? "Fit (Contain)"
                        : `3:4 (${cropAlign.toUpperCase()})`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      disabled={processingCrop}
                      onClick={() => setCropModalIndex(null)}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={processingCrop}
                      onClick={applyCrop}
                      className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-[12px] font-bold text-white shadow hover:bg-purple-700 transition disabled:opacity-50"
                    >
                      {processingCrop ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing & Uploading…</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Apply & Save</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">
                  Sale Price (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] text-stone-800 focus:outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#400604]/10 transition"
                  placeholder="Leave empty if no sale"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-500">
                    Buy Price / Cost (৳)
                  </label>
                  <span className="text-[10px] text-stone-400">Inventory Cost</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] text-stone-800 focus:outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#400604]/10 transition"
                  placeholder="e.g. 950 (cost per unit)"
                />
                <p className="mt-1 text-[11px] text-stone-400 leading-tight">
                  Your purchase or production cost. Powers stock valuation &amp; margins.
                </p>
              </div>

              {/* Live Profit Margin Preview */}
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

          {/* Delivery */}
          <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-purple-500" />
              <h3 className="text-[14px] font-bold text-gray-700">Delivery Charges</h3>
            </div>

            <div className="space-y-3">
              <p className="text-[11.5px] text-gray-500 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                💡 <strong>Leave both empty</strong> to use the store-wide delivery rates (Settings → Shipping). Typing <strong>0</strong> makes delivery <strong>Free</strong> for this product only — don&apos;t enter 0 to &quot;remove&quot; a rate.
              </p>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Inside Dhaka (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={deliveryInside}
                  onChange={(e) => setDeliveryInside(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  placeholder="Empty = store rate · 0 = Free for this product"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Outside Dhaka (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={deliveryOutside}
                  onChange={(e) => setDeliveryOutside(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                  placeholder="Empty = store rate · 0 = Free for this product"
                />
              </div>
            </div>
          </div>

          {/* Stock & Inventory Valuation */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#400604]/10 border border-[#E1B76F]/30 flex items-center justify-center text-[#400604]">
                  <Boxes className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-stone-800">
                    Inventory &amp; Stock
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Quantity, fulfillment status &amp; valuation
                  </p>
                </div>
              </div>
              {/* Dynamic Live Status Badge */}
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
              {/* Stock Quantity - ALWAYS VISIBLE */}
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
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-stone-800 focus:outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#400604]/10 transition"
                    placeholder="Enter quantity (e.g. 25)"
                  />
                  {stockQuantity && (
                    <button
                      type="button"
                      onClick={() => handleStockQuantityChange("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-stone-400 hover:text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Add Pills */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-stone-400 font-medium mr-1">Quick Add:</span>
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
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-stone-200 bg-stone-50 hover:bg-white hover:border-[#400604] hover:text-[#400604] text-stone-600 transition shadow-2xs"
                    >
                      {pill.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleStockQuantityChange("0")}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 transition"
                    title="Mark quantity as 0 (Out of stock)"
                  >
                    Set 0
                  </button>
                </div>
              </div>

              {/* Stock Status Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">
                  Stock Status
                </label>
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] font-medium text-stone-700 focus:outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#400604]/10 transition"
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
                  <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#400604]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#400604]"></div>
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

              {/* Industry-Level Inventory Valuation & Economics Card */}
              {(() => {
                const qty = parseInt(stockQuantity || "0", 10);
                const costPerUnit = parseFloat(buyPrice || "0");
                const retailPerUnit = parseFloat(salePrice || regularPrice || "0");

                if (costPerUnit > 0 || (qty > 0 && retailPerUnit > 0)) {
                  const totalCostVal = costPerUnit * (qty > 0 ? qty : 1);
                  const totalRetailVal = retailPerUnit * (qty > 0 ? qty : 1);
                  const unitGrossProfit = retailPerUnit > 0 && costPerUnit > 0 ? retailPerUnit - costPerUnit : 0;
                  const marginPct = retailPerUnit > 0 ? ((unitGrossProfit / retailPerUnit) * 100).toFixed(1) : "0";

                  return (
                    <div className="mt-3 rounded-2xl bg-gradient-to-br from-amber-50/60 via-stone-50 to-amber-50/30 border border-amber-200/80 p-3.5 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-600 border-b border-amber-200/60 pb-2">
                        <span className="flex items-center gap-1.5 text-[#400604]">
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
                        {/* Cost Basis (Capital Invested) */}
                        <div className="bg-white/80 rounded-xl p-2.5 border border-stone-200/70 shadow-2xs">
                          <p className="text-[10px] uppercase font-bold text-stone-400">
                            {qty > 0 ? "Total Stock Cost" : "Unit Buy Price"}
                          </p>
                          <p className="text-[14px] font-extrabold text-[#400604] mt-0.5">
                            ৳{(qty > 0 ? totalCostVal : costPerUnit).toLocaleString()}
                          </p>
                          {qty > 0 && costPerUnit > 0 && (
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              ৳{costPerUnit.toLocaleString()} × {qty} pcs
                            </p>
                          )}
                        </div>

                        {/* Retail Revenue Value */}
                        <div className="bg-white/80 rounded-xl p-2.5 border border-stone-200/70 shadow-2xs">
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

                      {/* Profit & Margin Metrics */}
                      {costPerUnit > 0 && retailPerUnit > 0 && (
                        <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-200/70 flex items-center justify-between text-[12px]">
                          <div>
                            <span className="font-bold text-stone-700">Projected Gross Profit:</span>
                            <span className="ml-1 text-[11px] font-bold text-emerald-600">
                              ({marginPct}% margin)
                            </span>
                          </div>
                          <span className="font-black text-emerald-700 text-[13px]">
                            ৳{(qty > 0 ? (totalRetailVal - totalCostVal) : unitGrossProfit).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }

                // If Buy Price is not yet entered
                return (
                  <div className="rounded-xl bg-amber-50/40 border border-amber-200/60 p-2.5 text-[11.5px] text-stone-600 leading-relaxed flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-[#E1B76F] shrink-0 mt-0.5" />
                    <span>
                      <strong>Inventory Tip:</strong> Enter your <strong>Buy Price</strong> in the Pricing card to unlock real-time warehouse valuation, total capital invested, and profit margins.
                    </span>
                  </div>
                );
              })()}
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

            {/* Optional size measurements — stored as WC meta _angkon_size_chart */}
            {sizes.length > 0 && (
              <div className="mt-5 pt-5 border-t border-purple-50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-bold text-gray-700">
                      Size Measurements
                      <span className="ml-1.5 font-medium text-gray-400">(optional)</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Shown on the product page Size guide. Add custom fields for this product.
                    </p>
                  </div>
                  {sizes.some((s) =>
                    CLOTHING_SIZES.some((c) => c.toUpperCase() === s.toUpperCase()),
                  ) ? (
                    <button
                      type="button"
                      onClick={fillDefaultShirtMeasurements}
                      className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 underline underline-offset-2"
                    >
                      Fill shirt defaults
                    </button>
                  ) : null}
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full min-w-[360px] text-left text-[12px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2.5 font-bold text-gray-700 w-16">Size</th>
                        {sizeChart.columns.map((col) => (
                          <th key={col} className="px-2 py-2.5 font-bold text-gray-700">
                            <div className="flex items-center gap-1">
                              <span className="truncate">{col}</span>
                              <button
                                type="button"
                                onClick={() => removeMeasureColumn(col)}
                                className="text-gray-300 hover:text-red-500 transition"
                                title={`Remove ${col}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sizes.map((s) => (
                        <tr key={s} className="border-b border-gray-100 last:border-0">
                          <td className="px-3 py-2 font-bold text-gray-800">{s}</td>
                          {sizeChart.columns.map((col) => (
                            <td key={col} className="px-2 py-1.5">
                              <input
                                value={sizeChart.rows[s]?.[col] ?? ""}
                                onChange={(e) =>
                                  setMeasureValue(s, col, e.target.value)
                                }
                                placeholder='e.g. 40"'
                                className="w-full min-w-[4.5rem] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <input
                    value={newMeasureField}
                    onChange={(e) => setNewMeasureField(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMeasureColumn();
                      }
                    }}
                    placeholder="New field (e.g. Shoulder, Waist)"
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
                  />
                  <button
                    type="button"
                    onClick={addMeasureColumn}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 border border-purple-100 px-3.5 text-[12px] font-bold text-purple-700 hover:bg-purple-100 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Measurement
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Colors & Fabric Swatches Studio */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-[#400604]" />
                <h3 className="text-[14px] font-bold text-stone-800">
                  Product Colors &amp; Fabric Swatches
                </h3>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  colors.length > 0
                    ? "bg-[#400604]/5 text-[#400604] border-[#400604]/20"
                    : "bg-stone-50 text-stone-500 border-stone-200"
                }`}
              >
                {colors.length} {colors.length === 1 ? "Color" : "Colors"} Selected
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mb-4 leading-relaxed">
              Select all available colors for this product or enter custom shades. Every color displays an authentic visual swatch with guaranteed high-contrast borders for light tones like White.
            </p>

            {/* 1. Active Selected Colors Tray — Always Visible with Physical Swatch & 1-Click Remove */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                    Active Selected Colors
                  </span>
                  <span className="rounded-full bg-[#400604] px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                    {colors.length}
                  </span>
                </div>
                {colors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setColors([])}
                    className="text-[11px] font-semibold text-stone-400 hover:text-red-600 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {colors.length === 0 ? (
                <p className="text-[12px] text-stone-400 italic">
                  No colors selected yet. Click any preset below, use the color picker, or type &quot;White&quot;, &quot;Maroon&quot;, etc.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const style = resolveColorStyle(c);
                    return (
                      <span
                        key={c}
                        className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-xl text-[12px] font-bold border border-stone-200 bg-white text-stone-800 shadow-2xs transition group hover:border-[#400604]/40"
                      >
                        <span
                          className={`h-4 w-4 rounded-full shrink-0 ${style.swatchBorder}`}
                          style={{ backgroundColor: style.bg }}
                          title={`Color swatch: ${c}`}
                        />
                        <span className="font-semibold">{c}</span>
                        <button
                          type="button"
                          onClick={() => toggleColor(c)}
                          className="h-5 w-5 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-stone-100 transition cursor-pointer"
                          title={`Remove ${c}`}
                          aria-label={`Remove ${c}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Popular Fashion Presets Grid */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                Fashion &amp; Ethnic Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => {
                  const checked = colors.some(
                    (x) => x.toLowerCase() === c.toLowerCase(),
                  );
                  const style = resolveColorStyle(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleColor(c)}
                      className={`inline-flex items-center gap-2 h-9 px-3 rounded-xl text-[12px] font-semibold border cursor-pointer transition select-none ${
                        checked
                          ? "bg-[#400604] border-[#400604] text-white shadow-xs ring-1 ring-[#E1B76F]"
                          : "bg-stone-50/70 border-stone-200 text-stone-700 hover:border-[#400604]/50 hover:bg-stone-100/70"
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 rounded-full shrink-0 ${
                          checked && style.isLight
                            ? "border-2 border-stone-200 shadow-2xs"
                            : style.swatchBorder
                        }`}
                        style={{ backgroundColor: style.bg }}
                      />
                      <span>{c}</span>
                      {checked && (
                        <Check className="h-3.5 w-3.5 text-[#E1B76F] stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Add Custom Color Input with Live Preview + Native Color Picker */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Type Any Custom Color or Hex Code
              </label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomColor();
                      }
                    }}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#400604]/10 transition"
                    placeholder="Type color e.g. White, Off-White, Ivory, Lavender, #FFFFFF…"
                  />
                </div>

                {/* Eyedropper / Color Picker Modal */}
                <label
                  className="relative flex items-center justify-center h-10 w-10 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 hover:text-[#400604] cursor-pointer transition shadow-2xs shrink-0"
                  title="Pick exact shade from color spectrum"
                >
                  <Palette className="h-4 w-4" />
                  <input
                    type="color"
                    defaultValue="#ffffff"
                    onChange={(e) => {
                      const hex = e.target.value;
                      addCustomColor(hex);
                    }}
                    className="sr-only"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => addCustomColor()}
                  className="rounded-xl bg-[#400604] border border-[#400604] px-4 py-2.5 text-[12px] font-bold text-white hover:bg-[#520805] active:scale-95 transition shadow-2xs cursor-pointer shrink-0"
                >
                  Add Color
                </button>
              </div>

              {/* Live Preview while typing */}
              {customColor.trim() && (() => {
                const preview = resolveColorStyle(customColor);
                return (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-[12px]">
                    <span className="text-[11px] font-bold text-stone-500">Live Preview:</span>
                    <span
                      className={`h-4 w-4 rounded-full shrink-0 ${preview.swatchBorder}`}
                      style={{ backgroundColor: preview.bg }}
                    />
                    <strong className="text-stone-800 font-bold capitalize">
                      {customColor.trim()}
                    </strong>
                    {preview.isLight && (
                      <span className="text-[10px] font-semibold text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200">
                        Light tone — high-contrast border applied
                      </span>
                    )}
                    <span className="text-[10px] text-stone-400 ml-auto">
                      Press Enter to add
                    </span>
                  </div>
                );
              })()}

              {/* 4. Quick Suggestions for Colors Not Yet Selected */}
              {POPULAR_SUGGESTIONS.filter(
                (p) => !colors.some((c) => c.toLowerCase() === p.toLowerCase()),
              ).length > 0 && (
                <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] font-bold text-stone-400 uppercase tracking-wider mr-1">
                    Quick suggestions:
                  </span>
                  {POPULAR_SUGGESTIONS.filter(
                    (p) => !colors.some((c) => c.toLowerCase() === p.toLowerCase()),
                  ).map((sug) => {
                    const style = resolveColorStyle(sug);
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => addCustomColor(sug)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-stone-200 bg-white text-stone-600 hover:border-[#400604] hover:text-[#400604] transition cursor-pointer"
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${style.swatchBorder}`}
                          style={{ backgroundColor: style.bg }}
                        />
                        + {sug}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
          disabled={saving || uploading}
          className="flex items-center gap-2 rounded-xl bg-[#400604] border border-[#400604] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#520805] disabled:opacity-50 transition shadow-md shadow-[#400604]/20 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#E1B76F]" /> Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4 text-[#E1B76F]" />
              {initialData?.id ? "Update Product" : "Create Product"}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-[14px] font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-50 transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
