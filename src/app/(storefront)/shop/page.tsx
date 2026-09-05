import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductGrid } from "@/components/product-card";
import { ShopFilters } from "@/components/shop-filters";
import { filterProducts } from "@/lib/catalog";
import { getPublishedCatalog } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse GarmentLoop jackets, knitwear, trousers, and winter accessories.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; color?: string; size?: string; maxPrice?: string; q?: string }>;
}) {
  const params = await searchParams;
  const catalog = await getPublishedCatalog();
  const products = filterProducts(
    {
      category: params.category,
      color: params.color,
      size: params.size,
      maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
      q: params.q,
    },
    catalog.products,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
      <h1 className="mt-2 font-serif text-4xl">Shop</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Winter outerwear and layers. Filter by size, color, and price. Guest checkout and cash on
        delivery are available.
      </p>
      <div className="mt-8">
        <Suspense>
          <ShopFilters />
        </Suspense>
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
