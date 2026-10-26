import type { MultiSectionSizeChart, SizeChartData } from "@/utils/size-chart";

export interface ImageItem {
  src: string;
  alt: string;
  wpId?: number;
}

export interface PendingUpload {
  id: string;
  name: string;
  previewUrl: string;
  /** 0–100 while bytes are sending */
  progress: number;
  phase: "uploading" | "processing" | "error";
  error?: string;
}

export interface UploadFolderContext {
  category?: string;
  subcategory?: string;
  product?: string;
  sku?: string;
  folder?: string;
}

export interface ProductFormData {
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
  sizeChart?: MultiSectionSizeChart | SizeChartData;
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

export interface ProductFormProps {
  initialData?: Partial<ProductFormData & { id: number }>;
  onSuccess: () => void;
  onCancel?: () => void;
}

export const STOCK_OPTIONS = [
  { value: "instock", label: "In Stock" },
  { value: "outofstock", label: "Out of Stock" },
  { value: "onbackorder", label: "On Backorder" },
];

export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
export const ETHNIC_SIZES = ["36", "38", "40", "42", "44", "46", "48"];
export const WAIST_SIZES = ["28", "30", "32", "34", "36", "38", "40"];
export const UNIVERSAL_SIZES = ["Free Size", "One Size"];
