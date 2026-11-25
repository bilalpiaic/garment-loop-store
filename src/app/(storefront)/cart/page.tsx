import Link from "next/link";
import { CartLines, CartSummary } from "@/components/cart-drawer";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Bag",
  description: "Your GarmentLoop shopping bag.",
  path: "/cart",
  index: false,
});

export default function CartPage() {
  return (
    <div className="page-shell grid gap-10 py-12 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <p className="section-kicker text-champagne">Cart</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-balance sm:text-5xl">Your bag</h1>
        <div className="atelier-panel mt-8 rounded-lg p-5 sm:p-6">
          <CartLines />
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Need a size check?{" "}
          <Link href="/contact" className="text-olive underline underline-offset-4">
            Message us
          </Link>{" "}
          before you order.
        </p>
      </div>
      <div className="atelier-panel h-fit rounded-lg">
        <CartSummary />
      </div>
    </div>
  );
}
