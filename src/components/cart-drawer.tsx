"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getVariant } from "@/lib/catalog";
import { useCartStore } from "@/store/store";
import { Price } from "@/components/price";
import { site } from "@/lib/site";
import { shippingCostPkr } from "@/lib/money";

export function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl font-normal">Your bag</SheetTitle>
        </SheetHeader>
        <CartLines compact onNavigate={() => onOpenChange(false)} />
        <CartSummary onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function CartLines({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const hydrated = useCartStore((state) => state.hydrated);

  if (!hydrated) {
    return <p className="px-4 py-10 text-sm text-muted-foreground">Loading bag…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="font-serif text-2xl">Your bag is empty</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Start with the winter collection — jackets, knits, and layers.
        </p>
        <Button className="mt-6" render={<Link href="/shop" onClick={onNavigate} />}>
          Shop the floor
        </Button>
      </div>
    );
  }

  return (
    <ul className={compact ? "flex-1 space-y-4 overflow-y-auto px-4" : "space-y-6"}>
      {items.map((item) => {
        const match = getVariant(item.variantId);
        if (!match) return null;
        const { product, variant } = match;
        const unit = variant.salePricePkr ?? variant.pricePkr;
        return (
          <li key={item.variantId} className="flex gap-3">
            <Link
              href={`/product/${product.slug}`}
              onClick={onNavigate}
              className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted"
            >
              <Image
                src={product.images[0]?.src ?? ""}
                alt={product.title}
                fill
                className="object-cover"
                sizes="96px"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/product/${product.slug}`} onClick={onNavigate} className="text-sm font-medium">
                    {product.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {variant.color} · {variant.size}
                  </p>
                </div>
                <p className="text-sm">
                  <Price amountPkr={unit * item.quantity} />
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex items-center rounded-md border">
                  <button
                    type="button"
                    className="p-1.5"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    className="p-1.5"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove"
                  onClick={() => removeItem(item.variantId)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CartSummary({
  onNavigate,
  checkoutHref = "/checkout",
}: {
  onNavigate?: () => void;
  checkoutHref?: string;
}) {
  const items = useCartStore((state) => state.items);
  const hydrated = useCartStore((state) => state.hydrated);
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const match = getVariant(item.variantId);
      if (!match) return sum;
      const unit = match.variant.salePricePkr ?? match.variant.pricePkr;
      return sum + unit * item.quantity;
    }, 0);
    const shipping = shippingCostPkr(subtotal, "PK");
    return { subtotal, shipping, total: subtotal + shipping };
  }, [items]);

  if (!hydrated || items.length === 0) {
    return null;
  }

  return (
    <SheetFooter className="border-t">
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <Price amountPkr={totals.subtotal} />
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Delivery in Pakistan</span>
          <span>
            {totals.shipping === 0 ? "Free" : <Price amountPkr={totals.shipping} />}
          </span>
        </div>
        {totals.subtotal < site.freeShippingThresholdPkr ? (
          <p className="pt-1 text-xs text-muted-foreground">
            Add <Price amountPkr={site.freeShippingThresholdPkr - totals.subtotal} /> more for free
            Pakistani delivery.
          </p>
        ) : null}
      </div>
      <Button className="h-11 w-full" render={<Link href={checkoutHref} onClick={onNavigate} />}>
        Checkout
      </Button>
    </SheetFooter>
  );
}
