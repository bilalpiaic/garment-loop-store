"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/lib/catalog";
import { productToItem, trackViewItemList } from "@/lib/analytics";

export function ViewItemListTracker({
  products,
  listId,
  listName,
}: {
  products: Product[];
  listId: string;
  listName: string;
}) {
  const keyRef = useRef("");

  useEffect(() => {
    const key = `${listId}:${products.map((p) => p.id).join(",")}`;
    if (!products.length || keyRef.current === key) return;
    keyRef.current = key;
    trackViewItemList(
      products.map((product) => productToItem(product)),
      listId,
      listName,
    );
  }, [products, listId, listName]);

  return null;
}
