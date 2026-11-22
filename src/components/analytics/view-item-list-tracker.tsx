"use client";

import { useRef } from "react";
import type { Product } from "@/lib/catalog";
import { productToItem, trackViewItemList } from "@/lib/analytics";
import { useTrackWhenReady } from "@/hooks/use-track-when-ready";

export function ViewItemListTracker({
  products,
  listId,
  listName,
}: {
  products: Product[];
  listId: string;
  listName: string;
}) {
  const sentKeyRef = useRef("");
  const productKey = products.map((p) => p.id).join(",");

  useTrackWhenReady(() => {
    const key = `${listId}:${productKey}`;
    if (!products.length) return false;
    if (sentKeyRef.current === key) return;
    trackViewItemList(
      products.map((product) => productToItem(product)),
      listId,
      listName,
    );
    sentKeyRef.current = key;
  }, [listId, listName, productKey, products]);

  return null;
}
