import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-card";
import { getCollection, productsByCollection } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return { title: "Collection" };
  return { title: collection.name, description: collection.description };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();
  const products = productsByCollection(slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Collection</p>
      <h1 className="mt-2 font-serif text-4xl">{collection.name}</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">{collection.description}</p>
      <div className="mt-10">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
