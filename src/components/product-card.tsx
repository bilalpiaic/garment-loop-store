import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { comparePrice, lowestPrice, type Product } from "@/lib/catalog";
import { Price } from "@/components/price";

export function ProductCard({ product }: { product: Product }) {
  const price = lowestPrice(product);
  const compare = comparePrice(product);
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
        <Image
          src={product.images[0]?.src ?? ""}
          alt={product.images[0]?.alt ?? product.title}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          {product.isNew ? <Badge className="bg-background/90 text-foreground">New</Badge> : null}
          {compare ? <Badge className="bg-primary text-primary-foreground">Sale</Badge> : null}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-medium tracking-tight">{product.title}</h3>
        <p className="text-xs text-muted-foreground">{product.subtitle}</p>
        <p className="text-sm">
          <Price amountPkr={price} compareAtPkr={compare} />
        </p>
      </div>
    </Link>
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
