import type { Metadata } from "next";
import { ProductGrid } from "@/components/product-card";
import { searchProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = searchProducts(q);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Search</p>
      <h1 className="mt-2 font-serif text-4xl">
        {q ? `Results for “${q}”` : "Search the store"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {q
          ? `${results.length} ${results.length === 1 ? "piece" : "pieces"} found.`
          : "Use the search icon in the header, or add ?q=puffer to this URL."}
      </p>
      <div className="mt-10">
        {q ? <ProductGrid products={results} /> : null}
      </div>
    </div>
  );
}
