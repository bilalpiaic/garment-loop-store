"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchProducts } from "@/lib/catalog";
import { useCatalog } from "@/components/catalog-provider";
import { Price } from "@/components/price";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const { products } = useCatalog();
  const results = useMemo(() => searchProducts(query, products).slice(0, 8), [query, products]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
      <DialogContent className="top-[12%] translate-y-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Search the store</DialogTitle>
        </DialogHeader>
        <div className="relative px-4">
          <Search className="pointer-events-none absolute top-2.5 left-6 size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jackets, merino, olive…"
            className="h-10 pl-8"
          />
        </div>
        <div className="max-h-80 overflow-y-auto px-2 pb-4">
          {query.trim() && results.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No matches. Try “puffer”, “scarf”, or “navy”.
            </p>
          ) : (
            <ul>
              {results.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/product/${product.slug}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                  >
                    <span className="relative size-12 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={product.images[0]?.src ?? ""}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{product.title}</span>
                      <span className="text-xs text-muted-foreground">{product.subtitle}</span>
                    </span>
                    <span className="text-sm">
                      <Price amountPkr={product.variants[0]?.salePricePkr ?? product.variants[0]?.pricePkr ?? 0} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {query.trim() ? (
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              onClick={() => onOpenChange(false)}
              className="mt-2 block px-2 py-2 text-sm underline underline-offset-4"
            >
              View all results
            </Link>
          ) : (
            <p className="px-2 py-6 text-sm text-muted-foreground">
              Search jackets, knitwear, trousers, and accessories.
            </p>
          )}
        </div>
      </DialogContent>
      ) : null}
    </Dialog>
  );
}
