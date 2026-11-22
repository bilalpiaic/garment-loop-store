"use client";

import { useEffect, useState } from "react";
import { OrderReceipt } from "@/components/order-receipt";
import { ClientOrderLookup } from "@/components/client-order-lookup";
import type { Order } from "@/lib/order-model";

export function StripeOrderConfirm({
  orderNumber,
  sessionId,
  initialOrder,
}: {
  orderNumber: string;
  sessionId: string;
  initialOrder?: Order | null;
}) {
  const [order, setOrder] = useState<Order | null>(initialOrder ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function confirm() {
      try {
        const response = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, orderNumber }),
        });
        const data = (await response.json()) as { order?: Order; error?: string };
        if (!response.ok || !data.order) {
          if (!cancelled) setError(data.error ?? "Could not confirm payment.");
          return;
        }
        if (!cancelled) {
          setOrder(data.order);
          sessionStorage.setItem(`garmentloop-order:${orderNumber}`, JSON.stringify(data.order));
          try {
            const { useCartStore } = await import("@/store/store");
            useCartStore.getState().clear();
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) setError("Network error confirming payment.");
      }
    }
    void confirm();
    return () => {
      cancelled = true;
    };
  }, [orderNumber, sessionId]);

  if (order && (order.paymentStatus === "paid" || !sessionId)) {
    return <OrderReceipt order={order} recordPurchase />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-serif text-3xl">Payment confirmation</h1>
        <p className="mt-3 text-muted-foreground">{error}</p>
        {order ? (
          <div className="mt-8">
            <OrderReceipt order={order} recordPurchase />
          </div>
        ) : (
          <ClientOrderLookup orderNumber={orderNumber} recordPurchase />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stripe</p>
      <h1 className="mt-2 font-serif text-3xl">Confirming your payment…</h1>
      <p className="mt-3 text-muted-foreground">Order {orderNumber}</p>
    </div>
  );
}
