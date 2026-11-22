"use client";

import { useEffect, useRef } from "react";
import { getVariant } from "@/lib/catalog";
import { useCatalog } from "@/components/catalog-provider";
import { useCartStore } from "@/store/store";
import { trackBeginCheckout, variantToItem } from "@/lib/analytics";

export function BeginCheckoutTracker() {
  const items = useCartStore((state) => state.items);
  const { products } = useCatalog();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || items.length === 0) return;
    const analyticsItems = [];
    let value = 0;
    for (const item of items) {
      const match = getVariant(item.variantId, products);
      if (!match) continue;
      const line = variantToItem(match.product, match.variant, item.quantity);
      analyticsItems.push(line);
      value += (line.price ?? 0) * item.quantity;
    }
    if (analyticsItems.length === 0) return;
    fired.current = true;
    trackBeginCheckout(analyticsItems, value);
  }, [items, products]);

  return null;
}
