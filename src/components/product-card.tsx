import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { comparePrice, lowestPrice, type Product } from "@/lib/catalog";
import { Price } from "@/components/price";
import { ProductQuickView } from "@/components/product-quick-view";

export function ProductCard({ product }: { product: Product }) {
  const price = lowestPrice(product);
  const compare = comparePrice(product);
  return (
    <div className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-secondary/80">
        <Link href={`/product/${product.slug}`} className="absolute inset-0">
          <Image
            src={product.images[0]?.src ?? ""}
            alt={product.images[0]?.alt ?? product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
          />
        </Link>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          {product.isNew ? (
            <Badge className="rounded-md border-0 bg-cream/95 text-charcoal shadow-none">New</Badge>
          ) : null}
          {compare ? (
            <Badge className="rounded-md border-0 bg-copper text-cream shadow-none">Sale</Badge>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 p-0">
          <ProductQuickView product={product} />
        </div>
      </div>
      <Link href={`/product/${product.slug}`} className="mt-3.5 block space-y-1">
        <h3 className="font-serif text-base tracking-tight transition-colors duration-300 group-hover:text-olive">
          {product.title}
        </h3>
        <p className="text-xs text-muted-foreground">{product.subtitle}</p>
        <p className="text-sm">
          <Price amountPkr={price} compareAtPkr={compare} />
        </p>
      </Link>
    </div>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-16 text-center">
        <p className="font-serif text-2xl">Nothing matches these filters</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try clearing size, color, or price to see the full winter floor.
        </p>
        <Link href="/shop" className="mt-4 inline-block text-sm underline underline-offset-4">
          View all products
        </Link>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
