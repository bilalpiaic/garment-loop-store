"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  uniqueColors,
  uniqueSizes,
  type Product,
  type ProductVariant,
} from "@/lib/catalog";
import { useCartStore } from "@/store/store";
import { cn } from "@/lib/utils";
import { Price } from "@/components/price";

export function ProductForm({ product }: { product: Product }) {
  const colors = uniqueColors(product);
  const sizes = uniqueSizes(product);
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();
  const [color, setColor] = useState(colors[0]?.color ?? "");
  const [size, setSize] = useState(() => {
    const firstInStock = product.variants.find(
      (item) => item.color === (colors[0]?.color ?? "") && item.stock > 0,
    );
    if (firstInStock) return firstInStock.size;
    return sizes.length === 1 ? sizes[0] : "";
  });

  const variant: ProductVariant | undefined = useMemo(
    () => product.variants.find((item) => item.color === color && item.size === size),
    [product.variants, color, size],
  );

  const selected = Boolean(color && size);
  const inStock = (variant?.stock ?? 0) > 0;
  const price = variant?.salePricePkr ?? variant?.pricePkr ?? product.variants[0]?.salePricePkr ?? product.variants[0]?.pricePkr ?? 0;
  const compare = variant?.salePricePkr ? variant.pricePkr : undefined;

  function addToCart(goToCheckout = false) {
    if (!variant) {
      toast.error("Choose a color and size.");
      return;
    }
    if (!inStock) {
      toast.error("That size is out of stock.");
      return;
    }
    addItem(variant.id, 1);
    toast.success(`${product.title} added to bag.`);
    if (goToCheckout) {
      router.push("/checkout");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-2xl font-medium">
          <Price amountPkr={price} compareAtPkr={compare} />
        </p>
        {selected && variant ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {inStock
              ? variant.stock <= 5
                ? `Only ${variant.stock} left`
                : "In stock · ships in 2–4 days"
              : "Out of stock"}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Select a size to check availability.</p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Color{color ? ` · ${color}` : ""}</legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((item) => (
            <button
              key={item.color}
              type="button"
              onClick={() => setColor(item.color)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                color === item.color ? "border-foreground" : "border-border",
              )}
              aria-pressed={color === item.color}
            >
              <span
                className="size-3.5 rounded-full border"
                style={{ backgroundColor: item.hex }}
              />
              {item.color}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Size{size ? ` · ${size}` : ""}</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((item) => {
            const option = product.variants.find((v) => v.color === color && v.size === item);
            const soldOut = (option?.stock ?? 0) <= 0;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setSize(item)}
                disabled={soldOut}
                className={cn(
                  "min-w-12 rounded-md border px-3 py-2 text-sm",
                  size === item ? "border-foreground bg-foreground text-background" : "border-border",
                  soldOut && "cursor-not-allowed opacity-40 line-through",
                )}
              >
                {item}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={cn(
            "h-11 flex-1 rounded-lg px-6 text-sm font-medium transition",
            selected && inStock
              ? "bg-primary text-primary-foreground hover:bg-primary/80"
              : "bg-primary/40 text-primary-foreground",
          )}
          onClick={() => addToCart(false)}
        >
          Add to bag
        </button>
        <button
          type="button"
          className="h-11 flex-1 rounded-lg border border-border bg-background px-6 text-sm font-medium hover:bg-muted"
          onClick={() => addToCart(true)}
        >
          Buy now
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Cash on delivery available in Pakistan. Questions? Message us on WhatsApp after you order.
      </p>
    </div>
  );
}
