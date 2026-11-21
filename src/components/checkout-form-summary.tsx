"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getVariant, type Product } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { taxLabel } from "@/lib/tax";
import { Price } from "@/components/price";

type PaymentId = "cod" | "bank_transfer" | "card_demo" | "stripe";

export function CheckoutFormSummary({
  items,
  products,
  subtotal,
  shippingAmount,
  shippingLabel,
  tax,
  total,
  currency,
  country,
  pending,
  stripeEnabled,
  errors,
  step,
  paymentMethod,
}: {
  items: { variantId: string; quantity: number }[];
  products: Product[];
  subtotal: number;
  shippingAmount: number;
  shippingLabel?: string;
  tax: number;
  total: number;
  currency: "PKR" | "USD";
  country: string;
  pending: boolean;
  stripeEnabled: boolean;
  errors: Record<string, string>;
  step: 1 | 2 | 3;
  paymentMethod: PaymentId;
}) {
  return (
    <aside className="h-fit rounded-xl border bg-card p-5 lg:sticky lg:top-24">
      <h2 className="font-serif text-2xl">Order summary</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {items.map((item) => {
          const match = getVariant(item.variantId, products);
          if (!match) return null;
          const unit = match.variant.salePricePkr ?? match.variant.pricePkr;
          return (
            <li key={item.variantId} className="flex justify-between gap-3">
              <span>
                {match.product.title}
                <span className="block text-xs text-muted-foreground">
                  {match.variant.color} · {match.variant.size} · ×{item.quantity}
                </span>
              </span>
              <span>
                <Price amountPkr={unit * item.quantity} />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 space-y-2">
        <Label htmlFor="discountCode">Discount code</Label>
        <Input id="discountCode" name="discountCode" className="h-10" placeholder="Optional" />
        {errors.discountCode ? <p className="text-xs text-destructive">{errors.discountCode}</p> : null}
      </div>
      <div className="mt-4 space-y-1 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <Price amountPkr={subtotal} />
        </div>
        <div className="flex justify-between">
          <span>{shippingLabel ?? "Shipping"}</span>
          <span>{shippingAmount === 0 ? "Free" : <Price amountPkr={shippingAmount} />}</span>
        </div>
        <div className="flex justify-between">
          <span>{taxLabel(country)}</span>
          <span>{tax === 0 ? "—" : <Price amountPkr={tax} />}</span>
        </div>
        <div className="flex justify-between pt-2 text-base font-medium">
          <span>Total</span>
          <span>{formatMoney(total, currency)}</span>
        </div>
      </div>
      <Button type="submit" className="mt-5 h-11 w-full" disabled={pending || step !== 3}>
        {pending
          ? paymentMethod === "stripe"
            ? "Redirecting to Stripe…"
            : "Placing order…"
          : step !== 3
            ? "Complete steps to place order"
            : paymentMethod === "stripe"
              ? "Continue to Stripe"
              : "Place order"}
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        Guest checkout is supported. No card data is stored on this site
        {stripeEnabled ? " — Stripe handles payment fields." : "."}
      </p>
    </aside>
  );
}
