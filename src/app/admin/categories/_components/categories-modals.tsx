"use client";

import { CreateCategoryModal } from "../CreateCategoryModal";
import { DeleteConfirmModal } from "../DeleteConfirmModal";
import { MoveModal } from "../MoveModal";
import { subtreeList } from "../category-tree-utils";
import { AdminProcessingOverlay, AdminToast } from "@/components/admin/AdminToast";
import type { CategoriesManagerHookReturn } from "../_hooks/use-categories-manager";

interface CategoriesModalsProps {
  state: CategoriesManagerHookReturn;
}

export function CategoriesModals({ state }: CategoriesModalsProps) {
  const {
    toast,
    setToast,
    processing,
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
      {processing && (
        <AdminProcessingOverlay
          label={processing.label}
          detail={processing.detail}
          blocking={processing.blocking}
        />
      )}

      {toast && (
        <AdminToast
          message={toast.msg}
          ok={toast.ok}
          onClose={() => setToast(null)}
        />
      )}

      {deleteCat && (
        <DeleteConfirmModal
          cat={deleteCat}
          flat={flat}
          subCount={subtreeList(flat, deleteCat.id).length - 1}
          productCount={deleteCat.count || 0}
          deleting={deleting === deleteCat.id}
          onClose={() => {
            if (deleting !== deleteCat.id) setDeleteCat(null);
          }}
          onConfirm={(opts) => void confirmDelete(opts)}
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
