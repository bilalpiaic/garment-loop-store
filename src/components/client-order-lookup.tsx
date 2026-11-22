"use client";

import { useSyncExternalStore } from "react";
import { OrderReceipt } from "@/components/order-receipt";
import type { Order } from "@/lib/order-model";

function readOrder(orderNumber: string): Order | null {
  try {
    const raw = sessionStorage.getItem(`garmentloop-order:${orderNumber}`);
    return raw ? (JSON.parse(raw) as Order) : null;
  } catch {
    return null;
  }
}

export function ClientOrderLookup({
  orderNumber,
  recordPurchase = false,
}: {
  orderNumber: string;
  recordPurchase?: boolean;
}) {
  const order = useSyncExternalStore(
    () => () => undefined,
    () => readOrder(orderNumber),
    () => null,
  );

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">404</p>
        <h1 className="mt-2 font-serif text-4xl">We could not find that order</h1>
        <p className="mt-3 text-muted-foreground">
          It may have expired from this browser. Check your email or WhatsApp confirmation.
        </p>
      </div>
    );
  }
  return <OrderReceipt order={order} recordPurchase={recordPurchase} />;
}
