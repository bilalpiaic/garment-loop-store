import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CIRCULAR_PLANS } from "@/lib/circular";
import { formatPkr } from "@/lib/admin-nav";

export const metadata: Metadata = {
  title: "Circular wardrobe",
  description: "Take-back, atelier repair, and recycling subscriptions from GarmentLoop.",
};

export default function CircularHubPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--sage)_18%,transparent),transparent_55%),linear-gradient(180deg,color-mix(in_oklab,var(--secondary)_80%,transparent),transparent)]"
      />
      <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <p className="text-xs uppercase tracking-[0.22em] text-sage">Circular wardrobe</p>
        <h1 className="mt-3 font-serif text-4xl text-balance sm:text-5xl">
          GarmentLoop stay-in-the-loop programs
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Request a take-back, book a repair, or join a recycling subscription — guest-friendly flows
          with status tracking, managed by the atelier desk.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          <section>
            <h2 className="font-serif text-2xl">Take-back</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Send pieces back for credit estimate, refresh, or responsible recycling.
            </p>
            <Button className="mt-5 h-10 px-5" render={<Link href="/circular/take-back" />}>
              Start take-back
            </Button>
          </section>
          <section>
            <h2 className="font-serif text-2xl">Repair</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Book an atelier repair with quote and appointment hooks for the studio team.
            </p>
            <Button className="mt-5 h-10 px-5" render={<Link href="/circular/repair" />}>
              Request repair
            </Button>
          </section>
          <section>
            <h2 className="font-serif text-2xl">Subscribe</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Care, Repair+, or Recycle Loop — Stripe when keyed, mock signup otherwise.
            </p>
            <Button className="mt-5 h-10 px-5" render={<Link href="/circular/subscribe" />}>
              View plans
            </Button>
          </section>
        </div>

        <section className="mt-16 border-t border-border/70 pt-10">
          <h2 className="font-serif text-2xl">Membership snapshot</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {CIRCULAR_PLANS.map((plan) => (
              <li key={plan.id}>
                <p className="font-medium">{plan.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPkr(plan.pricePkr)} / {plan.billingInterval}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
