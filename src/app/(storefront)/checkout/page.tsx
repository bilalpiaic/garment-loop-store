import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { getCustomerSession } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Guest checkout with cash on delivery across Pakistan.",
};

export default async function CheckoutPage() {
  const session = await getCustomerSession();
  const defaultAddress = session?.addresses.find((item) => item.isDefault) ?? session?.addresses[0];
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Checkout</p>
      <h1 className="mt-2 font-serif text-4xl">Place your order</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        {session
          ? "Your account details are filled in. Guest checkout stays available if you sign out."
          : "Guest checkout — no account required. Cash on delivery is available in Pakistan. We confirm every order on WhatsApp."}
      </p>
      <div className="mt-10">
        <CheckoutForm
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
