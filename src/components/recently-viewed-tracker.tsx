"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/lib/catalog";
import { recordRecentlyViewed } from "@/lib/recently-viewed";

/** Records the PDP product into localStorage recently-viewed (max 8). */
export function RecentlyViewedTracker({ product }: { product: Product }) {
  const recordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (recordedRef.current === product.id) return;
    recordedRef.current = product.id;
    recordRecentlyViewed({
      id: product.id,
      slug: product.slug,
      title: product.title,
      image: product.images[0]?.src ?? "",
    });
  }, [product.id, product.slug, product.title, product.images]);

  return null;
}
