import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StripePayPage } from "@/components/stripe-pay-page";
import { Button } from "@/components/ui/button";
import { getOrder } from "@/lib/orders";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pay with Stripe",
};

export default async function OrderPayPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrder(orderNumber);
  if (!order) notFound();

  if (!stripeConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-serif text-3xl">Stripe is not configured</h1>
        <p className="mt-3 text-muted-foreground">
          Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, or choose COD / bank /
          card demo at checkout.
        </p>
        <Button className="mt-6" render={<Link href={`/order/${order.orderNumber}`} />}>
          View order
        </Button>
      </div>
    );
  }

  if (order.paymentMethod !== "stripe") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-serif text-3xl">No card payment due</h1>
        <p className="mt-3 text-muted-foreground">
          This order uses {order.paymentMethod.replace("_", " ")}.
        </p>
        <Button className="mt-6" render={<Link href={`/order/${order.orderNumber}`} />}>
          View order
        </Button>
      </div>
    );
  }

  return <StripePayPage order={order} />;
}
