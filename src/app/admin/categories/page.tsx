"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus, Pencil, Trash2, RefreshCw, ChevronRight, ChevronLeft, X, Loader2,
  FolderOpen, Tag, ImageIcon, Check, AlertCircle, UploadCloud,
  Search, Filter, GripVertical, CheckCircle2, XCircle, SearchX, ChevronDown, ChevronUp,
  ArrowRightLeft, Sparkles, ExternalLink, ArrowLeft, Layers, MoreVertical
} from "lucide-react";
import { decodeHtmlCharCodes } from "@/utils/category-display";
import { CreateCategoryModal } from "./CreateCategoryModal";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface WCCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  linked_parents?: number[];
  description: string;
  /** Distinct products shown on this category's storefront page (itself + sub-categories). */
  count: number;
  /** Products listed directly in this category. */
  direct_count?: number;
  menu_order: number;
  meta_data?: { id?: number; key: string; value: any }[];
  image?: { id?: number; src: string; alt?: string } | null;
  is_linked?: boolean;
}

interface CategoryTree extends WCCategory {
  children: WCCategory[];
}

function buildTree(flat: WCCategory[]): CategoryTree[] {
  const byId = new Map<number, CategoryTree>();
  flat.forEach((c) => byId.set(c.id, { ...c, children: [] }));
  const roots: CategoryTree[] = [];
  byId.forEach((node) => {
    if (node.parent && byId.has(node.parent)) {
      byId.get(node.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Cross-link categories to their linked_parents
  flat.forEach((category) => {
    if (Array.isArray(category.linked_parents) && category.linked_parents.length > 0) {
      category.linked_parents.forEach((linkedParentId) => {
        const targetParent = byId.get(linkedParentId);
        if (targetParent && targetParent.id !== category.id) {
          const alreadyExists = targetParent.children.some((child) => child.id === category.id);
          if (!alreadyExists) {
            const originalNode = byId.get(category.id);
            if (originalNode) {
              targetParent.children.push({
                ...originalNode,
                is_linked: true,
              });
            }
          }
        }
      });
    }
  });

  const sortRecursive = (nodes: CategoryTree[]) => {
    nodes.sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0) || catName(a).localeCompare(catName(b)));
    nodes.forEach((n) => sortRecursive(n.children as CategoryTree[]));
  };
  sortRecursive(roots);
  return roots;
}

/** Direct and cross-listed children of a category in display order (same order the tree shows). */
function sortedChildrenOf(flat: WCCategory[], parentId: number): WCCategory[] {
  const direct = flat.filter((c) => c.parent === parentId);
  const linked = flat
    .filter(
      (c) =>
        c.parent !== parentId &&
        Array.isArray(c.linked_parents) &&
        c.linked_parents.includes(parentId)
    )
    .map((c) => ({ ...c, is_linked: true }));
  return [...direct, ...linked].sort(
    (a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0) || catName(a).localeCompare(catName(b))
  );
}

/** Every category id that currently has at least one child (direct or cross-listed) */
function parentsWithChildrenIds(flat: WCCategory[]): number[] {
  const parents = new Set<number>();
  flat.forEach((c) => {
    if (c.parent) parents.add(c.parent);
    if (Array.isArray(c.linked_parents)) {
      c.linked_parents.forEach((p) => parents.add(p));
    }
  });
  return [...parents];
}

function ancestorIdsOf(flat: WCCategory[], id: number): number[] {
  const ids: number[] = [];
  let current = flat.find((c) => c.id === id);
  const seen = new Set<number>();
  while (current?.parent && !seen.has(current.parent)) {
    seen.add(current.parent);
    ids.push(current.parent);
    current = flat.find((c) => c.id === current!.parent);
  }
  return ids;
}

/** Direct children sorted by menu_order */
function directChildren(flat: WCCategory[], parentId: number): WCCategory[] {
  return flat
    .filter((c) => c.parent === parentId)
    .sort((a, b) => a.menu_order - b.menu_order);
}

function catName(cat: { name: string }) {
  return decodeHtmlCharCodes(cat.name);
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

function categoryPath(flat: WCCategory[], id: number): string {
  const parts: string[] = [];
  let current = flat.find((c) => c.id === id);
  const seen = new Set<number>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(catName(current));
    current = current.parent ? flat.find((c) => c.id === current!.parent) : undefined;
  }
  return parts.join(" / ");
}

function subtreeList(flat: WCCategory[], rootId: number): WCCategory[] {
  const result: WCCategory[] = [];
  const walk = (id: number) => {
    const node = flat.find((c) => c.id === id);
    if (node) result.push(node);
    flat.filter((c) => c.parent === id).forEach((child) => walk(child.id));
  };
  walk(rootId);
  return result;
}

function descendantIdSet(flat: WCCategory[], id: number): Set<number> {
  const ids = new Set<number>();
  const walk = (parentId: number) => {
    flat.filter((c) => c.parent === parentId).forEach((c) => {
      ids.add(c.id);
      walk(c.id);
    });
  };
  walk(id);
  return ids;
}

function siblingsOf(flat: WCCategory[], parent: number, excludeId?: number): WCCategory[] {
  return flat
    .filter((c) => c.parent === parent && c.id !== excludeId)
    .sort((a, b) => a.menu_order - b.menu_order);
}

function getStatus(cat: WCCategory) {
  const meta = cat.meta_data?.find(m => m.key === "_is_active");
  if (meta) return meta.value === "true";
  return true; // default active
}

function DeleteConfirmModal({
  cat,
  subCount,
  productCount,
  onClose,
  onConfirm,
  deleting,
}: {
  cat: WCCategory;
  subCount: number;
  productCount: number;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  const hasProducts = productCount > 0;
  const hasSubs = subCount > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50">
          <h2 className="text-[18px] font-black text-red-700">Delete “{catName(cat)}”?</h2>
          <p className="text-[13px] text-red-600/80 mt-1">This cannot be undone.</p>
        </div>
        <div className="p-6 space-y-4 text-[14px] text-gray-700">
          <ul className="space-y-2 text-[13px]">
            <li className="flex justify-between border-b border-gray-100 pb-2">
              <span>Subcategories</span>
              <b>{hasSubs ? subCount : "None"}</b>
            </li>
            <li className="flex justify-between border-b border-gray-100 pb-2">
              <span>Products in this tree</span>
              <b>{productCount}</b>
            </li>
          </ul>
          {hasSubs && (
            <p className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-[13px] text-amber-800">
              All subcategories under this category will also be deleted.
            </p>
          )}
          {hasProducts ? (
            <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] font-semibold text-red-700">
              Warning: all {productCount} product{productCount === 1 ? "" : "s"} in this category
              {hasSubs ? " and its subcategories" : ""} will be permanently removed from the store.
            </p>
          ) : (
            <p className="text-[13px] text-gray-500">There are no products in this category. Only the category will be deleted.</p>
          )}
          <p className="text-[12px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
            <span>🗑️</span>
            <span>Attached category image in Cloudinary will also be automatically removed.</span>
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={onClose} disabled={deleting} className="px-5 py-2.5 text-[14px] font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition">Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-2 px-6 py-2.5 text-[14px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {hasProducts ? "Delete category & products" : "Delete category"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Studio Form Data ───────────────────────────────────────────────── */
interface FormData {
  type: "main" | "sub";
  name: string;
  slug: string;
  description: string;
  parent: number;
  linkedParents?: number[];
  imageUrl: string;
  imageAlt: string;
  imageId: number | null;
  isActive: boolean;
  sortOrder: number;
  icon: string;
  bgTheme: string;
}

const EMPTY_FORM: FormData = {
  type: "main",
  name: "",
  slug: "",
  description: "",
  parent: 0,
  linkedParents: [],
  imageUrl: "",
  imageAlt: "",
  imageId: null,
  isActive: true,
  sortOrder: 0,
  icon: "",
  bgTheme: "blue",
};

/* ─── Parent Category Picker (searchable combobox) ─────────────────────── */
function ParentCategoryPicker({
  value,
  options,
  allowRoot = false,
  allCats,
  onChange,
}: {
  value: number;
  options: WCCategory[];
  allowRoot?: boolean;
  allCats?: WCCategory[];
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const catalog = allCats ?? options;
  const selected = value === 0 ? null : catalog.find((p) => p.id === value) || options.find((p) => p.id === value) || null;
  const filtered = options.filter((p) => {
    const q = query.toLowerCase();
    return catName(p).toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-left bg-white hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition"
      >
        {value === 0 && allowRoot ? (
          <span className="flex-1 text-[14px] font-semibold text-gray-900">Main category (top level)</span>
        ) : selected ? (
          <>
            {selected.image?.src ? (
              <img src={selected.image.src} alt="" className="h-7 w-7 rounded-lg object-cover border border-gray-200 shrink-0" />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><FolderOpen className="h-3.5 w-3.5 text-gray-400" /></div>
            )}
            <span className="flex-1 min-w-0 truncate text-[14px] font-semibold text-gray-900">{categoryPath(catalog, selected.id) || catName(selected)}</span>
            <span className="text-[11px] text-gray-400 shrink-0">{selected.count} items</span>
          </>
        ) : (
          <span className="flex-1 text-[14px] text-gray-400">— Select category —</span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-8 pr-3 py-2 text-[13px] rounded-lg border border-gray-200 outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {allowRoot && (
              <button
                type="button"
                onClick={() => { onChange(0); setOpen(false); setQuery(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 transition ${value === 0 ? "bg-blue-50/70" : ""}`}
              >
                <span className="text-[13px] font-semibold text-gray-900">Main category (top level)</span>
                {value === 0 && <Check className="h-4 w-4 text-blue-600 ml-auto" />}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-gray-400">No matching categories</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 transition ${p.id === value ? "bg-blue-50/70" : ""}`}
                >
                  {p.image?.src ? (
                    <img src={p.image.src} alt="" className="h-7 w-7 rounded-lg object-cover border border-gray-200 shrink-0" />
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><FolderOpen className="h-3.5 w-3.5 text-gray-400" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{catName(p)}</p>
                    <p className="text-[11px] text-gray-400 truncate">{categoryPath(catalog, p.id)}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">{p.count} items</span>
                  {p.id === value && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PositionPicker({
  siblings,
  value,
  onChange,
}: {
  siblings: WCCategory[];
  value: number;
  onChange: (index: number) => void;
}) {
  const last = siblings.length;
  const options: { index: number; label: string }[] = [{ index: 0, label: "Move to first" }];
  siblings.forEach((sib, i) => {
    options.push({ index: i + 1, label: `After “${catName(sib)}” (position ${i + 2})` });
  });
  if (last > 0) options[options.length - 1].label = `Move to last (after “${catName(siblings[last - 1])}”)`;

  return (
    <select
      value={Math.max(0, Math.min(value, last))}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-700 outline-none bg-white focus:border-blue-400"
    >
      {options.map((opt) => (
        <option key={opt.index} value={opt.index}>{opt.label}</option>
      ))}
    </select>
  );
}

/* ─── Luxury Category Banner Presets ─────────────────────────────────── */
const LUXURY_PRESETS = [
  { name: "Half Sleeves", src: "/banners/half-sleeves.webp" },
  { name: "Full Sleeves", src: "/banners/full-sleeves.webp" },
  { name: "Tees", src: "/banners/tees.webp" },
  { name: "Polo", src: "/banners/polos.webp" },
  { name: "Pants", src: "/banners/pants.webp" },
  { name: "Tops", src: "/banners/tops.webp" },
  { name: "Men Banner", src: "/banners/men-banner.webp" },
  { name: "Women Banner", src: "/banners/women-banner.webp" },
  { name: "Accessories", src: "/banners/accessories.webp" },
  { name: "Ethnic Wear", src: "/banners/ethnic-wear.webp" },
];

/* ─── Curated Category Icons ─────────────────────────────────────────── */
const ICON_CATEGORIES = [
  "All",
  "Fashion",
  "Shoes & Bags",
  "Jewelry",
  "Beauty",
  "Sewing & Craft",
  "Electronics",
  "Home & Living",
  "Kids & Toys",
  "Sports & Gym",
  "Grocery & Food",
  "Deals & Badges",
] as const;

interface CuratedIcon {
  label: string;
  icon: string;
  category: typeof ICON_CATEGORIES[number];
  tags: string[];
}

const CURATED_ICONS: CuratedIcon[] = [
  // Fashion & Apparel
  { label: "Dress", icon: "👗", category: "Fashion", tags: ["gown", "women", "frock", "outfit", "clothing"] },
  { label: "Saree", icon: "🥻", category: "Fashion", tags: ["saree", "sari", "traditional", "ethnic", "women", "indian", "bengali"] },
  { label: "Top / Blouse", icon: "👚", category: "Fashion", tags: ["blouse", "top", "women", "shirt", "clothing"] },
  { label: "T-Shirt", icon: "👕", category: "Fashion", tags: ["tee", "casual", "men", "women", "clothing", "tshirt"] },
  { label: "Shirt & Tie", icon: "👔", category: "Fashion", tags: ["formal", "office", "men", "work", "suit"] },
  { label: "Jacket", icon: "🧥", category: "Fashion", tags: ["coat", "winter", "outerwear", "warm", "blazer"] },
  { label: "Vest / Waistcoat", icon: "🦺", category: "Fashion", tags: ["vest", "waistcoat", "sleeveless"] },
  { label: "Jeans / Pants", icon: "👖", category: "Fashion", tags: ["trousers", "denim", "bottoms", "pants"] },
  { label: "Shorts", icon: "🩳", category: "Fashion", tags: ["boxers", "summer", "beach", "casual"] },
  { label: "Kimono / Robe", icon: "👘", category: "Fashion", tags: ["robe", "traditional", "nightwear", "sleep"] },
  { label: "Swimsuit", icon: "🩱", category: "Fashion", tags: ["monokini", "swimwear", "beach", "pool"] },
  { label: "Bikini", icon: "👙", category: "Fashion", tags: ["beachwear", "swimwear", "summer", "pool"] },
  { label: "Underwear", icon: "🩲", category: "Fashion", tags: ["briefs", "innerwear", "lingerie"] },
  { label: "Socks", icon: "🧦", category: "Fashion", tags: ["stockings", "footwear", "warm", "winter"] },
  { label: "Scarf / Shawl", icon: "🧣", category: "Fashion", tags: ["muffler", "hijab", "winter", "orna", "dupatta"] },
  { label: "Gloves", icon: "🧤", category: "Fashion", tags: ["mittens", "winter", "warm", "hands"] },
  { label: "Cap / Baseball Hat", icon: "🧢", category: "Fashion", tags: ["baseball", "cap", "headwear", "casual"] },
  { label: "Sun Hat", icon: "👒", category: "Fashion", tags: ["straw hat", "summer", "beach", "women"] },
  { label: "Crown", icon: "👑", category: "Fashion", tags: ["royal", "queen", "king", "luxury", "tiara"] },

  // Shoes & Bags
  { label: "Sneakers", icon: "👟", category: "Shoes & Bags", tags: ["shoes", "trainers", "running", "casual", "kicks"] },
  { label: "Formal Shoes", icon: "👞", category: "Shoes & Bags", tags: ["leather", "loafers", "oxford", "office", "men"] },
  { label: "High Heels", icon: "👠", category: "Shoes & Bags", tags: ["pumps", "stilettos", "women", "party", "shoes"] },
  { label: "Flats", icon: "🥿", category: "Shoes & Bags", tags: ["ballet", "loafers", "comfort", "casual", "shoes"] },
  { label: "Sandals", icon: "👡", category: "Shoes & Bags", tags: ["strappy", "open toe", "summer", "shoes"] },
  { label: "Boots", icon: "👢", category: "Shoes & Bags", tags: ["leather boots", "winter", "ankle boots", "shoes"] },
  { label: "Flip Flops", icon: "🩴", category: "Shoes & Bags", tags: ["slippers", "slides", "beach", "summer"] },
  { label: "Handbag", icon: "👜", category: "Shoes & Bags", tags: ["purse", "tote", "leather", "women", "bag"] },
  { label: "Clutch / Purse", icon: "👛", category: "Shoes & Bags", tags: ["coin purse", "wallet", "pouch", "bag"] },
  { label: "Backpack", icon: "🎒", category: "Shoes & Bags", tags: ["school bag", "travel", "rucksack", "bag"] },
  { label: "Suitcase", icon: "🧳", category: "Shoes & Bags", tags: ["luggage", "travel", "trolley", "trip"] },
  { label: "Briefcase", icon: "💼", category: "Shoes & Bags", tags: ["office bag", "laptop bag", "work", "business"] },
  { label: "Shopping Bag", icon: "🛍️", category: "Shoes & Bags", tags: ["retail", "store", "boutique", "shopping"] },
  { label: "Pouch", icon: "👝", category: "Shoes & Bags", tags: ["makeup bag", "accessory bag", "clutch"] },

  // Jewelry & Luxury
  { label: "Ring", icon: "💍", category: "Jewelry", tags: ["engagement", "wedding", "diamond ring", "gold"] },
  { label: "Diamond", icon: "💎", category: "Jewelry", tags: ["gemstone", "crystal", "precious", "luxury"] },
  { label: "Necklace", icon: "📿", category: "Jewelry", tags: ["beads", "pendant", "chain", "jewelry"] },
  { label: "Watch", icon: "⌚", category: "Jewelry", tags: ["timepiece", "luxury watch", "wrist watch"] },
  { label: "Sunglasses", icon: "🕶️", category: "Jewelry", tags: ["shades", "eyewear", "glasses", "summer"] },
  { label: "Eyeglasses", icon: "👓", category: "Jewelry", tags: ["optical", "spectacles", "frames", "vision"] },
  { label: "Gold Coin", icon: "🪙", category: "Jewelry", tags: ["gold", "bullion", "treasure", "currency"] },
  { label: "Mirror", icon: "🪞", category: "Jewelry", tags: ["compact mirror", "beauty", "vanity"] },

  // Beauty & Cosmetics
  { label: "Lipstick", icon: "💄", category: "Beauty", tags: ["makeup", "lips", "cosmetics", "beauty"] },
  { label: "Lotion", icon: "🧴", category: "Beauty", tags: ["skincare", "cream", "moisturizer", "sunscreen", "serum"] },
  { label: "Nail Polish", icon: "💅", category: "Beauty", tags: ["manicure", "nails", "pedicure", "cosmetics"] },
  { label: "Soap", icon: "🧼", category: "Beauty", tags: ["bath", "body wash", "clean", "hygiene"] },
  { label: "Spa / Bubbles", icon: "🫧", category: "Beauty", tags: ["bubbles", "relaxation", "clean", "bath"] },
  { label: "Comb", icon: "🪮", category: "Beauty", tags: ["hair comb", "hair care", "styling", "brush"] },
  { label: "Floral / Perfume", icon: "🌸", category: "Beauty", tags: ["scent", "fragrance", "perfume", "cologne", "flower"] },
  { label: "Herbal / Natural", icon: "🌺", category: "Beauty", tags: ["organic", "botanical", "natural beauty", "flower"] },

  // Sewing, Tailoring & Craft
  { label: "Sewing Thread", icon: "🧵", category: "Sewing & Craft", tags: ["thread", "spool", "stitch", "tailor", "yarn"] },
  { label: "Needle", icon: "🪡", category: "Sewing & Craft", tags: ["sewing needle", "stitch", "tailor", "embroidery"] },
  { label: "Scissors", icon: "✂️", category: "Sewing & Craft", tags: ["cutting", "tailor", "fabric", "craft"] },
  { label: "Yarn", icon: "🧶", category: "Sewing & Craft", tags: ["wool", "knitting", "crochet", "craft"] },
  { label: "Safety Pin", icon: "🧷", category: "Sewing & Craft", tags: ["pin", "fastener", "tailor", "craft"] },
  { label: "Ribbon", icon: "🎀", category: "Sewing & Craft", tags: ["bow", "gift wrap", "decoration", "craft"] },
  { label: "Measuring Tape", icon: "📏", category: "Sewing & Craft", tags: ["ruler", "tailor", "size", "measurement"] },

  // Electronics & Gadgets
  { label: "Smartphone", icon: "📱", category: "Electronics", tags: ["mobile", "phone", "iphone", "android", "cell"] },
  { label: "Laptop", icon: "💻", category: "Electronics", tags: ["computer", "macbook", "pc", "tech"] },
  { label: "Desktop", icon: "🖥️", category: "Electronics", tags: ["monitor", "display", "screen", "pc"] },
  { label: "Headphones", icon: "🎧", category: "Electronics", tags: ["earphones", "audio", "music", "headset"] },
  { label: "Camera", icon: "📷", category: "Electronics", tags: ["dslr", "photo", "photography", "video"] },
  { label: "Gaming Controller", icon: "🎮", category: "Electronics", tags: ["gamepad", "console", "playstation", "xbox", "gaming"] },
  { label: "Battery / Power", icon: "🔋", category: "Electronics", tags: ["powerbank", "cable", "energy"] },
  { label: "Power Plug", icon: "🔌", category: "Electronics", tags: ["adapter", "electric", "charger", "cable"] },
  { label: "Television", icon: "📺", category: "Electronics", tags: ["tv", "smart tv", "display", "screen"] },
  { label: "Microphone", icon: "🎙️", category: "Electronics", tags: ["audio", "mic", "podcast", "recording"] },

  // Home & Living
  { label: "Sofa / Couch", icon: "🛋️", category: "Home & Living", tags: ["couch", "furniture", "living room", "decor"] },
  { label: "Bed", icon: "🛏️", category: "Home & Living", tags: ["bedroom", "mattress", "bedding", "sleep"] },
  { label: "Chair", icon: "🪑", category: "Home & Living", tags: ["furniture", "seat", "dining chair", "desk"] },
  { label: "Plant / Decor", icon: "🪴", category: "Home & Living", tags: ["indoor plant", "flowerpot", "green", "garden"] },
  { label: "Candle", icon: "🕯️", category: "Home & Living", tags: ["aroma", "scented candle", "decor", "fragrance"] },
  { label: "Cooking Pan", icon: "🍳", category: "Home & Living", tags: ["kitchen", "skillet", "cookware", "cooking"] },
  { label: "Dishes / Dinnerware", icon: "🍽️", category: "Home & Living", tags: ["plate", "fork", "knife", "dining", "kitchen"] },
  { label: "Coffee / Mug", icon: "☕", category: "Home & Living", tags: ["tea", "cup", "beverage", "cafe", "espresso"] },
  { label: "Teapot", icon: "🫖", category: "Home & Living", tags: ["kettle", "tea", "pot", "chai"] },
  { label: "Kitchen Knife", icon: "🔪", category: "Home & Living", tags: ["cutlery", "chef", "cooking"] },
  { label: "Laundry Basket", icon: "🧺", category: "Home & Living", tags: ["storage", "organizer", "hamper", "cleaning"] },
  { label: "Broom", icon: "🧹", category: "Home & Living", tags: ["cleaning", "housekeeping", "clean"] },

  // Kids & Toys
  { label: "Baby", icon: "👶", category: "Kids & Toys", tags: ["infant", "newborn", "toddler", "child"] },
  { label: "Teddy Bear", icon: "🧸", category: "Kids & Toys", tags: ["plush", "stuffed animal", "soft toy"] },
  { label: "Baby Bottle", icon: "🍼", category: "Kids & Toys", tags: ["milk", "infant feeding", "nursery"] },
  { label: "Pinata / Party", icon: "🪅", category: "Kids & Toys", tags: ["party", "birthday", "celebration", "toys"] },
  { label: "Kite", icon: "🪁", category: "Kids & Toys", tags: ["flying", "outdoor games", "toys"] },
  { label: "Puzzle", icon: "🧩", category: "Kids & Toys", tags: ["games", "brain games", "educational", "toys"] },
  { label: "Art Palette", icon: "🎨", category: "Kids & Toys", tags: ["drawing", "colors", "painting", "craft"] },
  { label: "Toy Car", icon: "🚗", category: "Kids & Toys", tags: ["automobile", "vehicle", "ride", "racing"] },
  { label: "Scooter", icon: "🛴", category: "Kids & Toys", tags: ["kick scooter", "ride on", "outdoor"] },

  // Sports & Gym
  { label: "Dumbbell / Gym", icon: "🏋️", category: "Sports & Gym", tags: ["weights", "fitness", "workout", "bodybuilding"] },
  { label: "Yoga / Wellness", icon: "🧘", category: "Sports & Gym", tags: ["meditation", "exercise", "wellness", "stretch"] },
  { label: "Bicycle", icon: "🚴", category: "Sports & Gym", tags: ["cycling", "bike", "cardio", "sports"] },
  { label: "Soccer / Football", icon: "⚽", category: "Sports & Gym", tags: ["ball", "sports", "football"] },
  { label: "Basketball", icon: "🏀", category: "Sports & Gym", tags: ["hoops", "ball", "sports"] },
  { label: "Tennis", icon: "🎾", category: "Sports & Gym", tags: ["racket", "ball", "court", "sports"] },
  { label: "Badminton", icon: "🏸", category: "Sports & Gym", tags: ["shuttlecock", "racket", "sports"] },
  { label: "Boxing Gloves", icon: "🥊", category: "Sports & Gym", tags: ["fight", "gloves", "mma", "fitness"] },
  { label: "Tent / Camping", icon: "⛺", category: "Sports & Gym", tags: ["hiking", "outdoor", "camping", "adventure"] },

  // Grocery & Food
  { label: "Shopping Cart", icon: "🛒", category: "Grocery & Food", tags: ["cart", "supermarket", "store", "buy"] },
  { label: "Apple / Fruits", icon: "🍎", category: "Grocery & Food", tags: ["fruit", "fresh", "organic", "healthy"] },
  { label: "Vegetables", icon: "🥦", category: "Grocery & Food", tags: ["broccoli", "greens", "organic", "produce"] },
  { label: "Bakery / Bread", icon: "🍞", category: "Grocery & Food", tags: ["toast", "loaf", "bakery", "breakfast"] },
  { label: "Cake", icon: "🎂", category: "Grocery & Food", tags: ["birthday", "pastry", "dessert", "sweet"] },
  { label: "Chocolates", icon: "🍫", category: "Grocery & Food", tags: ["candy", "sweets", "treats", "cacao"] },
  { label: "Drinks / Juice", icon: "🥤", category: "Grocery & Food", tags: ["soda", "beverage", "cup", "refreshment"] },
  { label: "Honey", icon: "🍯", category: "Grocery & Food", tags: ["organic honey", "sweet", "natural"] },

  // Deals & Badges
  { label: "Price Tag", icon: "🏷️", category: "Deals & Badges", tags: ["discount", "sale", "offer", "deal", "promo"] },
  { label: "Hot / Trending", icon: "🔥", category: "Deals & Badges", tags: ["fire", "viral", "popular", "trending"] },
  { label: "New Arrival", icon: "✨", category: "Deals & Badges", tags: ["sparkles", "fresh", "latest", "new"] },
  { label: "Gift Box", icon: "🎁", category: "Deals & Badges", tags: ["present", "bundle", "special", "reward"] },
  { label: "Best Rated", icon: "⭐", category: "Deals & Badges", tags: ["star", "top", "reviews", "favorite"] },
  { label: "Top Quality", icon: "💯", category: "Deals & Badges", tags: ["100", "perfect", "guarantee", "quality"] },
  { label: "Favorites", icon: "❤️", category: "Deals & Badges", tags: ["heart", "wishlist", "love", "popular"] },
  { label: "Flash Sale", icon: "⚡", category: "Deals & Badges", tags: ["lightning", "fast", "urgent", "deals"] },
  { label: "Package", icon: "📦", category: "Deals & Badges", tags: ["parcel", "shipping", "delivery", "box"] },
  { label: "Delivery", icon: "🚚", category: "Deals & Badges", tags: ["truck", "shipping", "fast delivery", "courier"] },
  { label: "Credit Card", icon: "💳", category: "Deals & Badges", tags: ["payment", "checkout", "bank", "card"] },
  { label: "Best Seller Trophy", icon: "🏆", category: "Deals & Badges", tags: ["award", "trophy", "winner", "top seller"] },
  { label: "Eco Friendly", icon: "🌿", category: "Deals & Badges", tags: ["green", "organic", "leaf", "natural", "sustainable"] },
];

function isIconUrl(val?: string | null): boolean {
  if (!val) return false;
  return val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/");
}

/**
 * Shrink big photos in the browser before uploading. Hosting platforms reject request bodies of
 * roughly 4.5 MB and over, so a 5 MB phone photo would fail there; category images never need more
 * than ~1600px anyway. Small files and unsupported formats (SVG, GIF) are sent unchanged.
 */
async function shrinkImageForUpload(file: File): Promise<File> {
  const MAX_SIDE = 1600;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    // Keep transparency for PNG/WebP, use JPEG for photos.
    const keepAlpha = file.type !== "image/jpeg";
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, keepAlpha ? "image/webp" : "image/jpeg", 0.88),
    );
    if (!blob || blob.size >= file.size) return file;
    const ext = keepAlpha ? "webp" : "jpg";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
  } catch {
    return file;
  }
}

function CategoryStudio({
  mode,
  initial,
  flat,
  onSave,
  onClose,
  onEditChild,
  onAddChild,
  onReload,
}: {
  mode: "add" | "edit";
  initial: FormData & { id?: number };
  flat: WCCategory[];
  onSave: (data: FormData & { id?: number }) => Promise<void>;
  onClose: () => void;
  onEditChild?: (cat: WCCategory) => void;
  onAddChild?: (parentId: number) => void;
  onReload?: () => Promise<void>;
}) {
  const { authFetch } = useAuth();
  const [form, setForm] = useState<FormData>({ ...initial, linkedParents: initial.linkedParents || [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"details" | "media" | "subcategories" | "crosslisting">("details");
  const [iconTab, setIconTab] = useState<"library" | "custom">("library");
  const [iconSearch, setIconSearch] = useState("");
  const [iconCategory, setIconCategory] = useState<string>("All");

  const [linkingChildId, setLinkingChildId] = useState<number | "">("");
  const [linkingActionLoading, setLinkingActionLoading] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    if (mode === "add") {
      return Boolean(form.name.trim() || form.imageUrl || form.description.trim());
    }
    const initLinked = (initial.linkedParents || []).slice().sort().join(",");
    const currLinked = (form.linkedParents || []).slice().sort().join(",");
    return (
      form.name !== initial.name ||
      form.slug !== initial.slug ||
      form.parent !== initial.parent ||
      form.type !== initial.type ||
      (form.description || "") !== (initial.description || "") ||
      Boolean(form.isActive) !== Boolean(initial.isActive) ||
      (form.imageUrl || "") !== (initial.imageUrl || "") ||
      (form.imageAlt || "") !== (initial.imageAlt || "") ||
      (form.icon || "") !== (initial.icon || "") ||
      (form.bgTheme || "blue") !== (initial.bgTheme || "blue") ||
      form.sortOrder !== initial.sortOrder ||
      currLinked !== initLinked
    );
  }, [form, initial, mode]);

  useEffect(() => {
    setForm({ ...initial, linkedParents: initial.linkedParents || [] });
    setError("");
    setActiveTab("details");
    isSavedRef.current = false;
    sessionUploadedRef.current = [];
  }, [initial.id, mode, initial.parent]);

  const filteredIcons = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    return CURATED_ICONS.filter((item) => {
      const matchesCat = iconCategory === "All" || item.category === iconCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [iconSearch, iconCategory]);

  const banned = initial.id ? descendantIdSet(flat, initial.id) : new Set<number>();
  const parentOptions = flat.filter((c) => c.id !== initial.id && !banned.has(c.id));
  const mainCategoryOptions = flat.filter(
    (c) => c.parent === 0 && c.id !== initial.id && (initial.id ? true : c.slug !== form.slug)
  );
  const destParent = form.type === "main" ? 0 : form.parent;
  const positionSiblings = siblingsOf(flat, destParent, initial.id);
  const categoryId = initial.id;
  const directChildCats = categoryId ? directChildren(flat, categoryId) : [];
  const crossListedChildCats = categoryId
    ? flat.filter(
        (c) =>
          c.id !== categoryId &&
          c.parent !== categoryId &&
          Array.isArray(c.linked_parents) &&
          c.linked_parents.includes(categoryId)
      )
    : [];
  const totalSubCount = directChildCats.length + crossListedChildCats.length;
  const linkableCandidates = categoryId
    ? flat.filter(
        (c) =>
          c.id !== categoryId &&
          c.parent !== categoryId &&
          !(Array.isArray(c.linked_parents) && c.linked_parents.includes(categoryId)) &&
          !banned.has(c.id)
      )
    : [];

  const handleLinkExistingChild = async (childId: number) => {
    if (!initial.id || !childId) return;
    setLinkingActionLoading(true);
    try {
      const target = flat.find((c) => c.id === childId);
      if (!target) return;
      const currentLinked = Array.isArray(target.linked_parents) ? target.linked_parents : [];
      if (currentLinked.includes(initial.id)) return;
      const updatedLinked = [...currentLinked, initial.id];
      const res = await authFetch(`/api/admin/categories/${childId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linked_parents: updatedLinked }),
      });
      if (!res.ok) throw new Error("Failed to link category");
      setLinkingChildId("");
      if (onReload) await onReload();
    } catch (e: any) {
      setError(e.message || "Failed to link category");
    } finally {
      setLinkingActionLoading(false);
    }
  };

  const handleUnlinkChild = async (childCat: WCCategory) => {
    if (!initial.id) return;
    setLinkingActionLoading(true);
    try {
      const currentLinked = Array.isArray(childCat.linked_parents) ? childCat.linked_parents : [];
      const updatedLinked = currentLinked.filter((id) => id !== initial.id);
      const res = await authFetch(`/api/admin/categories/${childCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linked_parents: updatedLinked }),
      });
      if (!res.ok) throw new Error("Failed to unlink category");
      if (onReload) await onReload();
    } catch (e: any) {
      setError(e.message || "Failed to unlink category");
    } finally {
      setLinkingActionLoading(false);
    }
  };

  const set = (key: keyof FormData, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: mode === "add" || !prev.slug ? slugify(name) : prev.slug,
    }));
  };

  const sessionUploadedRef = useRef<Array<{ id: number | null; url: string }>>([]);
  const isSavedRef = useRef(false);

  const handleClose = async () => {
    // If user uploaded an image in this studio session but didn't save, clean it from Cloudinary
    if (!isSavedRef.current && sessionUploadedRef.current.length > 0) {
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
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) { setError("Category name is required"); return; }
    if (form.type === "sub" && !form.parent) { setError("Please select a parent category"); return; }
    setSaving(true);
    setError("");
    try {
      isSavedRef.current = true;
      await onSave({
        ...form,
        id: initial.id,
        linkedParents: form.linkedParents || [],
      });
    }
    catch (err: any) {
      isSavedRef.current = false;
      setError(err.message || "Failed to save category");
    }
    finally { setSaving(false); }
  };

  const handleRemoveImage = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const toDeleteId = form.imageId;
    const toDeleteUrl = form.imageUrl;

    // Remove from UI form immediately
    set("imageUrl", "");
    set("imageId", null);
    set("imageAlt", "");

    // Remove from session tracking if present
    sessionUploadedRef.current = sessionUploadedRef.current.filter(
      (item) => (item.id && item.id === toDeleteId) || item.url === toDeleteUrl
    );

    // Immediately remove from Cloudinary
    if (toDeleteId || toDeleteUrl) {
      try {
        await authFetch("/api/admin/upload", {
          method: "DELETE",
          body: JSON.stringify({ id: toDeleteId, url: toDeleteUrl }),
        });
      } catch (err) {
        console.error("Failed to delete category image from Cloudinary:", err);
      }
    }
  };

  const handleUpload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) return setError("Image is too large (15MB max).");
    if (!file.type.startsWith("image/")) return setError("Please select a valid image file.");
    setUploading(true); setError("");
    const prevId = form.imageId;
    const prevUrl = form.imageUrl;
    try {
      // Build hierarchical category folder path:
      // Main Category: ANGKON / CATEGORIES / <CATEGORY>
      // Subcategory:   ANGKON / CATEGORIES / <PARENT_CATEGORY> / <SUBCATEGORY>
      let folder = "ANGKON/CATEGORIES";
      const catSlugClean = (form.slug || slugify(form.name) || "CATEGORY")
        .toUpperCase()
        .replace(/[^A-Z0-9_\s-]/g, "")
        .replace(/[\s-]+/g, "_");

      if (form.type === "sub" && form.parent) {
        const ancestors = ancestorIdsOf(flat, form.parent).reverse();
        const ancestorSlugs = [...ancestors, form.parent]
          .map((id) => flat.find((c) => c.id === id)?.slug || flat.find((c) => c.id === id)?.name)
          .filter(Boolean) as string[];

        const ancestorParts = ancestorSlugs.map((s) =>
          s.toUpperCase().replace(/[^A-Z0-9_\s-]/g, "").replace(/[\s-]+/g, "_")
        );

        folder = ["ANGKON", "CATEGORIES", ...ancestorParts, catSlugClean].join("/");
      } else {
        folder = `ANGKON/CATEGORIES/${catSlugClean}`;
      }

      const prepared = await shrinkImageForUpload(file);
      if (prepared.size > 4 * 1024 * 1024) {
        throw new Error("Image is still over 4MB after compression. Please choose a smaller image.");
      }

      const fd = new FormData();
      fd.append("image", prepared);
      fd.append("folder", folder);
      fd.append("uploadType", "category");
      if (form.type === "sub" && form.parent) {
        const parentCat = flat.find((c) => c.id === form.parent);
        fd.append("category", parentCat?.slug || parentCat?.name || "PARENT");
        fd.append("subcategory", form.slug || form.name);
      } else {
        fd.append("category", form.slug || form.name);
      }

      const res = await authFetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const detail = Array.isArray(d.details) ? ` (${d.details.slice(0, 2).join("; ")})` : "";
        if (res.status === 413) throw new Error("The image is too large for the server. Please choose a smaller image.");
        if (res.status === 401) throw new Error("Your admin session expired. Please log in again.");
        if (res.status === 503) throw new Error("Image storage isn't set up on this server: add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the hosting environment variables, then redeploy.");
        throw new Error((d.error || `Upload failed (${res.status})`) + detail);
      }
      const data = await res.json();
      set("imageUrl", data.url);
      set("imageId", data.id ?? null);
      set("imageAlt", data.alt ?? form.name);

      // Track uploaded in session
      sessionUploadedRef.current.push({ id: data.id ?? null, url: data.url });

      // If replacing an existing image, delete the old one from Cloudinary
      if ((prevId || prevUrl) && (prevId !== data.id || prevUrl !== data.url)) {
        void authFetch("/api/admin/upload", {
          method: "DELETE",
          body: JSON.stringify({ id: prevId, url: prevUrl }),
        });
      }
    } catch (err: any) { setError(err.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const parentName = form.parent ? catName(flat.find((c) => c.id === form.parent) || { name: "" }) : "";

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-md sticky top-4 lg:top-6 flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden">
      {/* Studio Header (Sticky) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-white/95 backdrop-blur shrink-0 z-20">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={handleClose}
            className="lg:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition shrink-0"
            title="Back to list"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 rounded-xl bg-[#400604]/10 text-[#400604] border border-[#400604]/20 flex items-center justify-center shrink-0 shadow-xs">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] sm:text-[16px] font-black text-gray-900 truncate">
                {mode === "add"
                  ? form.parent
                    ? `Add Sub under “${parentName}”`
                    : "Create Category"
                  : catName(form)}
              </h2>
              {mode === "edit" && initial.id ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono shrink-0">
                  #{initial.id}
                </span>
              ) : null}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                form.parent === 0
                  ? "bg-amber-100/70 text-amber-950 border border-amber-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}>
                {form.parent === 0 ? "Root Collection" : "Subcategory"}
              </span>
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="text-[12px] text-gray-500 font-mono truncate mt-0.5">
              /{form.slug || slugify(form.name) || "category-slug"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-[12px] font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-[13px] font-bold text-white bg-[#400604] hover:bg-[#5a0906] rounded-xl shadow-xs transition disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span className="hidden sm:inline">{mode === "add" ? "Create" : "Save Changes"}</span>
            <span className="sm:hidden">{mode === "add" ? "Create" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Sticky) */}
      <div className="flex items-center gap-1 px-4 sm:px-6 pt-2 border-b border-gray-100 bg-white shrink-0 overflow-x-auto z-10">
        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === "details"
              ? "border-[#400604] text-[#400604]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Tag className="h-3.5 w-3.5" />
          Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("media")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === "media"
              ? "border-[#400604] text-[#400604]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Image & Icon
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("subcategories")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === "subcategories"
              ? "border-[#400604] text-[#400604]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Subcategories {directChildCats.length > 0 ? `(${directChildCats.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("crosslisting")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === "crosslisting"
              ? "border-[#400604] text-[#400604]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Cross-listing {((form.linkedParents?.length || 0) + crossListedChildCats.length) > 0 ? `(${((form.linkedParents?.length || 0) + crossListedChildCats.length)})` : ""}
        </button>
      </div>

      {/* Form Content */}
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] font-medium text-red-600 mb-5">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* ─── TAB 1: DETAILS ─────────────────────────────────────────── */}
        {activeTab === "details" && (
          <div className="space-y-5">
            {/* Category Name */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Men, Shirts, Half Sleeves"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:border-[#400604] focus:ring-2 focus:ring-[#400604]/10 font-semibold"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => set("slug", slugify(e.target.value))}
                  placeholder="e.g. half-sleeves"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-mono text-gray-700 bg-gray-50 outline-none focus:border-[#400604] focus:bg-white transition"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Storefront URL: <span className="font-mono text-gray-600">/product-category/{form.slug || "slug"}</span>
              </p>
            </div>

            {/* Parent Category & Hierarchy Placement */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-3.5">
              <div>
                <label className="block text-[12px] font-bold text-gray-800 uppercase tracking-wider mb-1.5">
                  Hierarchy Placement
                </label>
                <div className="flex bg-gray-200/70 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      set("type", "main");
                      set("parent", 0);
                      set("sortOrder", siblingsOf(flat, 0, initial.id).length);
                    }}
                    className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition ${
                      form.type === "main" ? "bg-white shadow-xs text-[#400604]" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Main Category (Root)
                  </button>
                  <button
                    type="button"
                    onClick={() => set("type", "sub")}
                    className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition ${
                      form.type === "sub" ? "bg-white shadow-xs text-[#400604]" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Subcategory (Nested)
                  </button>
                </div>
              </div>

              {form.type === "sub" ? (
                <div>
                  <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Parent Category <span className="text-red-500">*</span>
                  </label>
                  <ParentCategoryPicker
                    value={form.parent}
                    options={parentOptions}
                    allCats={flat}
                    onChange={(id) => {
                      setForm((prev) => ({
                        ...prev,
                        parent: id,
                        sortOrder: siblingsOf(flat, id, initial.id).length,
                      }));
                    }}
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Sets the primary structural home and storefront breadcrumb. For secondary placements, use the <b>Cross-listing</b> tab.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-gray-200/70 text-[12px] text-gray-600">
                  <span className="font-bold text-gray-800">Root Category:</span> Appears at the top level of storefront menus and navigation.
                </div>
              )}
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-white">
              <div>
                <p className="text-[13px] font-bold text-gray-900">Category Visibility</p>
                <p className="text-[11px] text-gray-500">
                  {form.isActive ? "Visible in storefront menus, search, and navigation" : "Hidden from customer storefront"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => set("isActive", !form.isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.isActive ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Description (Storefront Header & SEO)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Brief description for category banner and SEO meta..."
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] text-gray-700 outline-none focus:border-[#400604]"
              />
            </div>

            {/* Position / Order */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Display Position in Sibling List
              </label>
              <PositionPicker
                siblings={positionSiblings}
                value={form.sortOrder}
                onChange={(index) => set("sortOrder", index)}
              />
            </div>
          </div>
        )}

        {/* ─── TAB 2: IMAGE & ICON ────────────────────────────────────── */}
        {activeTab === "media" && (
          <div className="space-y-5">
            {/* Category Image */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Category Image (Banner / Card)
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-5 transition-all ${
                  dragActive ? "border-[#400604] bg-amber-50/40" : "border-gray-200 bg-gray-50/60 hover:bg-gray-100"
                }`}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-col items-center justify-center text-center">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2 text-[#400604]">
                      <Loader2 className="h-7 w-7 animate-spin" />
                      <span className="text-[13px] font-medium">Uploading to Cloudinary...</span>
                    </div>
                  ) : form.imageUrl ? (
                    <div className="relative group">
                      <img
                        src={form.imageUrl}
                        alt="Category"
                        className="h-32 w-32 object-cover rounded-xl border border-gray-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        title="Remove image and delete from Cloudinary"
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full cursor-pointer hover:bg-red-600 shadow-md transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-2.5 rounded-full shadow-xs mb-2 text-[#400604]">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <p className="text-[13px] font-semibold text-gray-800">Drag & drop category image</p>
                      <p className="text-[12px] text-gray-500 my-1">
                        or{" "}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[#400604] font-bold hover:underline"
                        >
                          browse files
                        </button>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">Recommended: 1000×1000px · auto-optimized</p>
                    </>
                  )}
                </div>
              </div>

              {/* Curated Luxury Presets */}
              <div className="mt-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Or Pick Curated Collection Banner Preset:
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {LUXURY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        set("imageUrl", preset.src);
                        set("imageAlt", preset.name);
                      }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border shrink-0 transition text-left ${
                        form.imageUrl === preset.src
                          ? "border-[#400604] bg-amber-50 ring-1 ring-[#400604]"
                          : "border-gray-200 bg-gray-50/80 hover:bg-white"
                      }`}
                    >
                      <img src={preset.src} alt="" className="h-7 w-7 rounded-lg object-cover border border-gray-200 shrink-0" />
                      <span className="text-[12px] font-bold text-gray-800">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Icon */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wider">
                  Category Icon
                </label>
                <div className="flex bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setIconTab("library")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      iconTab === "library" ? "bg-white text-[#400604] shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Library ({CURATED_ICONS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconTab("custom")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      iconTab === "custom" ? "bg-white text-[#400604] shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Custom Emoji
                  </button>
                </div>
              </div>

              {/* Active Icon Pill */}
              {form.icon && (
                <div className="flex items-center justify-between p-2.5 mb-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0 shadow-xs text-lg">
                      {isIconUrl(form.icon) ? (
                        <img src={form.icon} alt="" className="h-5 w-5 object-contain" />
                      ) : (
                        <span>{form.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-gray-800 truncate">
                        {CURATED_ICONS.find((i) => i.icon === form.icon)?.label || "Selected Icon"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("icon", "")}
                    className="text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Curated Icon Grid */}
              {iconTab === "library" && (
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      placeholder="Search icons (dress, saree, bag, shoe, ring)..."
                      className="w-full pl-8 pr-7 py-1.5 text-[12px] rounded-lg border border-gray-200 outline-none bg-white focus:border-[#400604]"
                    />
                    {iconSearch && (
                      <button
                        type="button"
                        onClick={() => setIconSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
                    {ICON_CATEGORIES.map((cat) => {
                      const isSelected = iconCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setIconCategory(cat)}
                          className={`px-2 py-0.5 rounded-md whitespace-nowrap font-medium transition ${
                            isSelected
                              ? "bg-[#400604] text-white font-bold"
                              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/70"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  <div className="max-h-40 overflow-y-auto pr-1">
                    <div className="grid grid-cols-6 sm:grid-cols-7 gap-1">
                      {filteredIcons.map((item) => {
                        const isSelected = form.icon === item.icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => set("icon", item.icon)}
                            title={`${item.label} (${item.category})`}
                            className={`h-9 flex items-center justify-center rounded-lg text-lg transition ${
                              isSelected
                                ? "bg-[#400604] text-white shadow-xs ring-2 ring-[#400604]"
                                : "bg-white hover:bg-amber-50 border border-gray-100"
                            }`}
                          >
                            <span>{item.icon}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Emoji */}
              {iconTab === "custom" && (
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => set("icon", e.target.value)}
                    placeholder="Type or paste any emoji (e.g. 👗, 🥻, 🧵, ✨)"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-[14px] text-gray-800 outline-none focus:border-[#400604] bg-white"
                  />
                  <p className="text-[11px] text-gray-500">
                    Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono text-[10px]">Win + .</kbd> on Windows to open emoji keyboard.
                  </p>
                </div>
              )}
            </div>

            {/* Background Theme */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Background Theme
              </label>
              <select
                value={form.bgTheme}
                onChange={(e) => set("bgTheme", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-700 outline-none bg-white focus:border-[#400604]"
              >
                <option value="slate">Slate</option>
                <option value="blue">Blue</option>
                <option value="rose">Rose</option>
                <option value="emerald">Emerald</option>
                <option value="orange">Orange</option>
                <option value="violet">Violet</option>
                <option value="pink">Pink</option>
                <option value="amber">Amber</option>
              </select>
            </div>

            {/* Live Preview */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-gray-400 mb-2 text-center uppercase tracking-widest">
                Live Storefront Circle Preview
              </label>
              <div className="flex justify-center p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="flex flex-col items-center gap-2">
                  {(() => {
                    const themeColors: Record<string, string> = {
                      slate: "#475569",
                      blue: "#2563eb",
                      rose: "#e11d48",
                      emerald: "#059669",
                      orange: "#ea580c",
                      violet: "#7c3aed",
                      pink: "#db2777",
                      amber: "#b45309",
                    };
                    const hex = themeColors[form.bgTheme] || "#2563eb";
                    const hasIcon = Boolean(form.icon && form.icon.trim() !== "");
                    const hasImg = Boolean(form.imageUrl && form.imageUrl.trim() !== "");

                    return (
                      <div
                        className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full ring-4 ring-white shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${hex}16 0%, ${hex}32 100%)`,
                        }}
                      >
                        {hasIcon ? (
                          isIconUrl(form.icon) ? (
                            <img src={form.icon} alt="" className="h-10 w-10 object-contain" />
                          ) : (
                            <span className="text-3xl select-none">{form.icon}</span>
                          )
                        ) : hasImg ? (
                          <img src={form.imageUrl} alt="" className="h-full w-full object-cover select-none" />
                        ) : (
                          <span className="text-3xl select-none">👗</span>
                        )}
                      </div>
                    );
                  })()}
                  <span className="text-center text-[13px] font-bold text-gray-900 max-w-[140px] truncate">
                    {form.name || "Category"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: SUBCATEGORIES ───────────────────────────────────── */}
        {activeTab === "subcategories" && (
          <div className="space-y-6">
            {!initial.id ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                <FolderOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-[13px] font-bold text-gray-800">Save category first</p>
                <p className="text-[12px] text-gray-500 max-w-xs mx-auto mt-1">
                  Once this category is created and saved, you can add and manage direct subcategories under it.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div>
                    <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                      <FolderOpen className="h-4 w-4 text-[#400604]" />
                      Direct Subcategories ({directChildCats.length})
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Child categories whose primary parent is {catName(form)}
                    </p>
                  </div>
                  {onAddChild && (
                    <button
                      type="button"
                      onClick={() => onAddChild(initial.id!)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#400604] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#5a0906] transition shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Subcategory
                    </button>
                  )}
                </div>

                {directChildCats.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                    <FolderOpen className="h-7 w-7 text-gray-300 mx-auto mb-1.5" />
                    <p className="text-[13px] font-bold text-gray-700">No direct subcategories</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 mb-3">
                      Click &ldquo;Add Subcategory&rdquo; above to create a child category directly under {catName(form)}.
                    </p>
                    {onAddChild && (
                      <button
                        type="button"
                        onClick={() => onAddChild(initial.id!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#400604] text-[#400604] hover:bg-amber-50 text-[12px] font-bold transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> Create Subcategory
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {directChildCats.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-white transition shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {sub.image?.src ? (
                            <img
                              src={sub.image.src}
                              alt=""
                              className="h-8 w-8 rounded-lg object-cover border border-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                              <FolderOpen className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-900 truncate">{catName(sub)}</p>
                            <p className="text-[11px] text-gray-400 font-mono truncate">
                              /{sub.slug} · {sub.count} items
                            </p>
                          </div>
                        </div>
                        {onEditChild && (
                          <button
                            type="button"
                            onClick={() => onEditChild(sub)}
                            className="text-[12px] font-bold text-[#400604] hover:bg-[#400604]/10 px-2.5 py-1 rounded-lg transition"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: CROSS-LISTING ───────────────────────────────────── */}
        {activeTab === "crosslisting" && (
          <div className="space-y-6">
            {/* Informational Explainer Callout */}
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 p-4 space-y-2 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-gray-900">
                    Understanding Cross-Listing vs. Primary Parent
                  </h4>
                  <p className="text-[12px] text-gray-600 leading-relaxed mt-1">
                    A category&apos;s <b>Parent Category</b> defines its primary structural home and canonical URL breadcrumb.
                    <b> Cross-Listing</b> allows you to mirror this category under additional parent departments so customers can discover it across multiple sections without duplicating records or breaking URLs.
                  </p>
                </div>
              </div>
            </div>

            {/* Section A: Mirror THIS Category Under Other Parents */}
            <div className="space-y-3">
              <div className="pb-1 border-b border-gray-100">
                <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  Mirror &ldquo;{catName(form)}&rdquo; Under Other Departments
                </h4>
                <p className="text-[11px] text-gray-500">
                  Select other main departments where this category should also appear in menus
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mainCategoryOptions.filter((m) => m.id !== form.parent).map((mainCat) => {
                  const isChecked = (form.linkedParents || []).includes(mainCat.id);
                  return (
                    <label
                      key={mainCat.id}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[13px] font-semibold cursor-pointer transition select-none ${
                        isChecked
                          ? "bg-amber-100/70 border-amber-300 text-amber-950 font-bold shadow-xs"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const current = form.linkedParents || [];
                          const next = e.target.checked
                            ? [...current, mainCat.id]
                            : current.filter((id) => id !== mainCat.id);
                          set("linkedParents", next);
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-[#400604] focus:ring-[#400604]"
                      />
                      <span className="truncate">{catName(mainCat)}</span>
                      {mainCat.image?.src && (
                        <img
                          src={mainCat.image.src}
                          alt=""
                          className="h-5 w-5 rounded-full ml-auto object-cover border border-gray-200"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
              {mainCategoryOptions.filter((m) => m.id !== form.parent).length === 0 && (
                <p className="text-[12px] text-gray-400 italic">No other main categories available to link under.</p>
              )}
            </div>

            {/* Section B: Collections Cross-Listed Under THIS Category */}
            {mode === "edit" && initial.id && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="pb-1 border-b border-gray-100">
                  <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-[#400604]" />
                    Collections Cross-Listed Under &ldquo;{catName(form)}&rdquo; ({crossListedChildCats.length})
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Categories mirrored inside {catName(form)} while retaining their own primary parents
                  </p>
                </div>

                {crossListedChildCats.length === 0 ? (
                  <div className="p-4 text-center rounded-xl border border-dashed border-amber-200 bg-amber-50/20">
                    <p className="text-[12px] font-semibold text-gray-700">No cross-listed categories linked under this category yet</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Use the picker below to mirror another category under {catName(form)}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {crossListedChildCats.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-200/70 bg-amber-50/40 hover:bg-amber-50/70 transition shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {sub.image?.src ? (
                            <img
                              src={sub.image.src}
                              alt=""
                              className="h-8 w-8 rounded-lg object-cover border border-amber-200 shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-amber-100/70 flex items-center justify-center shrink-0 text-amber-800">
                              <Sparkles className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-[13px] font-bold text-gray-900 truncate">{catName(sub)}</p>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                ✨ Cross-listed
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 font-mono truncate">
                              /{sub.slug} · {sub.count} items
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {onEditChild && (
                            <button
                              type="button"
                              onClick={() => onEditChild(sub)}
                              className="text-[11px] font-bold text-[#400604] hover:bg-[#400604]/10 px-2.5 py-1 rounded-lg transition"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={linkingActionLoading}
                            onClick={() => handleUnlinkChild(sub)}
                            className="text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition disabled:opacity-50"
                            title={`Remove from ${catName(form)}`}
                          >
                            Unlink
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Link Existing Category Control */}
                {linkableCandidates.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50/40 to-white flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-950 mb-1">
                        + Cross-Link Another Category Under {catName(form)}
                      </label>
                      <select
                        value={linkingChildId}
                        onChange={(e) => setLinkingChildId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-800 focus:outline-none focus:border-[#400604]"
                      >
                        <option value="">Select category to cross-list...</option>
                        {linkableCandidates.map((cand) => (
                          <option key={cand.id} value={cand.id}>
                            {catName(cand)} (/{cand.slug}) — {cand.count} items
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={!linkingChildId || linkingActionLoading}
                      onClick={() => {
                        if (typeof linkingChildId === "number") {
                          void handleLinkExistingChild(linkingChildId);
                        }
                      }}
                      className="sm:self-end px-3.5 py-1.5 rounded-lg bg-[#400604] text-white text-[12px] font-bold hover:bg-[#5a0906] transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      {linkingActionLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>Link Under This</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Studio Footer (Sticky) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50/95 backdrop-blur shrink-0 z-20">
        <div>
          {mode === "edit" && form.slug ? (
            <a
              href={`/product-category/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-[#400604] transition"
            >
              View on Storefront <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-[12px] font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-bold text-white bg-[#400604] hover:bg-[#5a0906] rounded-xl shadow-xs transition disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {mode === "add" ? "Create Category" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Move category / products ───────────────────────────────────────── */
function MoveModal({
  cat,
  flat,
  authFetch,
  onClose,
  onDone,
  showToast,
}: {
  cat: WCCategory;
  flat: WCCategory[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onDone: () => Promise<void>;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const banned = descendantIdSet(flat, cat.id);
  const parentOptions = flat.filter((c) => c.id !== cat.id && !banned.has(c.id));
  const [parent, setParent] = useState(cat.parent);
  const [index, setIndex] = useState(() => {
    const ordered = flat.filter((c) => c.parent === cat.parent).sort((a, b) => a.menu_order - b.menu_order);
    return Math.max(0, ordered.findIndex((c) => c.id === cat.id));
  });
  const [moveProducts, setMoveProducts] = useState(false);
  const [productTarget, setProductTarget] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const positionSiblings = siblingsOf(flat, parent, cat.id);
  const productTargets = flat.filter((c) => c.id !== cat.id);

  const submit = async () => {
    if (parent !== 0 && !parentOptions.some((c) => c.id === parent)) {
      setError("Choose a valid parent category");
      return;
    }
    if (moveProducts && !productTarget) {
      setError("Choose a category to move products into");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const relocateRes = await authFetch("/api/admin/categories/relocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, parent, index }),
      });
      if (!relocateRes.ok) {
        const data = await relocateRes.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to move category");
      }
      if (moveProducts && productTarget) {
        const prodRes = await authFetch("/api/admin/categories/move-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: cat.id, to: productTarget }),
        });
        if (!prodRes.ok) throw new Error("Category moved, but products could not be reassigned");
        const result = await prodRes.json();
        showToast(`Moved category and ${result.moved ?? 0} products`);
      } else {
        showToast("Category moved");
      }
      await onDone();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Move failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-[18px] font-black text-gray-900">Move “{catName(cat)}”</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">Change parent, list position, or reassign products.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          {error && <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] font-medium text-red-600"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Place under</label>
            <ParentCategoryPicker
              value={parent}
              options={parentOptions}
              allCats={flat}
              allowRoot
              onChange={(id) => {
                setParent(id);
                setIndex(siblingsOf(flat, id, cat.id).length);
              }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Position in that list</label>
            <PositionPicker siblings={positionSiblings} value={index} onChange={setIndex} />
          </div>
          {(cat.direct_count ?? cat.count) > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={moveProducts} onChange={(e) => setMoveProducts(e.target.checked)} className="mt-1" />
                <span className="text-[13px] text-gray-700">
                  Also move the <b>{cat.direct_count ?? cat.count} products</b> listed directly in this category to another category
                </span>
              </label>
              {moveProducts && (
                <ParentCategoryPicker
                  value={productTarget}
                  options={productTargets}
                  allCats={flat}
                  onChange={setProductTarget}
                />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-[14px] font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-[14px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />} Save move
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Details Drawer ─────────────────────────────────────────────────── */
function NestedSubList({
  flat,
  parentId,
  depth = 0,
  onEdit,
}: {
  flat: WCCategory[];
  parentId: number;
  depth?: number;
  onEdit: (c: WCCategory) => void;
}) {
  const kids = directChildren(flat, parentId);
  if (kids.length === 0) return null;
  return (
    <ul className={depth === 0 ? "space-y-2" : "mt-2 space-y-2 border-l border-gray-200 pl-3"}>
      {kids.map((sub) => {
        const nestedCount = flat.filter((c) => c.parent === sub.id).length;
        return (
          <li key={sub.id}>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-3 min-w-0">
                {sub.image?.src ? (
                  <img src={sub.image.src} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                    <FolderOpen className="h-3 w-3 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 truncate">{catName(sub)}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    /{sub.slug} · {sub.count} products
                    {nestedCount > 0 ? ` · ${nestedCount} sub` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onEdit(sub)}
                className="shrink-0 text-blue-600 hover:text-blue-800 text-[12px] font-bold px-2"
              >
                Edit
              </button>
            </div>
            <NestedSubList flat={flat} parentId={sub.id} depth={depth + 1} onEdit={onEdit} />
          </li>
        );
      })}
    </ul>
  );
}

function DetailsDrawer({
  cat,
  flat,
  onClose,
  onEdit,
  onAddChild,
}: {
  cat: WCCategory;
  flat: WCCategory[];
  onClose: () => void;
  onEdit: (c: WCCategory) => void;
  onAddChild: (parentId: number) => void;
}) {
  const active = getStatus(cat);
  const directSubs = directChildren(flat, cat.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-[18px] font-black text-gray-900">Category Details</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col items-center text-center mb-8">
            {cat.image?.src ? (
              <img src={cat.image.src} alt={catName(cat)} className="h-28 w-28 object-cover rounded-2xl border border-gray-200 shadow-sm mb-4" />
            ) : (
              <div className="h-28 w-28 bg-gray-100 rounded-2xl flex items-center justify-center mb-4"><FolderOpen className="h-10 w-10 text-gray-400" /></div>
            )}
            <h3 className="text-[22px] font-black text-gray-900">{catName(cat)}</h3>
            <p className="text-[13px] text-gray-500 font-mono mt-1">/{cat.slug}</p>
            {cat.parent !== 0 && (
              <p className="text-[12px] text-gray-400 mt-1">{categoryPath(flat, cat.id)}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg ${active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{active ? "Active" : "Inactive"}</span>
              <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 rounded-lg">{cat.parent === 0 ? "Main Category" : "Sub Category"}</span>
            </div>
          </div>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between py-3 border-b border-gray-50"><span className="text-[13px] font-bold text-gray-500">Products</span><span className="text-[14px] font-semibold text-gray-900">{cat.count} items</span></div>
            <div className="flex justify-between py-3 border-b border-gray-50"><span className="text-[13px] font-bold text-gray-500">Sort Order</span><span className="text-[14px] font-semibold text-gray-900">{cat.menu_order}</span></div>
            {cat.description && <div className="py-3 border-b border-gray-50"><span className="block text-[13px] font-bold text-gray-500 mb-1">Description</span><p className="text-[14px] text-gray-800 leading-relaxed">{cat.description}</p></div>}
          </div>
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="text-[15px] font-black text-gray-900">Subcategories ({directSubs.length})</h4>
              <button
                type="button"
                onClick={() => onAddChild(cat.id)}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add sub
              </button>
            </div>
            {directSubs.length > 0 ? (
              <NestedSubList
                flat={flat}
                parentId={cat.id}
                onEdit={(c) => { onClose(); onEdit(c); }}
              />
            ) : (
              <p className="text-[13px] text-gray-500">No subcategories yet.</p>
            )}
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={() => { onClose(); onEdit(cat); }} className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl text-[14px] font-bold hover:bg-gray-800 transition"><Pencil className="h-4 w-4" /> Edit Category</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Client Cache for Instant Tab Switching ──────────────────────── */
let cachedFlatCategories: WCCategory[] | null = null;
let cachedTreeCategories: CategoryTree[] | null = null;

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function AdminCategoriesPage() {
  const { authFetch } = useAuth();
  const [flat, setFlat] = useState<WCCategory[]>(cachedFlatCategories || []);
  const [tree, setTree] = useState<CategoryTree[]>(cachedTreeCategories || []);
  const [loading, setLoading] = useState(!cachedFlatCategories);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [studio, setStudio] = useState<{ mode: "add" | "edit"; initial: FormData & { id?: number } } | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<"explorer" | "studio">("explorer");
  const [moveCat, setMoveCat] = useState<WCCategory | null>(null);
  const [deleteCat, setDeleteCat] = useState<WCCategory | null>(null);
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    initialType?: "main" | "sub";
    initialParentId?: number;
  } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all"|"main"|"sub">("all");
  const [filterStatus, setFilterStatus] = useState<"all"|"active"|"inactive">("all");

  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [activeMenuCatId, setActiveMenuCatId] = useState<number | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (activeMenuCatId !== null) setActiveMenuCatId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [activeMenuCatId]);

  const toggleCollapse = (id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => setCollapsedIds(new Set(parentsWithChildrenIds(flat)));

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const flatRef = useRef<WCCategory[]>(flat);
  flatRef.current = flat;

  const selectedCatIdRef = useRef<number | null>(null);
  const initialSelectedRef = useRef(false);

  const selectForStudio = useCallback((cat: WCCategory, allCats?: WCCategory[]) => {
    selectedCatIdRef.current = cat.id;
    setSelectedCatId(cat.id);
    const list = allCats || flatRef.current;
    const ordered = list.filter((c) => c.parent === cat.parent).sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0));
    const sortOrder = Math.max(0, ordered.findIndex((c) => c.id === cat.id));
    const iconMeta = cat.meta_data?.find(m => (m.key === "_angkon_icon" || m.key === "_plainstitch_icon"))?.value;
    const bgMeta = cat.meta_data?.find(m => (m.key === "_angkon_bgTheme" || m.key === "_plainstitch_bgTheme"))?.value;
    setStudio({
      mode: "edit",
      initial: {
        id: cat.id,
        type: cat.parent === 0 ? "main" : "sub",
        name: cat.name,
        slug: cat.slug,
        description: cat.description || "",
        parent: cat.parent,
        linkedParents: Array.isArray(cat.linked_parents) ? cat.linked_parents : [],
        sortOrder,
        isActive: getStatus(cat),
        imageUrl: cat.image?.src ?? "",
        imageAlt: cat.image?.alt ?? "",
        imageId: cat.image?.id ?? null,
        icon: typeof iconMeta === "string" ? iconMeta : "",
        bgTheme: typeof bgMeta === "string" ? bgMeta : "blue",
      },
    });
    setMobileTab("studio");
  }, []);

  const load = useCallback(async (soft = false) => {
    if (!cachedFlatCategories && !soft) setLoading(true);
    try {
      const res = await authFetch("/api/admin/categories");
      if (res.status === 401) {
        window.location.href = "/admin";
        return;
      }
      const data: WCCategory[] = await res.json();
      if (Array.isArray(data)) {
        cachedFlatCategories = data;
        const built = buildTree(data);
        cachedTreeCategories = built;
        flatRef.current = data;
        setFlat(data);
        setTree(built);
        if (!initialSelectedRef.current) setCollapsedIds(new Set(parentsWithChildrenIds(data)));

        // If studio is open on a category, refresh its data in the studio
        const currentSelectedId = selectedCatIdRef.current;
        if (currentSelectedId) {
          const fresh = data.find((c) => c.id === currentSelectedId);
          if (fresh) {
            selectForStudio(fresh, data);
          }
        } else if (!initialSelectedRef.current && data.length > 0) {
          // Auto-select first main category ONLY on initial load
          const first = data.find((c) => c.parent === 0) || data[0];
          if (first) {
            selectForStudio(first, data);
          }
        }
        initialSelectedRef.current = true;
      }
    } finally { setLoading(false); }
  }, [authFetch, selectForStudio]);

  useEffect(() => {
    void load(Boolean(cachedFlatCategories));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-expand ancestors when search matches nested categories
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q || flat.length === 0) return;
    const toExpand = new Set<number>();
    flat.forEach((c) => {
      const nameMatch = catName(c).toLowerCase().includes(q);
      const slugMatch = c.slug.toLowerCase().includes(q);
      if (nameMatch || slugMatch) {
        ancestorIdsOf(flat, c.id).forEach((id) => toExpand.add(id));
      }
    });
    if (toExpand.size === 0) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      toExpand.forEach((id) => next.delete(id));
      return next;
    });
  }, [search, flat]);

  const handleSave = async (data: FormData & { id?: number }) => {
    const parent = data.type === "main" ? 0 : data.parent;
    const payload = {
      name: data.name.trim(),
      slug: data.slug.trim() || slugify(data.name),
      description: data.description,
      parent,
      linked_parents: data.linkedParents || [],
      menu_order: data.sortOrder,
      imageUrl: data.imageUrl || "",
      imageId: data.imageId,
      imageAlt: data.imageAlt || data.name,
      icon: data.icon || "",
      bgTheme: data.bgTheme || "blue",
      meta_data: [
        { key: "_is_active", value: String(data.isActive) },
        { key: "ps_category_image", value: data.imageUrl || "" },
        { key: "_angkon_icon", value: data.icon },
        { key: "_angkon_bgTheme", value: data.bgTheme },
      ],
      image: data.imageUrl
        ? {
            id: data.imageId || Date.now(),
            src: data.imageUrl,
            alt: data.imageAlt || data.name,
          }
        : null,
    };

    let categoryId = data.id;
    if (data.id) {
      const res = await authFetch(`/api/admin/categories/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to update category");
      }
    } else {
      const res = await authFetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.details || err.message || err.error || "Failed to create category");
      }
      const created = await res.json();
      categoryId = created.id;
    }

    if (categoryId) {
      const relocateRes = await authFetch("/api/admin/categories/relocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryId, parent, index: data.sortOrder }),
      });
      if (!relocateRes.ok) throw new Error("Saved, but could not update list position");
    }

    showToast(data.id ? "Category updated successfully!" : "Category created successfully!");
    if (categoryId) {
      selectedCatIdRef.current = categoryId;
      setSelectedCatId(categoryId);
    }
    await load(true);
  };

  const handleDelete = (e: React.MouseEvent, cat: WCCategory) => {
    e.stopPropagation();
    if (cat.slug === "uncategorized") {
      showToast("The default Uncategorized category cannot be deleted.", false);
      return;
    }
    setDeleteCat(cat);
  };

  const confirmDelete = async () => {
    if (!deleteCat) return;
    setDeleting(deleteCat.id);
    try {
      const res = await authFetch(`/api/admin/categories?id=${deleteCat.id}&delete_products=true`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || data.message || "Failed to delete category", false);
        return;
      }
      const extra = data.deletedProducts ? ` and ${data.deletedProducts} product${data.deletedProducts === 1 ? "" : "s"}` : "";
      showToast(`“${catName(deleteCat)}” deleted${extra}`);
      if (selectedCatIdRef.current === deleteCat.id) {
        selectedCatIdRef.current = null;
        setSelectedCatId(null);
        setStudio(null);
      }
      setDeleteCat(null);
      await load(true);
    } finally {
      setDeleting(null);
    }
  };

  // Filter Logic
  const filteredTree = useMemo(() => {
    let result = tree;
    if (filterType === "main") result = result.filter(c => c.parent === 0);
    if (filterType === "sub") {
      const allSubs = flat.filter(c => c.parent !== 0);
      return allSubs.map(s => ({ ...s, children: [] })) as CategoryTree[];
    }

    const deepFilter = (nodes: CategoryTree[]): CategoryTree[] => {
      return nodes.reduce((acc, node) => {
        const matchesSearch = search === "" || catName(node).toLowerCase().includes(search.toLowerCase()) || node.slug.toLowerCase().includes(search.toLowerCase());
        const nodeActive = getStatus(node);
        const matchesStatus = filterStatus === "all" || (filterStatus === "active" ? nodeActive : !nodeActive);

        const filteredChildren = deepFilter(node.children as CategoryTree[]);

        if ((matchesSearch && matchesStatus) || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, [] as CategoryTree[]);
    };

    return deepFilter(result);
  }, [tree, flat, search, filterType, filterStatus]);

  /* ── Drag & Drop (reorder, nest under another category, or move back to Main) ── */
  type DropTarget = { id: number; pos: "before" | "after" | "inside" } | { id: "root" } | null;
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const dndEnabled = !search.trim() && filterType === "all" && filterStatus === "all";

  const endDrag = () => {
    setDragId(null);
    setDropTarget(null);
  };

  const handleDragStart = (e: React.DragEvent, cat: WCCategory) => {
    e.dataTransfer.effectAllowed = "move";
    // Firefox only starts a drag when some data is set.
    e.dataTransfer.setData("text/plain", String(cat.id));
    setDragId(cat.id);
  };

  /** A category can't be dropped onto itself or anything inside it. */
  const isInvalidDrop = (targetId: number) =>
    dragId === null || targetId === dragId || descendantIdSet(flatRef.current, dragId).has(targetId);

  const handleRowDragOver = (e: React.DragEvent, cat: WCCategory) => {
    if (dragId === null) return;
    if (isInvalidDrop(cat.id)) {
      e.dataTransfer.dropEffect = "none";
      if (dropTarget) setDropTarget(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const pos: "before" | "after" | "inside" = ratio < 0.28 ? "before" : ratio > 0.72 ? "after" : "inside";
    setDropTarget((prev) =>
      prev && "pos" in prev && prev.id === cat.id && prev.pos === pos ? prev : { id: cat.id, pos },
    );
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    if (dragId === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget((prev) => (prev && "id" in prev && prev.id === "root" ? prev : { id: "root" }));
  };

  /** Persist a move: put `dragged` under `newParent` at `position`, renumbering that sibling list. */
  const performMove = async (draggedId: number, newParent: number, beforeSiblingId: number | null, afterSiblingId: number | null) => {
    const all = flatRef.current;
    const dragged = all.find((c) => c.id === draggedId);
    if (!dragged) return;
    if (newParent === draggedId || descendantIdSet(all, draggedId).has(newParent)) {
      showToast("A category can't be placed inside itself or its own sub-category.", false);
      return;
    }

    const siblings = sortedChildrenOf(all, newParent).filter((c) => c.id !== draggedId);
    let insertAt = siblings.length;
    if (beforeSiblingId !== null) insertAt = Math.max(0, siblings.findIndex((c) => c.id === beforeSiblingId));
    else if (afterSiblingId !== null) insertAt = siblings.findIndex((c) => c.id === afterSiblingId) + 1;
    siblings.splice(insertAt, 0, dragged);

    const items = siblings.map((c, i) => ({ id: c.id, menu_order: i, parent: newParent }));
    const unchanged =
      dragged.parent === newParent && items.every((it) => (all.find((c) => c.id === it.id)?.menu_order ?? -1) === it.menu_order);
    if (unchanged) return;

    // Optimistic update so the tree reflects the move immediately.
    const orderById = new Map(items.map((it) => [it.id, it.menu_order]));
    const optimistic = all.map((c) =>
      orderById.has(c.id) ? { ...c, parent: newParent, menu_order: orderById.get(c.id)! } : c,
    );
    flatRef.current = optimistic;
    cachedFlatCategories = optimistic;
    setFlat(optimistic);
    setTree(buildTree(optimistic));
    if (newParent) setCollapsedIds((prev) => { const next = new Set(prev); next.delete(newParent); return next; });

    try {
      const res = await authFetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Could not save the new position");
      }
      const parentName = newParent ? catName(all.find((c) => c.id === newParent) || { name: "category" }) : "Main categories";
      showToast(dragged.parent === newParent ? "Order saved" : `Moved “${catName(dragged)}” to ${parentName}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save the move", false);
    }
    await load(true); // re-sync with the database (also reverts the optimistic change on failure)
  };

  const handleDrop = (e: React.DragEvent, cat: WCCategory) => {
    e.preventDefault();
    const target = dropTarget;
    const id = dragId;
    endDrag();
    if (id === null || !target || !("pos" in target) || target.id !== cat.id || isInvalidDrop(cat.id)) return;
    if (target.pos === "inside") void performMove(id, cat.id, null, null);
    else if (target.pos === "before") void performMove(id, cat.parent, cat.id, null);
    else void performMove(id, cat.parent, null, cat.id);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = dragId;
    endDrag();
    if (id !== null) void performMove(id, 0, null, null);
  };

  const moveCategory = async (catId: number, parentId: number, direction: "up" | "down") => {
    const siblings = sortedChildrenOf(flatRef.current, parentId);
    const curIdx = siblings.findIndex((c) => c.id === catId);
    if (curIdx === -1) return;
    const targetIdx = direction === "up" ? curIdx - 1 : curIdx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    const neighbour = siblings[targetIdx];
    await performMove(catId, parentId, direction === "up" ? neighbour.id : null, direction === "down" ? neighbour.id : null);
  };

  const openAdd = () => {
    setCreateModal({
      isOpen: true,
      initialType: "main",
      initialParentId: 0,
    });
  };

  const openAddUnder = (parentId: number) => {
    setCreateModal({
      isOpen: true,
      initialType: "sub",
      initialParentId: parentId,
    });
  };

  const openEdit = (cat: WCCategory) => {
    selectForStudio(cat);
  };

  const renderRow = (cat: CategoryTree, depth = 0, index: number) => {
    const active = getStatus(cat);
    const hasChildren = cat.children.length > 0;
    const isCollapsed = collapsedIds.has(cat.id);
    const childCount = cat.children.length;
    const isSelected = selectedCatId === cat.id;
    const isMenuOpen = activeMenuCatId === cat.id;

    const linkedParentNames = Array.isArray(cat.linked_parents) && cat.linked_parents.length > 0
      ? cat.linked_parents
          .map((pid) => catName(flat.find((p) => p.id === pid) || { name: `#${pid}` }))
          .filter(Boolean)
      : [];

    return (
      <div key={`${cat.id}-${depth}-${cat.is_linked ? 'linked' : 'direct'}`} className={isMenuOpen ? "relative z-30" : "relative"}>
        <div
          draggable={dndEnabled && !cat.is_linked}
          onDragStart={(e) => handleDragStart(e, cat)}
          onDragOver={(e) => handleRowDragOver(e, cat)}
          onDrop={(e) => handleDrop(e, cat)}
          onDragEnd={endDrag}
          onClick={() => openEdit(cat)}
          className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 transition cursor-pointer group select-none ${
            dragId === cat.id ? "opacity-40" : ""
          } ${
            dropTarget && "pos" in dropTarget && dropTarget.id === cat.id
              ? dropTarget.pos === "before"
                ? "shadow-[inset_0_3px_0_0_#400604]"
                : dropTarget.pos === "after"
                ? "shadow-[inset_0_-3px_0_0_#400604]"
                : "bg-amber-100/80 ring-2 ring-inset ring-[#400604]/50"
              : ""
          } ${
            isSelected
              ? "bg-amber-50/80 border-l-4 border-l-[#400604] shadow-2xs"
              : cat.is_linked
              ? "bg-amber-50/30 hover:bg-amber-50/60"
              : depth > 0
              ? "bg-slate-50/40 hover:bg-amber-50/30"
              : "bg-white hover:bg-gray-50/90"
          }`}
        >
          {/* Drag Handle + Expand + Tree Indentation Guide */}
          <div
            className="flex items-center gap-1 shrink-0"
            style={{ paddingLeft: `${Math.min(depth * 20, 60)}px` }}
          >
            {/* Visual branch guide for subcategories */}
            {depth > 0 && (
              <span className="w-2.5 h-4 border-l-2 border-b-2 border-gray-200 rounded-bl-sm -ml-2 mr-1 inline-block" />
            )}

            {/* Drag Grip */}
            <div
              className={`w-4 text-gray-300 transition flex items-center justify-center ${
                cat.is_linked ? "opacity-20 cursor-not-allowed" : "cursor-grab hover:text-gray-700"
              }`}
              title={
                cat.is_linked
                  ? "Cross-listed category"
                  : dndEnabled
                  ? "Drag to reorder, or drop onto another category to nest"
                  : "Clear search and filters to drag"
              }
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>

            {/* Expand / Collapse Chevron */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(cat.id);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition"
                aria-label={isCollapsed ? "Expand subcategories" : "Collapse subcategories"}
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`} />
              </button>
            ) : (
              <span className="w-6" />
            )}
          </div>

          {/* Thumbnail / Category Icon */}
          <div className="relative shrink-0 flex items-center justify-center">
            {cat.image?.src ? (
              <img
                src={cat.image.src}
                alt={catName(cat)}
                className={`rounded-xl object-cover border border-gray-200 shadow-2xs bg-white ${
                  depth === 0 ? "h-10 w-10 sm:h-11 sm:w-11" : "h-8 w-8 sm:h-9 sm:w-9"
                }`}
              />
            ) : (
              <div
                className={`rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200/60 ${
                  depth === 0 ? "h-10 w-10 sm:h-11 sm:w-11" : "h-8 w-8 sm:h-9 sm:w-9"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
              </div>
            )}
            {(() => {
              const iconMeta = cat.meta_data?.find((m) => m.key === "_angkon_icon" || m.key === "_plainstitch_icon")?.value;
              if (iconMeta && typeof iconMeta === "string" && iconMeta.trim() !== "") {
                const isUrl = isIconUrl(iconMeta);
                return (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-2xs border border-gray-100 text-[11px] leading-none p-[2px] z-10 flex items-center justify-center overflow-hidden">
                    {isUrl ? <img src={iconMeta} alt="" className="h-3 w-3 object-contain" /> : iconMeta}
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`font-bold truncate ${
                  depth === 0 ? "text-[14px] text-gray-900" : "text-[13px] text-gray-800"
                }`}
              >
                {catName(cat)}
              </span>

              {cat.is_linked ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-md shrink-0"
                  title="Cross-listed under this collection (primary parent remains unchanged)"
                >
                  <Sparkles className="h-2.5 w-2.5 text-amber-700" />
                  Cross-listed
                </span>
              ) : depth === 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-gray-100 text-gray-600 shrink-0">
                  Root
                </span>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 uppercase tracking-wide shrink-0">
                  Sub
                </span>
              )}

              {hasChildren && (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/70 px-1.5 py-0.2 rounded-md shrink-0">
                  {childCount} {childCount === 1 ? "sub" : "subs"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-[11px] text-gray-400 font-mono truncate">/{cat.slug}</span>
              {!cat.is_linked && linkedParentNames.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100/90 text-amber-900 border border-amber-200/80 shrink-0">
                  <Sparkles className="h-2.5 w-2.5 text-amber-700 shrink-0" />
                  Also under: {linkedParentNames.join(", ")}
                </span>
              )}
            </div>
          </div>

          {/* Item count */}
          <div className="shrink-0 text-center hidden md:block">
            <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
              {cat.count} items
            </span>
          </div>

          {/* Storefront Status Badge */}
          <div className="shrink-0 hidden sm:flex items-center">
            {active ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Hidden
              </span>
            )}
          </div>

          {/* Primary Action: Clear Edit Button */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openEdit(cat)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[12px] font-bold text-[#400604] bg-[#400604]/5 hover:bg-[#400604] hover:text-white transition shadow-2xs"
              title="Edit in Studio"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>

            {/* Secondary Actions: Accessible Three-Dot Overflow Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenuCatId(isMenuOpen ? null : cat.id)}
                className={`p-1.5 rounded-xl transition ${
                  isMenuOpen
                    ? "bg-[#400604] text-white shadow-xs"
                    : "text-gray-400 hover:text-gray-800 hover:bg-gray-100"
                }`}
                title="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuCatId(null);
                      openAddUnder(cat.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-gray-700 hover:bg-amber-50/70 hover:text-[#400604] transition"
                  >
                    <Plus className="h-4 w-4 text-[#400604]" />
                    <span>Add Subcategory</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuCatId(null);
                      setMoveCat(cat);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <ArrowRightLeft className="h-4 w-4 text-gray-500" />
                    <span>Move / Relocate</span>
                  </button>
                  <a
                    href={`/product-category/${cat.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setActiveMenuCatId(null)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-500" />
                    <span>View on Storefront</span>
                  </a>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={(e) => {
                      setActiveMenuCatId(null);
                      handleDelete(e, cat);
                    }}
                    disabled={deleting === cat.id}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                  >
                    {deleting === cat.id ? <Loader2 className="h-4 w-4 animate-spin text-red-600" /> : <Trash2 className="h-4 w-4 text-red-500" />}
                    <span>Delete Category</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasChildren && !isCollapsed && cat.children.map((child, i) => renderRow(child as CategoryTree, depth + 1, i))}
      </div>
    );
  };

  const activeCount = flat.filter(c => getStatus(c)).length;
  const mainCount = flat.filter(c => c.parent === 0).length;
  const subCount = flat.length - mainCount;

  return (
    <div className="w-full max-w-[1920px] mx-auto min-h-screen space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl text-[14px] font-bold text-white transition-all ${toast.ok ? "bg-emerald-600" : "bg-red-500"}`}>
          {toast.ok ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast.msg}
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#400604] bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60 shadow-2xs">
              In-Page Category Studio
            </span>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
              {flat.length} total categories
            </span>
          </div>
          <h1 className="text-[26px] sm:text-[28px] font-black text-gray-900 tracking-tight">Categories & Hierarchy</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Manage main collections, nested sub-categories, and cross-listed categories directly in-page.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-bold text-gray-700 transition shadow-2xs"
            title="Refresh categories from database"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#400604] hover:bg-[#5a0906] text-[13px] font-bold text-white transition shadow-sm hover:shadow-md"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Categories</p>
          <p className="text-[24px] font-black text-gray-900">{flat.length}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Main Categories</p>
          <p className="text-[24px] font-black text-gray-900">{mainCount}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Subcategories</p>
          <p className="text-[24px] font-black text-gray-900">{subCount}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active Storefront</p>
          <p className="text-[24px] font-black text-emerald-600">{activeCount}</p>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab("explorer")}
          className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition ${
            mobileTab === "explorer" ? "bg-white text-[#400604] shadow-xs" : "text-gray-500"
          }`}
        >
          Categories List ({flat.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("studio")}
          className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition ${
            mobileTab === "studio" ? "bg-white text-[#400604] shadow-xs" : "text-gray-500"
          }`}
        >
          In-Page Studio {studio ? `(${studio.mode === "add" ? "Create" : "Editing"})` : ""}
        </button>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
        {/* Left Column: Explorer Tree (5 cols) */}
        <div className={`lg:col-span-5 ${mobileTab === "studio" ? "hidden lg:block" : "block"}`}>
          {/* Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-2xs mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-[#400604] transition bg-gray-50/50 focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 justify-between flex-wrap">
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={expandAll}
                  className="px-2 py-1 rounded text-[11px] font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition"
                  title="Expand all"
                >
                  Expand
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2 py-1 rounded text-[11px] font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition"
                  title="Collapse all"
                >
                  Collapse
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "all" | "main" | "sub")}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-gray-700 outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="main">Main Only</option>
                  <option value="sub">Subs Only</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-gray-700 outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tree Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span>Category Hierarchy</span>
                <span className="text-[10px] font-mono text-gray-400">({filteredTree.length} roots)</span>
              </div>
              <div className="hidden sm:block">Storefront Status & Actions</div>
              <div className="sm:hidden">Actions</div>
            </div>

            {loading ? (
              <div className="flex flex-col divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="h-7 w-7 rounded-lg bg-gray-100" />
                    <div className="h-9 w-9 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 rounded bg-gray-100" />
                      <div className="h-2.5 w-20 rounded bg-gray-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="py-16 text-center px-4">
                <SearchX className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-[14px] font-bold text-gray-800">No categories found</p>
                <p className="text-[12px] text-gray-400 max-w-xs mx-auto mt-0.5">
                  Try clearing your search query or filters.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100/80">
                {filteredTree.map((cat, i) => renderRow(cat, 0, i))}
                {dndEnabled && dragId !== null && (
                  <div
                    onDragOver={handleRootDragOver}
                    onDrop={handleRootDrop}
                    onDragLeave={() => setDropTarget((prev) => (prev && "id" in prev && prev.id === "root" ? null : prev))}
                    className={`m-3 rounded-xl border-2 border-dashed px-4 py-4 text-center text-[12px] font-bold transition ${
                      dropTarget && "id" in dropTarget && dropTarget.id === "root"
                        ? "border-[#400604] bg-amber-100/70 text-[#400604]"
                        : "border-gray-300 text-gray-400"
                    }`}
                  >
                    Drop here to make it a Main category
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: In-Page Category Studio (7 cols, sticky) */}
        <div className={`lg:col-span-7 ${mobileTab === "explorer" ? "hidden lg:block" : "block"}`}>
          {studio ? (
            <CategoryStudio
              mode={studio.mode}
              initial={studio.initial}
              flat={flat}
              onSave={handleSave}
              onClose={() => {
                setStudio(null);
                selectedCatIdRef.current = null;
                setSelectedCatId(null);
                setMobileTab("explorer");
              }}
              onEditChild={(c) => openEdit(c)}
              onAddChild={(parentId) => openAddUnder(parentId)}
              onReload={() => load(true)}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-8 text-center flex flex-col items-center justify-center min-h-[460px]">
              <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-[#400604] mb-4 shadow-xs">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h3 className="text-[17px] font-black text-gray-900 mb-1">In-Page Category Studio</h3>
              <p className="text-[13px] text-gray-500 max-w-md mb-6 leading-relaxed">
                Select any category from the explorer on the left to edit it in-page, manage its subcategories, or configure multi-parent cross-listing.
              </p>
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#400604] hover:bg-[#5a0906] text-[13px] font-bold text-white shadow-xs transition"
              >
                <Plus className="h-4 w-4" /> Create New Category
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteCat && (
        <DeleteConfirmModal
          cat={deleteCat}
          subCount={subtreeList(flat, deleteCat.id).length - 1}
          productCount={deleteCat.count || 0}
          deleting={deleting === deleteCat.id}
          onClose={() => { if (deleting !== deleteCat.id) setDeleteCat(null); }}
          onConfirm={() => void confirmDelete()}
        />
      )}
      {moveCat && (
        <MoveModal
          cat={moveCat}
          flat={flat}
          authFetch={authFetch}
          onClose={() => setMoveCat(null)}
          onDone={load}
          showToast={showToast}
        />
      )}
      {createModal?.isOpen && (
        <CreateCategoryModal
          isOpen={createModal.isOpen}
          initialType={createModal.initialType || "main"}
          initialParentId={createModal.initialParentId || 0}
          flat={flat}
          authFetch={authFetch}
          onClose={() => setCreateModal(null)}
          onCreated={async (newId) => {
            selectedCatIdRef.current = newId;
            setSelectedCatId(newId);
            await load(true);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
