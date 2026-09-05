"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { allColors, allSizes, categories } from "@/lib/catalog";
import { Button } from "@/components/ui/button";

export function ShopFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    router.push(`/shop?${next.toString()}`);
  }

  const selectClass = "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm";

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <select
        className={selectClass}
        value={params.get("category") ?? ""}
        onChange={(event) => update("category", event.target.value)}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.slug} value={category.slug}>
            {category.name}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={params.get("color") ?? ""}
        onChange={(event) => update("color", event.target.value)}
        aria-label="Filter by color"
      >
        <option value="">All colors</option>
        {allColors().map((color) => (
          <option key={color} value={color}>
            {color}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={params.get("size") ?? ""}
        onChange={(event) => update("size", event.target.value)}
        aria-label="Filter by size"
      >
        <option value="">All sizes</option>
        {allSizes().map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={params.get("maxPrice") ?? ""}
        onChange={(event) => update("maxPrice", event.target.value)}
        aria-label="Filter by price"
      >
        <option value="">Any price</option>
        <option value="4000">Under PKR 4,000</option>
        <option value="10000">Under PKR 10,000</option>
        <option value="16000">Under PKR 16,000</option>
      </select>
      {params.toString() ? (
        <Button variant="outline" className="h-10" onClick={() => router.push("/shop")}>
          Clear filters
        </Button>
      ) : (
        <div className="hidden lg:block" />
      )}
    </div>
  );
}
