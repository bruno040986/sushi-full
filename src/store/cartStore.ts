"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isDrawerOpen: boolean;

  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  subtotalCents: () => number;
  itemCount: () => number;
  quantityOf: (productId: string) => number;
};

const MAX_PER_ITEM = 99;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,

      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          const items = existing
            ? state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_PER_ITEM) }
                  : i,
              )
            : [...state.items, { ...item, quantity: Math.min(quantity, MAX_PER_ITEM) }];

          return { items, isDrawerOpen: true };
        }),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      setQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.productId !== productId) };
          }
          return {
            items: state.items.map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.min(quantity, MAX_PER_ITEM) }
                : i,
            ),
          };
        }),

      clearCart: () => set({ items: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      subtotalCents: () =>
        get().items.reduce((total, item) => total + item.priceCents * item.quantity, 0),

      itemCount: () => get().items.reduce((total, item) => total + item.quantity, 0),

      quantityOf: (productId) =>
        get().items.find((i) => i.productId === productId)?.quantity ?? 0,
    }),
    {
      name: "sushifull-cart",
      // Só os itens persistem — o drawer sempre começa fechado
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
