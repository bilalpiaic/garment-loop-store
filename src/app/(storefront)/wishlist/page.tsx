"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProductGrid } from "@/components/product-card";
import { useCatalog } from "@/components/catalog-provider";
import { useWishlistStore } from "@/store/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { Button } from "@/components/ui/button";

export default function WishlistPage() {
  const hydrated = useHydrated();
  const productIds = useWishlistStore((state) => state.productIds);
  const { products } = useCatalog();
  const saved = useMemo(
    () => products.filter((product) => productIds.includes(product.id)),
    [products, productIds],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Saved</p>
      <h1 className="mt-2 font-serif text-4xl">Wishlist</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Guest saves stay in this browser. Sign in to sync your wishlist to your account.
      </p>
      <div className="mt-10">
        {!hydrated ? (
          <p className="text-sm text-muted-foreground">Loading saved pieces…</p>
        ) : saved.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <p className="font-serif text-2xl">Nothing saved yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap the heart on a product to keep it for later.
            </p>
            <Button className="mt-6 h-11 px-6" render={<Link href="/shop" />}>
              Browse shop
            </Button>
          </div>
        ) : (
          <ProductGrid products={saved} />
        )}
      </div>
    </div>
  );
}
