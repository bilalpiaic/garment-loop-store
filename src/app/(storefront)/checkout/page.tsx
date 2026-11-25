import { CheckoutForm } from "@/components/checkout-form";
import { BeginCheckoutTracker } from "@/components/analytics/begin-checkout-tracker";
import { getCustomerSession } from "@/lib/platform";
import { pageMeta } from "@/lib/seo";
import { stripeConfigured } from "@/lib/stripe";

export const metadata = pageMeta({
  title: "Checkout",
  description: "Guest checkout with cash on delivery across Pakistan.",
  path: "/checkout",
  index: false,
});

export default async function CheckoutPage() {
  const session = await getCustomerSession();
  const defaultAddress = session?.addresses.find((item) => item.isDefault) ?? session?.addresses[0];
  const stripeEnabled = stripeConfigured();
  return (
    <div className="page-shell py-12">
      <p className="section-kicker">Checkout</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight text-balance sm:text-5xl">Place your order</h1>
      <p className="mt-3 max-w-xl text-muted-foreground leading-relaxed">
        {session
          ? "Your account details are filled in. Guest checkout stays available if you sign out."
          : "Guest checkout — no account required. Choose a shipping rate (live carriers when EasyPost is configured, otherwise zone rates), see tax estimates, and pay with COD, bank transfer, or Stripe (cards, wallets, BNPL when keyed)."}
      </p>
      <div className="mt-10">
        <BeginCheckoutTracker />
        <CheckoutForm
          stripeEnabled={stripeEnabled}
          defaults={
            session
              ? {
                  fullName: session.customer.fullName,
                  email: session.customer.email,
                  phone: session.customer.phone,
                  address: defaultAddress,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
