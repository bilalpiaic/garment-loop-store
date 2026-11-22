"use client";

import { useRef } from "react";
import type { Product } from "@/lib/catalog";
import { productToItem, trackViewItem } from "@/lib/analytics";
import { useTrackWhenReady } from "@/hooks/use-track-when-ready";

export function ViewItemTracker({ product }: { product: Product }) {
  const sentForIdRef = useRef<string | null>(null);

  useTrackWhenReady(() => {
    if (sentForIdRef.current === product.id) return;
    trackViewItem(productToItem(product));
    sentForIdRef.current = product.id;
  }, [product.id, product]);

  return null;
}
