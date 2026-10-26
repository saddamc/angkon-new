"use client";

import React, { useState, useRef, useEffect } from "react";
import { FolderOpen, ChevronDown, Search, Check } from "lucide-react";
import type { WCCategory } from "./types";
import { catName, categoryPath } from "./category-tree-utils";

interface ParentCategoryPickerProps {
  value: number;
  options: WCCategory[];
  allowRoot?: boolean;
  allCats?: WCCategory[];
  onChange: (id: number) => void;
}

export function ParentCategoryPicker({
  value,
  options,
  allowRoot = false,
  allCats,
  onChange,
}: ParentCategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const catalog = allCats ?? options;
  const selected =
    value === 0
      ? null
      : catalog.find((p) => p.id === value) ||
        options.find((p) => p.id === value) ||
        null;

  const filtered = options.filter((p) => {
    const q = query.toLowerCase();
    return (
      catName(p).toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-left bg-white hover:border-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-50 outline-none transition cursor-pointer"
      >
        {value === 0 && allowRoot ? (
          <span className="flex-1 text-[14px] font-semibold text-gray-900">
            Main category (top level)
          </span>
        ) : selected ? (
          <>
            {selected.image?.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.image.src}
                alt=""
                className="h-7 w-7 rounded-lg object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
              </div>
            )}
            <span className="flex-1 min-w-0 truncate text-[14px] font-semibold text-gray-900">
              {categoryPath(catalog, selected.id) || catName(selected)}
            </span>
            <span className="text-[11px] text-gray-400 shrink-0">
              {selected.count} items
            </span>
          </>
        ) : (
          <span className="flex-1 text-[14px] text-gray-400">
            — Select category —
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
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
                className="w-full pl-8 pr-3 py-2 text-[13px] rounded-lg border border-gray-200 outline-none focus:border-purple-400"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {allowRoot && (
              <button
                type="button"
                onClick={() => {
                  onChange(0);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-purple-50 transition cursor-pointer ${
                  value === 0 ? "bg-purple-50/70" : ""
                }`}
              >
                <span className="text-[13px] font-semibold text-gray-900">
                  Main category (top level)
                </span>
                {value === 0 && (
                  <Check className="h-4 w-4 text-purple-600 ml-auto" />
                )}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-gray-400">
                No matching categories
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-purple-50 transition cursor-pointer ${
                    p.id === value ? "bg-purple-50/70" : ""
                  }`}
                >
                  {p.image?.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image.src}
                      alt=""
                      className="h-7 w-7 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">
                      {catName(p)}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {categoryPath(catalog, p.id)}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {p.count} items
                  </span>
                  {p.id === value && (
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
