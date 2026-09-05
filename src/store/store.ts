import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Currency } from "@/lib/money";

export type CartItem = {
  variantId: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (variantId, quantity = 1) => {
        const existing = get().items.find((item) => item.variantId === variantId);
        if (existing) {
          set({
            items: get().items.map((item) =>
              item.variantId === variantId
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            ),
          });
          return;
        }
        set({ items: [...get().items, { variantId, quantity }] });
      },
      setQuantity: (variantId, quantity) => {
        if (quantity < 1) {
          set({ items: get().items.filter((item) => item.variantId !== variantId) });
          return;
        }
        set({
          items: get().items.map((item) =>
            item.variantId === variantId ? { ...item, quantity } : item,
          ),
        });
      },
      removeItem: (variantId) =>
        set({ items: get().items.filter((item) => item.variantId !== variantId) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "garmentloop-cart",
      partialize: (state) => ({ items: state.items }),
    },
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
    {
      name: "garmentloop-preferences",
      partialize: (state) => ({ currency: state.currency }),
    },
  ),
);
