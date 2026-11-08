"use client";

import { Search, X, SearchX } from "lucide-react";
import { CategoryRow } from "./category-row";
import type { CategoriesManagerHookReturn } from "../_hooks/use-categories-manager";

interface CategoryTreeExplorerProps {
  state: CategoriesManagerHookReturn;
}

export function CategoryTreeExplorer({ state }: CategoryTreeExplorerProps) {
  const {
    search,
    setSearch,
    expandAll,
    collapseAll,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    filteredTree,
    loading,
    dndEnabled,
    dragId,
    dropTarget,
    setDropTarget,
    handleRootDragOver,
    handleRootDrop,
  } = state;

  return (
    <>
      {/* Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-purple-100/60 shadow-sm mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition bg-gray-50/50 focus:bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
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
              className="px-2 py-1 rounded text-[11px] font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition cursor-pointer"
              title="Expand all"
            >
              Expand
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2 py-1 rounded text-[11px] font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition cursor-pointer"
              title="Collapse all"
            >
              Collapse
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "all" | "main" | "sub")}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="main">Main Only</option>
              <option value="sub">Subs Only</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tree Card */}
      <div className="bg-white rounded-2xl border border-purple-100/60 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-purple-50/70 border-b border-purple-100/50 text-[11px] font-bold uppercase tracking-wider text-purple-600 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span>Category Hierarchy</span>
            <span className="text-[10px] font-mono text-purple-400">
              ({filteredTree.length} roots)
            </span>
          </div>
          <div className="hidden sm:block">Storefront Status &amp; Actions</div>
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
            {filteredTree.map((cat, i) => (
              <CategoryRow
                key={`${cat.id}-root`}
                cat={cat}
                depth={0}
                index={i}
                state={state}
              />
            ))}
            {dndEnabled && dragId !== null && (
              <div
                onDragOver={handleRootDragOver}
                onDrop={handleRootDrop}
                onDragLeave={() =>
                  setDropTarget((prev) => (prev && "id" in prev && prev.id === "root" ? null : prev))
                }
                className={`m-3 rounded-xl border-2 border-dashed px-4 py-4 text-center text-[12px] font-bold transition ${
                  dropTarget && "id" in dropTarget && dropTarget.id === "root"
                    ? "border-purple-600 bg-purple-50 text-purple-700"
                    : "border-gray-300 text-gray-400"
                }`}
              >
                Drop here to make it a Main category
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
