"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CircularSubscription } from "@/lib/commerce-types";

export function SubscribeSuccess({
  sessionId,
  subscriptionId,
}: {
  sessionId: string;
  subscriptionId: string;
}) {
  const [subscription, setSubscription] = useState<CircularSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function confirm() {
      try {
        const response = await fetch("/api/circular/subscriptions/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, subscriptionId }),
        });
        const data = (await response.json()) as {
          error?: string;
          subscription?: CircularSubscription;
        };
        if (cancelled) return;
        if (!response.ok || !data.subscription) {
          setError(data.error ?? "Could not confirm subscription.");
          return;
        }
        setSubscription(data.subscription);
      } catch {
        if (!cancelled) setError("Network error confirming subscription.");
      } finally {
        if (!cancelled) setPending(false);
      }
    }
    void confirm();
    return () => {
      cancelled = true;
    };
  }, [sessionId, subscriptionId]);

  if (pending) {
    return <p className="text-sm text-muted-foreground">Confirming your subscription…</p>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" render={<Link href="/circular/subscribe" />}>
          Back to plans
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {subscription?.planName} is{" "}
        <span className="capitalize text-foreground">{subscription?.status}</span>.
      </p>
      <p className="text-xs text-muted-foreground">{subscription?.id}</p>
      <div className="flex flex-wrap gap-3">
        <Button render={<Link href="/account/circular" />}>View circular account</Button>
        <Button variant="outline" render={<Link href="/circular" />}>
          Circular hub
        </Button>
      </div>
    </div>
  );
}
