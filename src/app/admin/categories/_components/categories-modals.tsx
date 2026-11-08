"use client";

import { Check, AlertCircle } from "lucide-react";
import { CreateCategoryModal } from "../CreateCategoryModal";
import { DeleteConfirmModal } from "../DeleteConfirmModal";
import { MoveModal } from "../MoveModal";
import { catName, subtreeList } from "../category-tree-utils";
import type { CategoriesManagerHookReturn } from "../_hooks/use-categories-manager";

interface CategoriesModalsProps {
  state: CategoriesManagerHookReturn;
}

export function CategoriesModals({ state }: CategoriesModalsProps) {
  const {
    toast,
    deleteCat,
    setDeleteCat,
    deleting,
    confirmDelete,
    flat,
    moveCat,
    setMoveCat,
    authFetch,
    load,
    showToast,
    createModal,
    setCreateModal,
    selectedCatIdRef,
    setSelectedCatId,
  } = state;

  return (
    <>
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl text-[14px] font-bold text-white transition-all ${
            toast.ok ? "bg-emerald-600" : "bg-red-500"
          }`}
        >
          {toast.ok ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast.msg}
        </div>
      )}

      {deleteCat && (
        <DeleteConfirmModal
          cat={deleteCat}
          subCount={subtreeList(flat, deleteCat.id).length - 1}
          productCount={deleteCat.count || 0}
          deleting={deleting === deleteCat.id}
          onClose={() => {
            if (deleting !== deleteCat.id) setDeleteCat(null);
          }}
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
    </>
  );
}
