"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CircularPlan } from "@/lib/circular";
import type { CircularPlanId, CircularSubscription } from "@/lib/commerce-types";
import { formatPkr } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

type Props = {
  plans: CircularPlan[];
  mockMode: boolean;
  defaultName?: string;
  defaultEmail?: string;
  cancelled?: boolean;
};

export function SubscribeForm({
  plans,
  mockMode,
  defaultName = "",
  defaultEmail = "",
  cancelled = false,
}: Props) {
  const router = useRouter();
  const [planId, setPlanId] = useState<CircularPlanId>(plans[0]?.id ?? "care");
  const [pending, setPending] = useState(false);
  const [activated, setActivated] = useState<CircularSubscription | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/circular/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          customerName: String(formData.get("customerName") ?? ""),
          customerEmail: String(formData.get("customerEmail") ?? ""),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        subscription?: CircularSubscription;
        checkoutUrl?: string | null;
        mock?: boolean;
        message?: string;
      };
      if (!response.ok || !data.subscription) {
        toast.error(data.error ?? "Could not start subscription.");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      toast.success(data.message ?? "Subscription activated");
      setActivated(data.subscription);
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setPending(false);
    }
  }

  if (activated) {
    return (
      <div className="space-y-3 rounded-xl border border-border/80 bg-card/40 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">You are in the loop</p>
        <h2 className="font-serif text-2xl">{activated.planName}</h2>
        <p className="text-sm text-muted-foreground">
          {activated.id} · <span className="capitalize text-foreground">{activated.status}</span>
          {activated.mock ? " · demo / mock billing" : ""}
        </p>
        <Button variant="outline" render={<a href="/account/circular" />}>
          View in account
        </Button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="space-y-6">
      {cancelled ? (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Checkout was cancelled. You can choose a plan again below.
        </p>
      ) : null}
      {mockMode ? (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Stripe Billing is not active — signup activates a mock subscription so the flow works
          without keys. Set Stripe keys (or unset CIRCULAR_SUBSCRIPTIONS_MOCK) for live checkout.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          You will complete payment on Stripe Checkout. Amounts are charged in USD equivalent.
        </p>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Choose a plan</legend>
        <div className="grid gap-3">
          {plans.map((plan) => {
            const selected = plan.id === planId;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanId(plan.id)}
                className={cn(
                  "rounded-xl border px-4 py-4 text-left transition",
                  selected
                    ? "border-foreground/40 bg-[color-mix(in_oklab,var(--secondary)_70%,transparent)]"
                    : "border-border/80 hover:border-foreground/25",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-serif text-xl">{plan.name}</p>
                  <p className="text-sm">
                    {formatPkr(plan.pricePkr)}
                    <span className="text-muted-foreground"> / {plan.billingInterval}</span>
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {plan.perks.map((perk) => (
                    <li key={perk}>· {perk}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Name</Label>
          <Input id="customerName" name="customerName" defaultValue={defaultName} required className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email</Label>
          <Input
            id="customerEmail"
            name="customerEmail"
            type="email"
            defaultValue={defaultEmail}
            required
            className="h-10"
          />
        </div>
      </div>

      <Button type="submit" className="h-11 px-6" disabled={pending}>
        {pending ? "Starting…" : mockMode ? "Activate mock subscription" : "Continue to Stripe"}
      </Button>
    </form>
  );
}
