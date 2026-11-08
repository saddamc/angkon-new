"use client";

import { FolderOpen, Plus } from "lucide-react";
import { useCategoriesManager } from "./_hooks/use-categories-manager";
import { CategoriesHeader } from "./_components/categories-header";
import { CategoriesStatsCards } from "./_components/categories-stats-cards";
import { CategoryTreeExplorer } from "./_components/category-tree-explorer";
import { CategoriesModals } from "./_components/categories-modals";
import { CategoryStudio } from "./CategoryStudio";

export default function AdminCategoriesPage() {
  const state = useCategoriesManager();
  const {
    flat,
    mobileTab,
    setMobileTab,
    studio,
    setStudio,
    selectedCatIdRef,
    setSelectedCatId,
    handleSave,
    openEdit,
    openAddUnder,
    openAdd,
    load,
  } = state;

  return (
    <div className="w-full max-w-[1920px] mx-auto min-h-screen space-y-6">
      {/* 1. Header & Actions */}
      <CategoriesHeader state={state} />

      {/* 2. Stats Cards */}
      <CategoriesStatsCards state={state} />

      {/* 3. Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab("explorer")}
          className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition cursor-pointer ${
            mobileTab === "explorer" ? "bg-white text-purple-600 shadow-xs" : "text-gray-500"
          }`}
        >
          Categories List ({flat.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("studio")}
          className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition cursor-pointer ${
            mobileTab === "studio" ? "bg-white text-purple-600 shadow-xs" : "text-gray-500"
          }`}
        >
          In-Page Studio {studio ? `(${studio.mode === "add" ? "Create" : "Editing"})` : ""}
        </button>
      </div>

      {/* 4. Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
        {/* Left Column: Explorer Tree (5 cols) */}
        <div className={`lg:col-span-5 ${mobileTab === "studio" ? "hidden lg:block" : "block"}`}>
          <CategoryTreeExplorer state={state} />
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
              onReload={async () => {
                await load(true);
              }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-purple-100/60 shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[460px]">
              <div className="h-16 w-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-4 shadow-sm">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h3 className="text-[17px] font-black text-gray-900 mb-1">In-Page Category Studio</h3>
              <p className="text-[13px] text-gray-500 max-w-md mb-6 leading-relaxed">
                Select any category from the explorer on the left to edit it in-page, manage its
                subcategories, or configure multi-parent cross-listing.
              </p>
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-[13px] font-bold text-white shadow-md shadow-purple-200 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create New Category
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Modals & Notifications */}
      <CategoriesModals state={state} />
    </div>
  );
}
