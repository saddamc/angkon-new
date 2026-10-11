"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus, Pencil, Trash2, RefreshCw, ChevronRight, X, Loader2,
  FolderOpen, Tag, ImageIcon, Check, AlertCircle, UploadCloud,
  Search, Filter, GripVertical, CheckCircle2, XCircle, SearchX, ChevronDown,
  ArrowRightLeft
} from "lucide-react";
import { decodeHtmlCharCodes } from "@/utils/category-display";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface WCCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  count: number;
  menu_order: number;
  meta_data?: { id?: number; key: string; value: any }[];
  image?: { id?: number; src: string; alt?: string } | null;
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
  const sortRecursive = (nodes: CategoryTree[]) => {
    nodes.sort((a, b) => a.menu_order - b.menu_order);
    nodes.forEach((n) => sortRecursive(n.children as CategoryTree[]));
  };
  sortRecursive(roots);
  return roots;
}

/** Every category id that currently has at least one child */
function parentsWithChildrenIds(flat: WCCategory[]): number[] {
  const parents = new Set<number>();
  flat.forEach((c) => {
    if (c.parent) parents.add(c.parent);
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

/* ─── Modal ──────────────────────────────────────────────────────────── */
interface FormData {
  type: "main" | "sub";
  name: string;
  slug: string;
  description: string;
  parent: number;
  imageUrl: string;
  imageAlt: string;
  imageId: number | null;
  isActive: boolean;
  sortOrder: number;
  icon: string;
  bgTheme: string;
}

const EMPTY_FORM: FormData = { type: "main", name: "", slug: "", description: "", parent: 0, imageUrl: "", imageAlt: "", imageId: null, isActive: true, sortOrder: 0, icon: "", bgTheme: "blue" };

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

  // PlainStitch, Sewing & Craft
  { label: "Sewing Thread", icon: "🧵", category: "Sewing & Craft", tags: ["thread", "spool", "stitch", "plainstitch", "yarn"] },
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

function CategoryModal({
  mode,
  initial,
  flat,
  onSave,
  onClose,
  onEditChild,
  onAddChild,
}: {
  mode: "add" | "edit";
  initial: FormData & { id?: number };
  flat: WCCategory[];
  onSave: (data: FormData & { id?: number }) => Promise<void>;
  onClose: () => void;
  onEditChild?: (cat: WCCategory) => void;
  onAddChild?: (parentId: number) => void;
}) {
  const { authFetch } = useAuth();
  const [form, setForm] = useState<FormData>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [iconTab, setIconTab] = useState<"library" | "custom">("library");
  const [iconSearch, setIconSearch] = useState("");
  const [iconCategory, setIconCategory] = useState<string>("All");

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
  const destParent = form.type === "main" ? 0 : form.parent;
  const positionSiblings = siblingsOf(flat, destParent, initial.id);
  const childCats = initial.id ? directChildren(flat, initial.id) : [];

  const set = (key: keyof FormData, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleNameChange = (name: string) => setForm((prev) => ({ ...prev, name, slug: slugify(name) }));

  const sessionUploadedRef = useRef<Array<{ id: number | null; url: string }>>([]);
  const isSavedRef = useRef(false);

  const handleClose = async () => {
    // If user uploaded an image in this modal session but didn't save, clean it from Cloudinary
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (form.type === "sub" && !form.parent) { setError("Please select a parent category"); return; }
    setSaving(true);
    setError("");
    try {
      isSavedRef.current = true;
      await onSave({ ...form, id: initial.id });
    }
    catch (err: any) {
      isSavedRef.current = false;
      setError(err.message || "Failed to save");
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
    if (file.size > 5 * 1024 * 1024) return setError("Image exceeds max size (5MB).");
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

      const fd = new FormData();
      fd.append("image", file);
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
        throw new Error((d.error || "Upload failed") + detail);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") void handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-[18px] font-black text-gray-900">{mode === "add" ? "Add Category" : "Edit Category"}</h2>
            {mode === "edit" && initial.id ? (
              <p className="text-[12px] text-gray-500 mt-0.5 font-mono">/{initial.slug || "…"}</p>
            ) : null}
          </div>
          <button type="button" onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 transition"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] font-medium text-red-600 mb-6"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Category Type</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button type="button" onClick={() => { set("type", "main"); set("parent", 0); set("sortOrder", siblingsOf(flat, 0, initial.id).length); }} className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition ${form.type === "main" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>Main Category</button>
                  <button
                    type="button"
                    onClick={() => set("type", "sub")}
                    className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition ${form.type === "sub" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Sub Category
                  </button>
                </div>
                <p className="text-[12px] text-gray-400 mt-1.5">You can move this category (and its children) under any other category.</p>
              </div>
              {form.type === "sub" && (
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Parent Category <span className="text-red-500">*</span></label>
                  <ParentCategoryPicker
                    value={form.parent}
                    options={parentOptions}
                    allCats={flat}
                    onChange={(id) => {
                      setForm((prev) => ({ ...prev, parent: id, sortOrder: siblingsOf(flat, id, initial.id).length }));
                    }}
                  />
                </div>
              )}
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Place in list</label>
                <PositionPicker
                  siblings={positionSiblings}
                  value={form.sortOrder}
                  onChange={(index) => set("sortOrder", index)}
                />
              </div>
              {form.name && (
                <div className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium -mt-2">
                  <span>Will appear as:</span>
                  {form.type === "sub" && form.parent ? (
                    <span className="flex items-center gap-1 text-gray-700 font-bold">
                      {catName(flat.find((p) => p.id === form.parent) ?? { name: "…" })} <ChevronRight className="h-3 w-3 text-gray-400" /> {form.name}
                    </span>
                  ) : (
                    <span className="text-gray-700 font-bold">{form.name}</span>
                  )}
                </div>
              )}
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Men's T-Shirts" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" required />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Slug</label>
                <input type="text" value={form.slug} onChange={(e) => set("slug", e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] font-mono text-gray-600 bg-gray-50 outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-700 outline-none focus:border-blue-400" />
              </div>

              {/* Subcategories panel (edit parent) */}
              {mode === "edit" && initial.id ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-[13px] font-black uppercase tracking-wider text-gray-500">
                      Subcategories ({childCats.length})
                    </h3>
                    {onAddChild && (
                      <button
                        type="button"
                        onClick={() => onAddChild(initial.id!)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add sub
                      </button>
                    )}
                  </div>
                  {childCats.length === 0 ? (
                    <p className="text-[13px] text-gray-500 py-2">No subcategories under this category yet.</p>
                  ) : (
                    <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
                      {childCats.map((sub) => (
                        <li key={sub.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
                          {sub.image?.src ? (
                            <img src={sub.image.src} alt="" className="h-9 w-9 rounded-lg object-cover border border-gray-100 shrink-0" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><FolderOpen className="h-3.5 w-3.5 text-gray-400" /></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-gray-900 truncate">{catName(sub)}</p>
                            <p className="text-[11px] text-gray-400 font-mono truncate">/{sub.slug} · {sub.count} items</p>
                          </div>
                          {onEditChild && (
                            <button
                              type="button"
                              onClick={() => onEditChild(sub)}
                              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-blue-600 hover:bg-blue-50 transition"
                            >
                              Edit
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Category Image</label>
                <div 
                  className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${dragActive ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]); }}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0]); e.target.value = ''; }} />
                  <div className="flex flex-col items-center justify-center text-center">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2 text-blue-600"><Loader2 className="h-8 w-8 animate-spin" /><span className="text-[13px] font-medium">Uploading...</span></div>
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
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-red-600 shadow-md transition"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="bg-white p-3 rounded-full shadow-sm mb-3"><UploadCloud className="h-6 w-6 text-blue-500" /></div>
                        <p className="text-[14px] font-medium text-gray-700">Drag & drop image here</p>
                        <p className="text-[13px] text-gray-500 my-1">or <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-600 font-bold hover:underline">browse files</button></p>
                        <p className="text-[11px] text-gray-400 mt-2">Recommended: 1000×1000px (1:1) · Max: 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-bold text-gray-700">Category Icon</label>
                  <div className="flex bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIconTab("library")}
                      className={`px-3 py-1 rounded-md transition ${iconTab === "library" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Icon Library ({CURATED_ICONS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setIconTab("custom")}
                      className={`px-3 py-1 rounded-md transition ${iconTab === "custom" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Custom Emoji
                    </button>
                  </div>
                </div>

                {/* Helpful note about Category Image fallback */}
                <div className="flex items-center gap-2 p-2.5 mb-2 bg-blue-50/50 border border-blue-100 rounded-xl text-[12px] text-blue-800">
                  <span className="text-sm shrink-0">💡</span>
                  <span><b>Optional:</b> If no icon is selected, your Category Image above will be shown in the homepage circle.</span>
                </div>

                {/* Selected Active Icon Banner */}
                {form.icon && (
                  <div className="flex items-center justify-between p-2.5 mb-2.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-white border border-blue-200 flex items-center justify-center shrink-0 shadow-sm overflow-hidden text-xl leading-none">
                        {isIconUrl(form.icon) ? (
                          <img src={form.icon} alt="Selected icon" className="h-6 w-6 object-contain" />
                        ) : (
                          <span>{form.icon}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-gray-800 truncate">
                          {CURATED_ICONS.find((i) => i.icon === form.icon)?.label || "Selected Icon"}
                        </p>
                        <p className="text-[10px] text-blue-600 font-medium truncate">
                          {CURATED_ICONS.find((i) => i.icon === form.icon)?.category
                            ? `Category: ${CURATED_ICONS.find((i) => i.icon === form.icon)?.category}`
                            : "Custom Emoji"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => set("icon", "")}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition"
                    >
                      Remove Icon
                    </button>
                  </div>
                )}

                {/* Tab 1: Searchable Curated Icon Library */}
                {iconTab === "library" && (
                  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2.5">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        placeholder="Search icons (e.g. dress, bag, shoe, phone, ring, sale)..."
                        className="w-full pl-8 pr-7 py-2 text-[12px] rounded-lg border border-gray-200 outline-none bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition"
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

                    {/* Category Filter Pills */}
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin text-[11px]">
                      {ICON_CATEGORIES.map((cat) => {
                        const isSelected = iconCategory === cat;
                        const count =
                          cat === "All"
                            ? CURATED_ICONS.length
                            : CURATED_ICONS.filter((i) => i.category === cat).length;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setIconCategory(cat)}
                            className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-xs font-bold"
                                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
                            }`}
                          >
                            {cat} <span className={`text-[10px] ${isSelected ? "text-blue-100" : "text-gray-400"}`}>({count})</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Icons Grid */}
                    <div className="max-h-48 overflow-y-auto pr-1">
                      {filteredIcons.length === 0 ? (
                        <div className="py-6 text-center">
                          <SearchX className="h-6 w-6 text-gray-300 mx-auto mb-1.5" />
                          <p className="text-[12px] font-semibold text-gray-600">No icons found for “{iconSearch}”</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Try a different keyword or use the Custom Emoji tab.</p>
                          <button
                            type="button"
                            onClick={() => { setIconSearch(""); setIconCategory("All"); }}
                            className="mt-2 text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            Clear filters
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5">
                          {filteredIcons.map((item) => {
                            const isSelected = form.icon === item.icon;
                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => set("icon", item.icon)}
                                title={`${item.label} (${item.category})`}
                                className={`h-11 flex flex-col items-center justify-center rounded-xl text-xl transition-all ${
                                  isSelected
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 scale-105 ring-2 ring-blue-400 ring-offset-1"
                                    : "bg-white hover:bg-blue-50 hover:scale-105 border border-gray-100 shadow-xs"
                                }`}
                              >
                                <span>{item.icon}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 px-0.5 pt-0.5 border-t border-gray-100">
                      <span>Showing {filteredIcons.length} of {CURATED_ICONS.length} icons</span>
                      <span>Click any icon to select</span>
                    </div>
                  </div>
                )}

                {/* Tab 2: Custom Emoji / Text Input */}
                {iconTab === "custom" && (
                  <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-2">
                    <label className="block text-[12px] font-bold text-gray-700">Paste Custom Emoji</label>
                    <input
                      type="text"
                      value={form.icon}
                      onChange={(e) => set("icon", e.target.value)}
                      placeholder="Type or paste any emoji (e.g. 👗, 🥻, 🧵, ✨)"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[15px] text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white"
                    />
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      💡 <b>Tip:</b> Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono text-[10px]">Win + .</kbd> on Windows or <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono text-[10px]">Cmd + Ctrl + Space</kbd> on Mac to open your system emoji picker.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Background Theme</label>
                <select value={form.bgTheme} onChange={(e) => set("bgTheme", e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-700 outline-none bg-white focus:border-blue-400">
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
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Status</label>
                <select value={form.isActive ? "true" : "false"} onChange={(e) => set("isActive", e.target.value === "true")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-700 outline-none bg-white focus:border-blue-400">
                  <option value="true">Active (Visible)</option>
                  <option value="false">Inactive (Hidden)</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="block text-[13px] font-bold text-gray-400 mb-3 text-center uppercase tracking-widest">Live Homepage Preview</label>
                <div className="flex justify-center p-6 rounded-2xl border border-gray-100 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] bg-white shadow-inner">
                  <div className="flex flex-col items-center gap-3">
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
                          className="relative flex h-[116px] w-[116px] items-center justify-center overflow-hidden rounded-full ring-4 ring-white"
                          style={{
                            background: `linear-gradient(135deg, ${hex}16 0%, ${hex}32 100%)`,
                            boxShadow: `0 12px 28px ${hex}26`,
                          }}
                        >
                          {hasIcon ? (
                            isIconUrl(form.icon) ? (
                              <img
                                src={form.icon}
                                alt={form.name || "Category icon"}
                                className="h-16 w-16 object-contain filter drop-shadow-sm select-none"
                              />
                            ) : (
                              <span className="text-5xl select-none filter drop-shadow-sm">
                                {form.icon}
                              </span>
                            )
                          ) : hasImg ? (
                            <img
                              src={form.imageUrl}
                              alt={form.name || "Category image"}
                              className="h-full w-full object-cover select-none"
                            />
                          ) : (
                            <span className="text-5xl select-none filter drop-shadow-sm">
                              👗
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <span className="text-center text-[14px] font-black leading-tight text-gray-900 max-w-[140px] truncate">
                      {form.name || "Category Name"}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </form>
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/90 backdrop-blur rounded-b-2xl">
          <button type="button" onClick={handleClose} className="px-5 py-2.5 text-[14px] font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-[14px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {mode === "add" ? "Create Category" : "Save Changes"}
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
          {cat.count > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={moveProducts} onChange={(e) => setMoveProducts(e.target.checked)} className="mt-1" />
                <span className="text-[13px] text-gray-700">
                  Also move the <b>{cat.count} products</b> in this category to another category
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

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function AdminCategoriesPage() {
  const { authFetch } = useAuth();
  const [flat, setFlat] = useState<WCCategory[]>([]);
  const [tree, setTree] = useState<CategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [modal, setModal] = useState<{ mode: "add" | "edit"; initial: FormData & { id?: number } } | null>(null);
  const [moveCat, setMoveCat] = useState<WCCategory | null>(null);
  const [deleteCat, setDeleteCat] = useState<WCCategory | null>(null);
  const [details, setDetails] = useState<WCCategory | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all"|"main"|"sub">("all");
  const [filterStatus, setFilterStatus] = useState<"all"|"active"|"inactive">("all");

  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/categories");
      if (res.status === 401) {
        window.location.href = "/admin";
        return;
      }
      const data: WCCategory[] = await res.json();
      if (Array.isArray(data)) {
        setFlat(data);
        setTree(buildTree(data));
        // Default: all parents with children start collapsed (mains visible, subs hidden)
        setCollapsedIds(new Set(parentsWithChildrenIds(data)));
      }
    } finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { void load(); }, [load]);

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
      const res = await authFetch(`/api/admin/categories/${data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to update category");
      }
    } else {
      const res = await authFetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to create category");
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

    showToast(data.id ? "Category updated!" : "Category created!");
    setModal(null); await load();
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
      setDeleteCat(null);
      await load();
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
      return allSubs.map(s => ({ ...s, children: [] })) as CategoryTree[]; // Flatten for sub view
    }
    
    // Deep filter for search & status
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

  /* Drag & Drop Reorder Handlers */
  const [draggedItem, setDraggedItem] = useState<{ id: number; parent: number; index: number } | null>(null);
  const handleDragStart = (e: React.DragEvent, id: number, parent: number, index: number) => {
    setDraggedItem({ id, parent, index });
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (e: React.DragEvent, targetParent: number, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.parent !== targetParent || draggedItem.index === targetIndex) { setDraggedItem(null); return; }
    
    // Optimistic UI update
    const listToUpdate = flat.filter(c => c.parent === targetParent).sort((a,b) => a.menu_order - b.menu_order);
    const item = listToUpdate.splice(draggedItem.index, 1)[0];
    listToUpdate.splice(targetIndex, 0, item);
    
    setDraggedItem(null);
    showToast("Reordering...", true);
    
    // Update menu_order in backend sequentially
    try {
      for (let i = 0; i < listToUpdate.length; i++) {
        if (listToUpdate[i].menu_order !== i) {
          await authFetch(`/api/admin/categories/${listToUpdate[i].id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ menu_order: i })
          });
        }
      }
      showToast("Order saved!");
      load();
    } catch {
      showToast("Failed to save order", false);
    }
  };

  const openAdd = () => setModal({ mode: "add", initial: { ...EMPTY_FORM, sortOrder: siblingsOf(flat, 0).length } });
  const openAddUnder = (parentId: number) => {
    setDetails(null);
    setModal({
      mode: "add",
      initial: {
        ...EMPTY_FORM,
        type: "sub",
        parent: parentId,
        sortOrder: siblingsOf(flat, parentId).length,
      },
    });
  };
  const openEdit = (cat: WCCategory) => {
    const ordered = flat.filter((c) => c.parent === cat.parent).sort((a, b) => a.menu_order - b.menu_order);
    const sortOrder = Math.max(0, ordered.findIndex((c) => c.id === cat.id));
    const iconMeta = cat.meta_data?.find(m => (m.key === "_angkon_icon" || m.key === "_plainstitch_icon"))?.value;
    const bgMeta = cat.meta_data?.find(m => (m.key === "_angkon_bgTheme" || m.key === "_plainstitch_bgTheme"))?.value;
    setModal({
      mode: "edit",
      initial: {
        id: cat.id,
        type: cat.parent === 0 ? "main" : "sub",
        name: cat.name, slug: cat.slug, description: cat.description,
        parent: cat.parent, sortOrder,
        isActive: getStatus(cat),
        imageUrl: cat.image?.src ?? "", imageAlt: cat.image?.alt ?? "", imageId: cat.image?.id ?? null,
        icon: typeof iconMeta === "string" ? iconMeta : "",
        bgTheme: typeof bgMeta === "string" ? bgMeta : "blue"
      },
    });
  };

  const renderRow = (cat: CategoryTree, depth = 0, index: number) => {
    const active = getStatus(cat);
    const hasChildren = cat.children.length > 0;
    const isCollapsed = collapsedIds.has(cat.id);
    const childCount = cat.children.length;

    return (
      <div key={cat.id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, cat.id, cat.parent, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, cat.parent, index)}
          onClick={() => setDetails(cat)}
          className={`flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-gray-100 hover:bg-blue-50/40 transition cursor-pointer group ${
            depth > 0 ? "bg-slate-50/80" : "bg-white"
          }`}
        >
          {/* Drag + expand + indent */}
          <div className="flex items-center shrink-0" style={{ paddingLeft: `${depth * 28}px` }}>
            <div
              className="w-6 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-100 transition"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </div>
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(cat.id);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200/80 hover:text-gray-900 transition"
                aria-label={isCollapsed ? "Expand subcategories" : "Collapse subcategories"}
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`} />
              </button>
            ) : (
              <span className="w-8" />
            )}
          </div>

          {/* Image & Icon */}
          <div className="relative shrink-0 flex items-center justify-center">
            {cat.image?.src ? (
              <img src={cat.image.src} alt={catName(cat)} className={`rounded-xl object-cover border border-gray-200 shadow-sm bg-white ${depth === 0 ? "h-11 w-11" : "h-9 w-9"}`} />
            ) : (
              <div className={`rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200/60 ${depth === 0 ? "h-11 w-11" : "h-9 w-9"}`}><FolderOpen className="h-4 w-4" /></div>
            )}
            {(() => {
              const iconMeta = cat.meta_data?.find(m => (m.key === "_angkon_icon" || m.key === "_plainstitch_icon"))?.value;
              if (iconMeta && typeof iconMeta === "string" && iconMeta.trim() !== "") {
                const isUrl = isIconUrl(iconMeta);
                return (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-md border border-gray-100 text-[12px] leading-none p-[2px] z-10 flex items-center justify-center overflow-hidden">
                    {isUrl ? (
                      <img src={iconMeta} alt="" className="h-3.5 w-3.5 object-contain" />
                    ) : (
                      iconMeta
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {(() => {
                const bgMeta = cat.meta_data?.find(m => (m.key === "_angkon_bgTheme" || m.key === "_plainstitch_bgTheme"))?.value;
                const themeColors: Record<string, string> = {
                  slate: "bg-slate-500", blue: "bg-blue-500", rose: "bg-rose-500", emerald: "bg-emerald-500", orange: "bg-orange-500", violet: "bg-violet-500", pink: "bg-pink-500", red: "bg-red-500"
                };
                if (bgMeta && themeColors[bgMeta]) return <span className={`w-2 h-2 rounded-full ${themeColors[bgMeta]} shadow-sm`} title={`Theme: ${bgMeta}`} />;
                return null;
              })()}
              <span className={`font-bold text-gray-900 truncate ${depth === 0 ? "text-[15px]" : "text-[13px] text-gray-800"}`}>{catName(cat)}</span>
              {hasChildren && (
                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                  {childCount} {childCount === 1 ? "sub" : "subs"}
                </span>
              )}
              {depth > 0 && (
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">sub</span>
              )}
            </div>
            <div className="text-[12px] text-gray-400 font-mono truncate mt-0.5">/{cat.slug}</div>
          </div>

          {/* Stats & Status */}
          <div className="w-24 shrink-0 text-center hidden sm:block">
            <span className="text-[12px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">{cat.count} items</span>
          </div>
          <div className="w-20 shrink-0 flex justify-center">
            {active ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-gray-300" />}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setDetails(cat)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition" title="View Details">
              <FolderOpen className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setMoveCat(cat)} className="p-2 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-600 transition" title="Move category / products">
              <ArrowRightLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => openEdit(cat)} className="p-2 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition" title="Edit">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={(e) => handleDelete(e, cat)} disabled={deleting === cat.id} className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition disabled:opacity-50" title="Delete">
              {deleting === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/30">
      {toast && <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl text-[14px] font-bold text-white transition-all ${toast.ok ? "bg-emerald-600" : "bg-red-500"}`}>{toast.ok ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}{toast.msg}</div>}

      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-[28px] font-black text-gray-900 tracking-tight">Categories</h1>
          <p className="text-[14px] text-gray-500 mt-1 max-w-lg">Manage your fashion store categories, hierarchy, visibility, and images.</p>
        </div>
        <button onClick={openAdd} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-[14px] font-bold text-white transition shadow-sm hover:shadow-md shrink-0">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total</p><p className="text-[24px] font-black text-gray-900">{flat.length}</p></div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Main</p><p className="text-[24px] font-black text-gray-900">{mainCount}</p></div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Subs</p><p className="text-[24px] font-black text-gray-900">{subCount}</p></div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active</p><p className="text-[24px] font-black text-emerald-600">{activeCount}</p></div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition"
              title="Expand all"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition"
              title="Collapse all"
            >
              Collapse all
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={filterType} onChange={(e: any) => setFilterType(e.target.value)} className="bg-transparent text-[13px] font-bold text-gray-700 outline-none">
              <option value="all">All Types</option><option value="main">Main Only</option><option value="sub">Subs Only</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <select value={filterStatus} onChange={(e: any) => setFilterStatus(e.target.value)} className="bg-transparent text-[13px] font-bold text-gray-700 outline-none">
              <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
          <button type="button" onClick={load} className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition shrink-0"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-20">
        <div className="flex items-center px-6 py-4 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <div className="w-14 shrink-0" />
          <div className="w-10 shrink-0" />
          <div className="flex-1 min-w-0 px-4">Category</div>
          <div className="w-24 shrink-0 text-center">Products</div>
          <div className="w-24 shrink-0 text-center">Status</div>
          <div className="w-28 shrink-0 text-right pr-4">Actions</div>
        </div>

        {loading ? (
          <div className="flex flex-col divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-gray-100" />
                <div className="h-11 w-11 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-40 rounded bg-gray-100" />
                  <div className="h-3 w-24 rounded bg-gray-50" />
                </div>
                <div className="h-6 w-16 rounded-lg bg-gray-100" />
                <div className="h-5 w-5 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-5"><SearchX className="h-8 w-8 text-gray-400" /></div>
            <p className="text-[16px] font-bold text-gray-900 mb-1">No categories found</p>
            <p className="text-[14px] text-gray-500 max-w-sm mb-6">We couldn't find any categories matching your current filters or search query.</p>
            {search || filterType !== "all" || filterStatus !== "all" ? (
              <button onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }} className="text-blue-600 font-bold text-[14px] hover:underline">Clear filters</button>
            ) : (
              <button onClick={openAdd} className="text-blue-600 font-bold text-[14px] hover:underline">Create your first category</button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">{filteredTree.map((cat, i) => renderRow(cat, 0, i))}</div>
        )}
      </div>

      {modal && (
        <CategoryModal
          mode={modal.mode}
          initial={modal.initial}
          flat={flat}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onEditChild={(c) => openEdit(c)}
          onAddChild={(parentId) => openAddUnder(parentId)}
        />
      )}
      {deleteCat && (
        <DeleteConfirmModal
          cat={deleteCat}
          subCount={subtreeList(flat, deleteCat.id).length - 1}
          productCount={subtreeList(flat, deleteCat.id).reduce((sum, c) => sum + (c.count || 0), 0)}
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
      {details && (
        <DetailsDrawer
          cat={details}
          flat={flat}
          onClose={() => setDetails(null)}
          onEdit={(c) => { setDetails(null); openEdit(c); }}
          onAddChild={(parentId) => openAddUnder(parentId)}
        />
      )}
    </div>
  );
}
