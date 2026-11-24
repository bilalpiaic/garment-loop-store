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
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-sage">Cart</p>
        <h1 className="mt-2 font-serif text-4xl text-balance">Your bag</h1>
        <div className="mt-8">
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
      <div className="atelier-panel rounded-lg">
        <CartSummary />
      </div>
    </div>
  );
}
