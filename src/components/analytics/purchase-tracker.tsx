"use client";

import { useEffect, useRef } from "react";
import type { Order } from "@/lib/order-model";
import { trackPurchase } from "@/lib/analytics";

const KEY_PREFIX = "garmentloop-purchase-tracked:";

export function PurchaseTracker({ order }: { order: Order }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    try {
      if (sessionStorage.getItem(`${KEY_PREFIX}${order.orderNumber}`)) return;
      sessionStorage.setItem(`${KEY_PREFIX}${order.orderNumber}`, "1");
    } catch {
      /* ignore */
    }
    fired.current = true;
    trackPurchase(order);
  }, [order]);

  return null;
}
