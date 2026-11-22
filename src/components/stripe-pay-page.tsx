"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StripeExpressPay } from "@/components/stripe-express-pay";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/order-model";

const storageKey = (orderNumber: string) => `garmentloop-stripe:${orderNumber}`;

type StoredPay = {
  clientSecret: string;
  publishableKey: string;
};

export function StripePayPage({ order }: { order: Order }) {
  const [payload, setPayload] = useState<StoredPay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        try {
          const raw = sessionStorage.getItem(storageKey(order.orderNumber));
          if (raw) {
            const parsed = JSON.parse(raw) as StoredPay;
            if (parsed.clientSecret && parsed.publishableKey) {
              if (!cancelled) {
                setPayload(parsed);
                setLoading(false);
              }
              return;
            }
          }
        } catch {
          /* ignore storage */
        }

        const response = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber: order.orderNumber }),
        });
        const data = (await response.json()) as StoredPay & { error?: string };
        if (!response.ok || !data.clientSecret || !data.publishableKey) {
          if (!cancelled) setError(data.error ?? "Could not start Stripe payment.");
          return;
        }
        try {
          sessionStorage.setItem(
            storageKey(order.orderNumber),
            JSON.stringify({
              clientSecret: data.clientSecret,
              publishableKey: data.publishableKey,
            }),
          );
        } catch {
          /* ignore */
        }
        if (!cancelled) setPayload({ clientSecret: data.clientSecret, publishableKey: data.publishableKey });
      } catch {
        if (!cancelled) setError("Network error starting payment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [order.orderNumber]);

  if (order.paymentStatus === "paid") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-serif text-3xl">Already paid</h1>
        <Button className="mt-6" render={<Link href={`/order/${order.orderNumber}`} />}>
          View order
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="text-muted-foreground">Preparing secure payment…</p>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-serif text-3xl">Payment unavailable</h1>
        <p className="mt-3 text-muted-foreground">{error ?? "Missing Stripe client secret."}</p>
        <Button className="mt-6" variant="outline" render={<Link href="/checkout" />}>
          Back to checkout
        </Button>
      </div>
    );
  }

  return (
    <StripeExpressPay
      order={order}
      clientSecret={payload.clientSecret}
      publishableKey={payload.publishableKey}
    />
  );
}
