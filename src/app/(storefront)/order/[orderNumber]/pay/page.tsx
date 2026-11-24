import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderEmailLookup } from "@/components/order-email-lookup";
import { StripePayPage } from "@/components/stripe-pay-page";
import { Button } from "@/components/ui/button";
import { authorizeOrderAccess, orderAccessPath, publicOrderView } from "@/lib/order-access";
import { pageMeta } from "@/lib/seo";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Pay with Stripe",
  description: "Complete your GarmentLoop payment.",
  path: "/order",
  index: false,
});

export default async function OrderPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string; email?: string }>;
}) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const access = await authorizeOrderAccess(orderNumber, {
    token: query.t,
    email: query.email,
  });
  if (!access.ok) {
    return <OrderEmailLookup orderNumber={orderNumber} />;
  }
  const order = publicOrderView(access.order);
  const viewHref = orderAccessPath(order.orderNumber, access.order.accessToken);

  if (!stripeConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-serif text-3xl">Stripe is not configured</h1>
        <p className="mt-3 text-muted-foreground">
          Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, or choose COD / bank
          transfer at checkout.
        </p>
        <Button className="mt-6" render={<Link href={viewHref} />}>
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
        <Button className="mt-6" render={<Link href={viewHref} />}>
          View order
        </Button>
      </div>
    );
  }

  return <StripePayPage order={order} />;
}
