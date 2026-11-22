"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { allColors, allSizes } from "@/lib/catalog";
import { useCatalog } from "@/components/catalog-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function parseList(value: string | null) {
  if (!value) return [] as string[];
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

export function ShopFilters({
  basePath = "/shop",
  hideCategory = false,
}: {
  basePath?: string;
  hideCategory?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { products, categories } = useCatalog();

  const selectedColors = parseList(params.get("color"));
  const selectedSizes = parseList(params.get("size"));
  const selectedCategories = parseList(params.get("category"));

  function push(next: URLSearchParams) {
    const query = next.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  function toggleFacet(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    const current = parseList(next.get(key));
    const updated = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    if (updated.length) next.set(key, updated.join(","));
    else next.delete(key);
    push(next);
  }

  function setSingle(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  }

  return (
    <div className="mb-8 space-y-5 rounded-xl border bg-card/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Multi-select color, size, and category.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
            value={params.get("sort") ?? ""}
            onChange={(event) => setSingle("sort", event.target.value)}
            aria-label="Sort products"
          >
            <option value="">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price · low to high</option>
            <option value="price-desc">Price · high to low</option>
          </select>
          <select
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
            value={params.get("maxPrice") ?? ""}
            onChange={(event) => setSingle("maxPrice", event.target.value)}
            aria-label="Filter by price"
          >
            <option value="">Any price</option>
            <option value="4000">Under PKR 4,000</option>
            <option value="10000">Under PKR 10,000</option>
            <option value="16000">Under PKR 16,000</option>
          </select>
          {params.toString() ? (
            <Button variant="outline" className="h-10" onClick={() => router.push(basePath)}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {!hideCategory ? (
        <FacetGroup label="Category">
          {categories.map((category) => (
            <FacetChip
              key={category.slug}
              active={selectedCategories.includes(category.slug)}
              onClick={() => toggleFacet("category", category.slug)}
              label={category.name}
            />
          ))}
        </FacetGroup>
      ) : null}

      <FacetGroup label="Color">
        {allColors(products).map((color) => (
          <FacetChip
            key={color}
            active={selectedColors.includes(color)}
            onClick={() => toggleFacet("color", color)}
            label={color}
          />
        ))}
      </FacetGroup>

      <FacetGroup label="Size">
        {allSizes(products).map((size) => (
          <FacetChip
            key={size}
            active={selectedSizes.includes(size)}
            onClick={() => toggleFacet("size", size)}
            label={size}
          />
        ))}
      </FacetGroup>
    </div>
  );
}

function FacetGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FacetChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/50",
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
