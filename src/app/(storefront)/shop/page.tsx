import { Suspense } from "react";
import { ShopPersonalizedGrid, RecentlyViewedShelf } from "@/components/recently-viewed-shelf";
import { ShopFilters } from "@/components/shop-filters";
import { filterProducts } from "@/lib/catalog";
import { getPublishedCatalog } from "@/lib/platform";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Shop",
  description: "Browse GarmentLoop jackets, knitwear, trousers, and winter accessories.",
  path: "/shop",
});

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    color?: string;
    size?: string;
    maxPrice?: string;
    q?: string;
    sort?: string;
  }>;
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
      sort: params.sort,
    },
    catalog.products,
  );

  return (
    <div className="page-shell py-12">
      <p className="section-kicker">Catalog</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Shop</h1>
      <p className="mt-3 max-w-xl text-muted-foreground leading-relaxed">
        Circular wardrobe essentials. Combine filters for color, size, and category — guest checkout
        stays available.
      </p>
      <div className="mt-8">
        <Suspense>
          <ShopFilters />
        </Suspense>
        <p className="mb-6 text-sm text-muted-foreground">
          {products.length} piece{products.length === 1 ? "" : "s"}
        </p>
        <ShopPersonalizedGrid products={products} listId="shop" listName="Shop" />
      </div>
      <RecentlyViewedShelf className="mt-16 px-0 py-0" />
    </div>
  );
}
