"use client";

import { hasAnalyticsConsent } from "@/lib/analytics/consent";
import { gaMeasurementId, metaPixelId } from "@/lib/analytics/config";
import type { AnalyticsItem } from "@/lib/analytics/items";
import { metaContentIds } from "@/lib/analytics/items";
import type { Order } from "@/lib/order-model";
import { orderToItems } from "@/lib/analytics/items";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

type TrackOptions = {
  /** Staff-side events (e.g. refund) may bypass shopper consent. */
  bypassConsent?: boolean;
};

function allowed(options?: TrackOptions) {
  if (options?.bypassConsent) return true;
  return hasAnalyticsConsent();
}

function pushGa(event: string, params?: Record<string, unknown>, options?: TrackOptions) {
  if (!allowed(options)) return;
  const id = gaMeasurementId();
  if (!id || typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", event, params ?? {});
}

function pushMeta(event: string, params?: Record<string, unknown>, options?: TrackOptions) {
  if (!allowed(options)) return;
  const id = metaPixelId();
  if (!id || typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;
  window.fbq("track", event, params ?? {});
}

export function trackPageView(path?: string) {
  const href = path ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  pushGa("page_view", { page_path: href });
  pushMeta("PageView");
}

export function trackViewItemList(items: AnalyticsItem[], listId: string, listName: string) {
  if (items.length === 0) return;
  pushGa("view_item_list", {
    item_list_id: listId,
    item_list_name: listName,
    items,
  });
}

export function trackSelectItem(item: AnalyticsItem, listId?: string, listName?: string) {
  pushGa("select_item", {
    item_list_id: listId,
    item_list_name: listName,
    items: [item],
  });
}

export function trackViewItem(item: AnalyticsItem) {
  pushGa("view_item", {
    currency: "PKR",
    value: item.price ?? 0,
    items: [item],
  });
  pushMeta("ViewContent", {
    content_ids: [item.item_id],
    content_type: "product",
    content_name: item.item_name,
    value: item.price ?? 0,
    currency: "PKR",
  });
}

export function trackAddToCart(item: AnalyticsItem) {
  const value = (item.price ?? 0) * (item.quantity ?? 1);
  pushGa("add_to_cart", {
    currency: "PKR",
    value,
    items: [item],
  });
  pushMeta("AddToCart", {
    content_ids: [item.item_id],
    content_type: "product",
    content_name: item.item_name,
    value,
    currency: "PKR",
  });
}

export function trackRemoveFromCart(item: AnalyticsItem) {
  const value = (item.price ?? 0) * (item.quantity ?? 1);
  pushGa("remove_from_cart", {
    currency: "PKR",
    value,
    items: [item],
  });
}

export function trackBeginCheckout(items: AnalyticsItem[], value: number) {
  if (items.length === 0) return;
  pushGa("begin_checkout", {
    currency: "PKR",
    value,
    items,
  });
  pushMeta("InitiateCheckout", {
    content_ids: metaContentIds(items),
    content_type: "product",
    num_items: items.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
    value,
    currency: "PKR",
  });
}

export function trackPurchase(order: Order) {
  const items = orderToItems(order);
  const value = order.totalPkr;
  // Order money fields are always PKR amounts regardless of display preference.
  pushGa("purchase", {
    transaction_id: order.orderNumber,
    currency: "PKR",
    value,
    shipping: order.shippingPkr,
    tax: order.taxPkr ?? 0,
    items,
  });
  pushMeta("Purchase", {
    content_ids: metaContentIds(items),
    content_type: "product",
    num_items: items.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
    value,
    currency: "PKR",
  });
}

async function ensureStaffGtag(measurementId: string) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") return;
  window.dataLayer = window.dataLayer || [];
  // Match the official gtag stub (Arguments object, not a rest array).
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag dataLayer protocol
    window.dataLayer?.push(arguments);
  };
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-garmentloop-ga="${measurementId}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      if (existing.dataset.loaded === "1") resolve();
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.garmentloopGa = measurementId;
    script.onload = () => {
      script.dataset.loaded = "1";
      window.gtag?.("js", new Date());
      window.gtag?.("config", measurementId, { send_page_view: false });
      resolve();
    };
    script.onerror = () => reject(new Error("GA script failed"));
    document.head.appendChild(script);
  });
}

/**
 * GA4 refund — used from admin returns queue (bypasses shopper consent).
 * Loads gtag on demand when the measurement ID is set; otherwise no-ops.
 */
export async function trackRefund(orderNumber: string, items?: AnalyticsItem[], value?: number) {
  const id = gaMeasurementId();
  if (!id || typeof window === "undefined") return;
  try {
    await ensureStaffGtag(id);
  } catch {
    return;
  }
  pushGa(
    "refund",
    {
      transaction_id: orderNumber,
      currency: "PKR",
      ...(typeof value === "number" ? { value } : {}),
      ...(items?.length ? { items } : {}),
    },
    { bypassConsent: true },
  );
}
