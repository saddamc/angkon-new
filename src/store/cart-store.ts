"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/types/product";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, size?: string, color?: string) => void;
  updateQuantity: (productId: number, size: string | undefined, quantity: number, color?: string) => void;
  clearCart: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      addItem: (item) => {
        const itemColor = (item.color || "").trim().toLowerCase();
        const itemSize = (item.size || "").trim();
        const existing = get().items.find(
          (cartItem) =>
            cartItem.productId === item.productId &&
            (cartItem.size || "").trim() === itemSize &&
            (cartItem.color || "").trim().toLowerCase() === itemColor,
        );

        if (existing) {
          set((state) => ({
            items: state.items.map((cartItem) =>
              cartItem.productId === item.productId &&
              (cartItem.size || "").trim() === itemSize &&
              (cartItem.color || "").trim().toLowerCase() === itemColor
                ? { ...cartItem, ...item, quantity: cartItem.quantity + item.quantity }
                : cartItem,
            ),
            isOpen: true,
          }));
          return;
        }

        set((state) => ({ items: [...state.items, item], isOpen: true }));
      },
      removeItem: (productId, size, color) => {
        const targetColor = color !== undefined ? color.trim().toLowerCase() : undefined;
        const targetSize = size !== undefined ? size.trim() : undefined;
        set((state) => ({
          items: state.items.filter((item) => {
            const matchesId = item.productId === productId;
            const matchesSize = targetSize === undefined || (item.size || "").trim() === targetSize;
            const matchesColor = targetColor === undefined || (item.color || "").trim().toLowerCase() === targetColor;
            return !(matchesId && matchesSize && matchesColor);
          }),
        }));
      },
      updateQuantity: (productId, size, quantity, color) => {
        const safeQuantity = Math.max(1, quantity);
        const targetColor = color !== undefined ? color.trim().toLowerCase() : undefined;
        const targetSize = size !== undefined ? size.trim() : undefined;
        set((state) => ({
          items: state.items.map((item) => {
            const matchesId = item.productId === productId;
            const matchesSize = targetSize === undefined || (item.size || "").trim() === targetSize;
            const matchesColor = targetColor === undefined || (item.color || "").trim().toLowerCase() === targetColor;
            return matchesId && matchesSize && matchesColor
              ? { ...item, quantity: safeQuantity }
              : item;
          }),
        }));
      },
      clearCart: () => set({ items: [] }),
      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    {
      name: "netbazer-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items } as unknown as CartState),
    },
  ),
);
