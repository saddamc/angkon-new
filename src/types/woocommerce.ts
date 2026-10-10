export type { WooCategory, WooProduct, WooImage, WooAttribute } from "@/types/product";
import type { WooCategory } from "@/types/product";

export interface CategoryNode extends WooCategory {
  children: CategoryNode[];
}
