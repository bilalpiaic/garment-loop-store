import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">404</p>
      <h1 className="mt-2 font-serif text-4xl">That page is not on the floor</h1>
      <p className="mt-3 text-muted-foreground">
        The link may be old, or the product has been archived. Head back to the shop.
      </p>
      <Button className="mt-8 h-11 px-6" render={<Link href="/shop" />}>
        Browse products
      </Button>
    </div>
  );
}
