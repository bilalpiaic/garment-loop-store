"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/lib/catalog";
import { productToItem, trackViewItem } from "@/lib/analytics";

export function ViewItemTracker({ product }: { product: Product }) {
  const seen = useRef(false);

  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    trackViewItem(productToItem(product));
  }, [product]);

  return null;
}
