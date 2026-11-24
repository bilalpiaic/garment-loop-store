"use client";

import { useState } from "react";
import { toast } from "sonner";
import { OrderReceipt } from "@/components/order-receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Order } from "@/lib/order-model";

export function OrderEmailLookup({
  orderNumber,
  recordPurchase = false,
}: {
  orderNumber: string;
  recordPurchase?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  async function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    setPending(true);
    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`,
      );
      const data = (await response.json()) as { error?: string; order?: Order };
      if (!response.ok || !data.order) {
        toast.error(data.error ?? "We could not find that order.");
        return;
      }
      setOrder(data.order);
      try {
        sessionStorage.setItem(`garmentloop-order:${orderNumber}`, JSON.stringify(data.order));
      } catch {
        /* ignore */
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setPending(false);
    }
  }

  if (order) {
    return <OrderReceipt order={order} recordPurchase={recordPurchase} />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Order lookup</p>
      <h1 className="mt-2 font-serif text-4xl">Confirm your email</h1>
      <p className="mt-3 text-muted-foreground">
        Enter the email used at checkout to view order {orderNumber}.
      </p>
      <form action={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="order-email">Email</Label>
          <Input id="order-email" name="email" type="email" required className="h-11" />
        </div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Checking…" : "View order"}
        </Button>
      </form>
    </div>
  );
}
