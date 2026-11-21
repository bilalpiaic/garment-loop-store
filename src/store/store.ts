"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Currency } from "@/lib/money";

export type CartLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  title: string;
  subtitle: string;
  image: string;
  size: string;
  color: string;
  pricePkr: number;
  compareAtPkr?: number;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  addItem: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  count: () => number;
  subtotalPkr: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      addItem: (line, quantity = 1) => {
        set((state) => {
          const existing = state.lines.find((item) => item.variantId === line.variantId);
          if (existing) {
            return {
              lines: state.lines.map((item) =>
                item.variantId === line.variantId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, quantity }] };
        });
      },
      setQuantity: (variantId, quantity) => {
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((item) => item.variantId !== variantId)
              : state.lines.map((item) =>
                  item.variantId === variantId ? { ...item, quantity } : item,
                ),
        }));
      },
      removeItem: (variantId) => {
        set((state) => ({ lines: state.lines.filter((item) => item.variantId !== variantId) }));
      },
      clear: () => set({ lines: [] }),
      count: () => get().lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotalPkr: () => get().lines.reduce((sum, line) => sum + line.pricePkr * line.quantity, 0),
    }),
    { name: "garmentloop-cart" },
  ),
);

type PreferenceState = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
};

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      currency: "PKR",
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "garmentloop-prefs" },
  ),
);

type WishlistState = {
  productIds: string[];
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  setAll: (productIds: string[]) => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],
      toggle: (productId) => {
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId],
        }));
      },
      has: (productId) => get().productIds.includes(productId),
      setAll: (productIds) => set({ productIds }),
    }),
    { name: "garmentloop-wishlist" },
  ),
);
