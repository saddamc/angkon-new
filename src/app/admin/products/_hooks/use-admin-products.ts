"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  type WCProductRaw,
  getBuyPrice,
  type InventorySummary,
} from "../_types/products.types";

let cachedProductsList: WCProductRaw[] | null = null;

export function useAdminProducts() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [products, setProducts] = useState<WCProductRaw[]>(cachedProductsList || []);
  const [loading, setLoading] = useState(!cachedProductsList);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toast notifications & selection
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ ids: number[]; names: string[] } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => {
      setToast((curr) => (curr?.msg === msg ? null : curr));
    }, 3500);
  }, []);

  const load = useCallback(
    async (soft = false) => {
      if (!cachedProductsList && !soft) setLoading(true);
      try {
        const res = await authFetch("/api/admin/products?per_page=150");
        if (res.ok) {
          const data = await res.json();
          const list = data.products ?? data;
          const validList = Array.isArray(list) ? list : [];
          cachedProductsList = validList;
          setProducts(validList);
          setSelectedIds((prev) => {
            const next = new Set<number>();
            validList.forEach((p: WCProductRaw) => {
              if (prev.has(p.id)) next.add(p.id);
            });
            return next;
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void load(Boolean(cachedProductsList));
  }, [load]);

  useEffect(() => {
    if (actionMenu === null) return;
    const closeMenu = () => {
      setActionMenu(null);
      setMenuPos(null);
    };
    window.addEventListener("scroll", closeMenu, { passive: true });
    window.addEventListener("resize", closeMenu, { passive: true });
    return () => {
      window.removeEventListener("scroll", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, [actionMenu]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // fallback
    }
  };

  const toggleMenu = (id: number, buttonEl: HTMLButtonElement) => {
    if (actionMenu === id) {
      setActionMenu(null);
      setMenuPos(null);
      return;
    }

    const rect = buttonEl.getBoundingClientRect();
    const menuHeight = 220;

    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = showAbove ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const right = Math.max(16, window.innerWidth - rect.right);

    setMenuPos({ top, right });
    setActionMenu(id);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.categories?.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const inventorySummary: InventorySummary = useMemo(() => {
    let totalStockQty = 0;
    let totalCostVal = 0;
    let itemsWithCost = 0;
    let inStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      const isManaged = Boolean(p.manage_stock);
      const qty = typeof p.stock_quantity === "number" ? p.stock_quantity : 0;
      if (p.stock_status === "outofstock" || (isManaged && qty <= 0)) {
        outOfStockCount++;
      } else {
        inStockCount++;
      }
      if (isManaged && qty > 0) {
        totalStockQty += qty;
        const cost = getBuyPrice(p);
        if (cost > 0) {
          totalCostVal += cost * qty;
          itemsWithCost++;
        }
      }
    });

    return {
      totalUnits: totalStockQty,
      costVal: totalCostVal,
      itemsWithCost,
      inStockCount,
      outOfStockCount,
    };
  }, [products]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.has(p.id));
  const someSelected =
    filteredProducts.some((p) => selectedIds.has(p.id)) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const openDeleteSingle = (id: number, name: string) => {
    setActionMenu(null);
    setMenuPos(null);
    setDeleteTarget({ ids: [id], names: [name] });
  };

  const handleDuplicate = async (product: WCProductRaw) => {
    setActionMenu(null);
    setMenuPos(null);
    setDuplicating(product.id);
    try {
      const res = await authFetch(`/api/admin/products/${product.id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) {
        showToast(data.error || data.message || "Failed to duplicate product.", false);
        return;
      }
      showToast(
        `Duplicated as draft: "${data.product?.name || `${product.name} (Copy)`}"`,
        true
      );
      const nextSlug = data.product?.slug as string | undefined;
      if (nextSlug) {
        router.push(`/admin/products/${encodeURIComponent(nextSlug)}/edit`);
      } else if (data.id) {
        router.push(`/admin/products/${data.id}/edit`);
      }
    } catch {
      showToast("Failed to duplicate product. Check your network.", false);
    } finally {
      setDuplicating(null);
    }
  };

  const openBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const selected = products.filter((p) => selectedIds.has(p.id));
    setDeleteTarget({
      ids: selected.map((p) => p.id),
      names: selected.map((p) => p.name),
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.ids.length === 0) return;
    const { ids, names } = deleteTarget;
    setIsDeleting(true);

    try {
      if (ids.length === 1) {
        const id = ids[0];
        const res = await authFetch(`/api/admin/products/${id}`, { method: "DELETE" });
        if (res.ok) {
          setProducts((prev) => prev.filter((p) => p.id !== id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          showToast(`Product "${names[0]}" deleted successfully!`, true);
          setDeleteTarget(null);
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || err.message || "Failed to delete product.", false);
        }
      } else {
        const res = await authFetch("/api/admin/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          const deletedSet = new Set<number>(data.deletedIds ?? ids);
          setProducts((prev) => prev.filter((p) => !deletedSet.has(p.id)));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            deletedSet.forEach((delId) => next.delete(delId));
            return next;
          });
          showToast(
            `${data.deletedCount ?? ids.length} products deleted successfully!`,
            true
          );
          setDeleteTarget(null);
        } else {
          showToast(data.error || "Failed to delete selected products.", false);
        }
      }
    } catch {
      showToast("Failed to delete product(s). Please check your network connection.", false);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    products,
    loading,
    duplicating,
    searchQuery,
    setSearchQuery,
    actionMenu,
    setActionMenu,
    menuPos,
    setMenuPos,
    copiedKey,
    toast,
    setToast,
    selectedIds,
    setSelectedIds,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    filteredProducts,
    inventorySummary,
    allSelected,
    someSelected,
    load,
    copyToClipboard,
    toggleMenu,
    toggleSelect,
    toggleSelectAll,
    openDeleteSingle,
    openBulkDelete,
    handleDuplicate,
    confirmDelete,
  };
}

export type AdminProductsHookReturn = ReturnType<typeof useAdminProducts>;
