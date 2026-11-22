"use client";

import { useRef } from "react";
import { getVariant } from "@/lib/catalog";
import { useCatalog } from "@/components/catalog-provider";
import { useCartStore } from "@/store/store";
import { trackBeginCheckout, variantToItem } from "@/lib/analytics";
import { useTrackWhenReady } from "@/hooks/use-track-when-ready";

export function BeginCheckoutTracker() {
  const items = useCartStore((state) => state.items);
  const { products } = useCatalog();
  const cartKey = items.map((item) => `${item.variantId}:${item.quantity}`).join(",");
  const sentKeyRef = useRef("");

  useTrackWhenReady(() => {
    if (!cartKey) return;
    if (sentKeyRef.current === cartKey) return;

    const analyticsItems = [];
    let value = 0;
    for (const item of items) {
      const match = getVariant(item.variantId, products);
      if (!match) continue;
      const line = variantToItem(match.product, match.variant, item.quantity);
      analyticsItems.push(line);
      value += (line.price ?? 0) * item.quantity;
    }
    if (analyticsItems.length === 0) return false;

    trackBeginCheckout(analyticsItems, value);
    sentKeyRef.current = cartKey;
  }, [cartKey]);

  return null;
}
