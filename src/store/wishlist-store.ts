"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface WishlistItem {
  productId: number;
  slug: string;
  name: string;
  image: string;
  price: number;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: number) => void;
  toggleItem: (item: WishlistItem) => void;
  isInWishlist: (productId: number) => boolean;
  clearWishlist: () => void;
  itemCount: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        if (!get().items.some((i) => i.productId === item.productId)) {
          set((state) => ({ items: [...state.items, item] }));
        }
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },
      toggleItem: (item) => {
        if (get().isInWishlist(item.productId)) {
          get().removeItem(item.productId);
        } else {
          get().addItem(item);
        }
      },
      isInWishlist: (productId) => {
        return get().items.some((i) => i.productId === productId);
      },
      clearWishlist: () => set({ items: [] }),
      itemCount: () => get().items.length,
    }),
    {
      name: "netbazer-wishlist",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
