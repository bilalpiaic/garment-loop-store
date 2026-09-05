import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Guest checkout with cash on delivery across Pakistan.",
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Checkout</p>
      <h1 className="mt-2 font-serif text-4xl">Place your order</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Guest checkout — no account required. Cash on delivery is available in Pakistan. We confirm
        every order on WhatsApp.
      </p>
      <div className="mt-10">
        <CheckoutForm />
      </div>
    </div>
  );
}
