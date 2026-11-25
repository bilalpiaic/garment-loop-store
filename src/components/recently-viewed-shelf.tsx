"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/product-card";
import { useCatalog } from "@/components/catalog-provider";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  boostByRecentlyViewed,
  readRecentlyViewed,
  recentlyViewedIds,
  type RecentlyViewedItem,
} from "@/lib/recently-viewed";
import type { Product } from "@/lib/catalog";

function useRecentlyViewed(): RecentlyViewedItem[] {
  const hydrated = useHydrated();
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  const refresh = useCallback(() => {
    setItems(readRecentlyViewed());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    refresh();
    function onStorage(event: StorageEvent) {
      if (event.key === null || event.key === "garmentloop-recently-viewed") refresh();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("garmentloop-recently-viewed", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("garmentloop-recently-viewed", refresh);
    };
  }, [hydrated, refresh]);

  return hydrated ? items : [];
}

export function RecentlyViewedShelf({
  excludeProductId,
  className,
}: {
  excludeProductId?: string;
  className?: string;
}) {
  const items = useRecentlyViewed();
  const { products } = useCatalog();

  const shelf = useMemo(() => {
    const ids = items.map((item) => item.id).filter((id) => id !== excludeProductId);
    if (ids.length === 0) return [] as Product[];
    const byId = new Map(products.map((product) => [product.id, product]));
    return ids.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));
  }, [items, products, excludeProductId]);

  if (shelf.length === 0) return null;

  return (
    <section className={className ?? "mx-auto max-w-6xl px-4 py-16"}>
      <p className="text-xs uppercase tracking-[0.22em] text-sage">Personalization</p>
      <h2 className="mt-2 font-serif text-3xl text-balance">Recently viewed</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Saved in this browser only — revisit pieces you opened on product pages.
      </p>
      <div className="mt-8">
        <ProductGrid products={shelf} listId="recently-viewed" listName="Recently viewed" />
      </div>
    </section>
  );
}

/** Client shop grid with a soft sort boost for recently viewed ids. */
export function ShopPersonalizedGrid({
  products,
  listId = "shop",
  listName = "Shop",
}: {
  products: Product[];
  listId?: string;
  listName?: string;
}) {
  const hydrated = useHydrated();
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    setRecentIds(recentlyViewedIds());
    function refresh() {
      setRecentIds(recentlyViewedIds());
    }
    window.addEventListener("garmentloop-recently-viewed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("garmentloop-recently-viewed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [hydrated]);

  const ordered = useMemo(
    () => (hydrated ? boostByRecentlyViewed(products, recentIds) : products),
    [products, recentIds, hydrated],
  );

  return <ProductGrid products={ordered} listId={listId} listName={listName} />;
}
