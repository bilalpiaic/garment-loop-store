import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-card";
import { getCategory, productsByCategory } from "@/lib/catalog";
import { getPublishedCatalog } from "@/lib/platform";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getPublishedCatalog();
  const category = getCategory(slug, catalog.categories);
  if (!category) return { title: "Category" };
  return { title: category.name, description: category.description };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getPublishedCatalog();
  const category = getCategory(slug, catalog.categories);
  if (!category) notFound();
  const products = productsByCategory(slug, catalog.products);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Category</p>
      <h1 className="mt-2 font-serif text-4xl">{category.name}</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">{category.description}</p>
      <div className="mt-10">
        <ProductGrid
          products={products}
          listId={`category-${slug}`}
          listName={category.name}
        />
      </div>
    </div>
  );
}
