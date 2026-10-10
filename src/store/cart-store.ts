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
  removeItem: (productId: number, size: string) => void;
  updateQuantity: (productId: number, size: string, quantity: number) => void;
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
        const existing = get().items.find(
          (cartItem) => cartItem.productId === item.productId && cartItem.size === item.size,
        );

        if (existing) {
          set((state) => ({
            items: state.items.map((cartItem) =>
              cartItem.productId === item.productId && cartItem.size === item.size
                ? { ...cartItem, ...item, quantity: cartItem.quantity + item.quantity }
                : cartItem,
            ),
            isOpen: true,
          }));
          return;
        }

        set((state) => ({ items: [...state.items, item], isOpen: true }));
      },
      removeItem: (productId, size) => {
        set((state) => ({
          items: state.items.filter((item) => !(item.productId === productId && item.size === size)),
        }));
      },
      updateQuantity: (productId, size, quantity) => {
        const safeQuantity = Math.max(1, quantity);
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.size === size
              ? { ...item, quantity: safeQuantity }
              : item,
          ),
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
