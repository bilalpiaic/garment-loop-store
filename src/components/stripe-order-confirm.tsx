"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OrderReceipt } from "@/components/order-receipt";
import { ClientOrderLookup } from "@/components/client-order-lookup";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/order-model";

export function StripeOrderConfirm({
  orderNumber,
  sessionId,
  paymentIntentId,
  initialOrder,
}: {
  orderNumber: string;
  sessionId?: string;
  paymentIntentId?: string;
  initialOrder?: Order | null;
}) {
  const [order, setOrder] = useState<Order | null>(initialOrder ?? null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function confirm() {
      try {
        const response = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber,
            ...(paymentIntentId ? { paymentIntentId } : {}),
            ...(sessionId ? { sessionId } : {}),
          }),
        });
        const data = (await response.json()) as {
          order?: Order;
          error?: string;
          processing?: boolean;
          message?: string;
        };
        if (response.status === 202 || data.processing) {
          if (!cancelled) {
            setProcessing(true);
            if (data.order) setOrder(data.order);
          }
          return;
        }
        if (!response.ok || !data.order) {
          if (!cancelled) setError(data.error ?? "Could not confirm payment.");
          return;
        }
        if (!cancelled) {
          setOrder(data.order);
          sessionStorage.setItem(`garmentloop-order:${orderNumber}`, JSON.stringify(data.order));
          try {
            sessionStorage.removeItem(`garmentloop-stripe:${orderNumber}`);
          } catch {
            /* ignore */
          }
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
  }, [orderNumber, sessionId, paymentIntentId]);

  if (order && order.paymentStatus === "paid") {
    return <OrderReceipt order={order} recordPurchase />;
  }

  if (processing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stripe</p>
        <h1 className="mt-2 font-serif text-3xl">Payment processing</h1>
        <p className="mt-3 text-muted-foreground">
          Order {orderNumber} is awaiting final confirmation from Stripe (common for some BNPL
          methods). We will mark it paid when the webhook or a refresh confirms success.
        </p>
        {order ? (
          <div className="mt-8">
            <OrderReceipt order={order} />
          </div>
        ) : null}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-serif text-3xl">Payment confirmation</h1>
        <p className="mt-3 text-muted-foreground">{error}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button render={<Link href={`/order/${orderNumber}/pay`} />}>Try payment again</Button>
          <Button variant="outline" render={<Link href={`/order/${orderNumber}`} />}>
            View order
          </Button>
        </div>
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
