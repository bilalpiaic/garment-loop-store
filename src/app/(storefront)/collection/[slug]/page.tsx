import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-card";
import { ShopFilters } from "@/components/shop-filters";
import { JsonLd } from "@/components/json-ld";
import { filterProducts, getCollection, productsByCollection } from "@/lib/catalog";
import { getPublishedCatalog } from "@/lib/platform";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getPublishedCatalog();
  const collection = getCollection(slug, catalog.collections);
  if (!collection) return { title: "Collection" };
  return pageMeta({
    title: collection.name,
    description: collection.description,
    path: `/collection/${slug}`,
    images: collection.image ? [collection.image] : undefined,
  });
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string; size?: string; maxPrice?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const catalog = await getPublishedCatalog();
  const collection = getCollection(slug, catalog.collections);
  if (!collection) notFound();
  const base = productsByCollection(slug, catalog.products);
  const products = filterProducts(
    {
      color: query.color,
      size: query.size,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      sort: query.sort,
    },
    base,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Shop", path: "/shop" },
          { name: collection.name, path: `/collection/${slug}` },
        ])}
      />
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Collection</p>
      <h1 className="mt-2 font-serif text-4xl">{collection.name}</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">{collection.description}</p>
      <div className="mt-10">
        <Suspense>
          <ShopFilters basePath={`/collection/${slug}`} hideCategory />
        </Suspense>
        <ProductGrid
          products={products}
          listId={`collection-${slug}`}
          listName={collection.name}
        />
      </div>
    </div>
  );
}
