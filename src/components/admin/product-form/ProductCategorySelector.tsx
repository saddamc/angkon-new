"use client";

import React, { useState, useMemo } from "react";
import {
  Folder,
  FolderTree,
  ChevronRight,
  Check,
  Search,
  X,
  Tag,
  CornerDownRight,
  Link2,
} from "lucide-react";
import type { WooCategory } from "@/types/product";
import { getProductPageUrl } from "@/utils/product-url";

export interface CategorySelectionItem {
  id: number;
  name: string;
  slug: string;
  parent?: number;
}

export interface FormattedCategoryItem {
  id: number;
  name: string;
  slug: string;
  level: number;
  parent?: number;
  path: string;
}

interface ProductCategorySelectorProps {
  availableCategories: WooCategory[];
  selectedCategories: CategorySelectionItem[];
  onToggleCategory: (cat: CategorySelectionItem) => void;
  onMakePrimary: (id: number) => void;
  onClearCategories: () => void;
  productName: string;
  productSlug: string;
  slugManual?: boolean;
}

export function ProductCategorySelector({
  availableCategories,
  selectedCategories,
  onToggleCategory,
  onMakePrimary,
  onClearCategories,
  productName,
  productSlug,
  slugManual = false,
}: ProductCategorySelectorProps) {
  const [categoryQuery, setCategoryQuery] = useState("");

  // Build hierarchical category list with full breadcrumbs
  const formattedCategories = useMemo<FormattedCategoryItem[]>(() => {
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

    const result: FormattedCategoryItem[] = [];
    const traverse = (parentId: number, level: number) => {
      const children = parentMap.get(parentId) || [];
      children.sort((a, b) => a.name.localeCompare(b.name));
      children.forEach((c) => {
        result.push({
          id: c.id,
          name: c.name,
          slug: c.slug,
          level,
          parent: c.parent,
          path: getBreadcrumb(c),
        });
        traverse(c.id, level + 1);
      });
    };
    traverse(0, 0);
    return result;
  }, [availableCategories]);

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return formattedCategories;
    return formattedCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.path.toLowerCase().includes(q)
    );
  }, [categoryQuery, formattedCategories]);

  const isCategorySelected = (id: number) =>
    selectedCategories.some((c) => c.id === id);

  const primaryCategory = selectedCategories[0];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <FolderTree className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-gray-800">Categories *</h3>
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
        <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50/20 p-3.5">
          {/* Category Line Breadcrumb Bar */}
          {primaryCategory && (
            <div className="mb-3 rounded-lg border border-purple-200/60 bg-white px-3 py-2 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap text-[12px]">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-2xs">
                  <FolderTree className="h-3 w-3 text-purple-200" />
                  Category Line
                </span>
                <div className="flex items-center gap-1.5 flex-wrap font-medium text-stone-700">
                  {(
                    formattedCategories.find((c) => c.id === primaryCategory.id)
                      ?.path || primaryCategory.name
                  )
                    .split(" → ")
                    .map((crumb, idx, arr) => (
                      <span key={idx} className="flex items-center gap-1.5">
                        {idx > 0 && (
                          <ChevronRight className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        )}
                        <span
                          className={
                            idx === arr.length - 1
                              ? "font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60"
                              : "text-stone-600"
                          }
                        >
                          {crumb}
                        </span>
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((cat, i) => {
              const path =
                formattedCategories.find((c) => c.id === cat.id)?.path ||
                cat.name;
              return (
                <span
                  key={cat.id}
                  title={`Category Line: ${path}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200/60 bg-white pl-2.5 pr-1 py-1 text-[12px] font-semibold text-purple-700 shadow-xs"
                >
                  {i === 0 ? (
                    <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      Primary
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onMakePrimary(cat.id)}
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-400 hover:bg-purple-50 hover:text-purple-600 cursor-pointer"
                      title="Make this the primary category"
                    >
                      Make primary
                    </button>
                  )}
                  <Folder className="h-3 w-3 text-amber-700/60 shrink-0" />
                  <span>{cat.name}</span>
                  {path !== cat.name && (
                    <span
                      className="text-[10px] font-normal text-stone-400 max-w-[140px] truncate"
                      title={path}
                    >
                      ({path})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleCategory(cat)}
                    className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    aria-label={`Remove ${cat.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-stone-500">
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-stone-400 font-medium">Primary Line:</span>
              <strong className="text-stone-700 truncate font-semibold">
                {(
                  formattedCategories.find(
                    (c) => c.id === primaryCategory?.id
                  )?.path ||
                  primaryCategory?.name ||
                  "Unassigned"
                ).replace(/ → /g, " › ")}
              </strong>
            </span>
            <button
              type="button"
              onClick={onClearCategories}
              className="font-semibold text-rose-600 hover:underline shrink-0 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3.5 text-[12px] text-amber-800 flex items-center gap-2.5">
          <Tag className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Pick one or more categories below so this product appears in the right collections and category line.
          </span>
        </div>
      )}

      {/* Searchable multi-select list */}
      <div>
        <div className="relative mb-2">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            placeholder="Search categories (e.g. Panjabi, Saree, Men)…"
            className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-9 py-2.5 text-[13px] text-stone-800 placeholder-stone-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
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

        <div className="max-h-72 overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 divide-y divide-stone-100">
          {availableCategories.length === 0 ? (
            <div className="px-4 py-4 text-center text-[13px] text-stone-400">
              Loading categories…
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="px-4 py-4 text-center text-[13px] text-stone-400">
              No matching categories found
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const checked = isCategorySelected(cat.id);
              return (
                <label
                  key={cat.id}
                  className={`flex cursor-pointer items-center gap-2.5 px-4 py-2 text-[13px] transition hover:bg-purple-50/50 ${
                    checked
                      ? "bg-purple-50/70 font-semibold text-purple-700"
                      : "text-stone-700"
                  }`}
                  style={{
                    paddingLeft: categoryQuery ? 16 : 16 + cat.level * 22,
                  }}
                >
                  {/* Tree connector lines */}
                  {!categoryQuery && cat.level === 1 && (
                    <span
                      className="inline-flex items-center text-stone-400 shrink-0"
                      aria-hidden="true"
                    >
                      <CornerDownRight className="h-3.5 w-3.5 text-stone-400" />
                    </span>
                  )}
                  {!categoryQuery && cat.level >= 2 && (
                    <span
                      className="inline-flex items-center text-stone-400 shrink-0"
                      aria-hidden="true"
                    >
                      <span className="inline-block w-2.5 border-b border-stone-300 mr-0.5" />
                      <CornerDownRight className="h-3 w-3 text-stone-400" />
                    </span>
                  )}

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleCategory(cat)}
                    className="h-4 w-4 shrink-0 rounded border-stone-300 text-purple-600 focus:ring-purple-400"
                  />

                  {cat.level === 0 ? (
                    <Folder className="h-4 w-4 text-purple-600 shrink-0" />
                  ) : (
                    <Folder className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  )}

                  <span className="min-w-0 flex-1 truncate">
                    {cat.name}
                    {categoryQuery && cat.level > 0 && (
                      <span className="ml-2 text-[11px] font-normal text-stone-400">
                        ({cat.path.replace(/ → /g, " › ")})
                      </span>
                    )}
                  </span>

                  {cat.level === 0 ? (
                    <span className="shrink-0 rounded-md bg-stone-100 border border-stone-200/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-600">
                      Main
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] text-stone-400 font-normal">
                      lvl {cat.level}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
        <p className="mt-2 text-[11px] text-stone-400">
          Tip: select the specific sub-category or main collection. The primary category line determines the breadcrumb trail and default collection routing.
        </p>
      </div>

      {/* Storefront routing preview */}
      <div className="mt-4 rounded-xl bg-purple-50/30 border border-purple-100/60 p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
            Storefront URLs &amp; Category Routing
          </span>
        </div>
        <div className="space-y-1.5 text-[11.5px]">
          <div className="flex items-start gap-2">
            <span className="text-stone-400 font-medium shrink-0 w-24">Category Line:</span>
            <span className="text-purple-700 font-semibold break-all">
              {primaryCategory
                ? (
                    formattedCategories.find((c) => c.id === primaryCategory.id)
                      ?.path || primaryCategory.name
                  ).replace(/ → /g, " › ")
                : "— No category selected —"}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-stone-400 font-medium shrink-0 w-24">Product URL:</span>
            <code className="text-purple-700 font-mono break-all font-semibold">
              {getProductPageUrl(slugManual ? productSlug || productName : productName, {
                fromName: true,
              })}
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
        </div>
      </div>
    </div>
  );
}
