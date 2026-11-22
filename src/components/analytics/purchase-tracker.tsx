"use client";

import type { Order } from "@/lib/order-model";
import { trackPurchase } from "@/lib/analytics";
import { useTrackWhenReady } from "@/hooks/use-track-when-ready";

const KEY_PREFIX = "garmentloop-purchase-tracked:";

function alreadyTracked(orderNumber: string) {
  try {
    return Boolean(localStorage.getItem(`${KEY_PREFIX}${orderNumber}`));
  } catch {
    return false;
  }
}

function markTracked(orderNumber: string) {
  try {
    localStorage.setItem(`${KEY_PREFIX}${orderNumber}`, "1");
  } catch {
    /* ignore */
  }
}

/** Fires purchase once per order after consent — only mount on confirmation flows. */
export function PurchaseTracker({ order }: { order: Order }) {
  useTrackWhenReady(() => {
    if (alreadyTracked(order.orderNumber)) return;
    trackPurchase(order);
    markTracked(order.orderNumber);
  }, [order.orderNumber]);

  return null;
}
