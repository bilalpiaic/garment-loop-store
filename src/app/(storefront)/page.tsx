import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product-card";
import { featuredProducts, productsByCollection } from "@/lib/catalog";
import { getPublishedCatalog } from "@/lib/platform";
import { site } from "@/lib/site";

export default async function HomePage() {
  const catalog = await getPublishedCatalog();
  const featured = featuredProducts(catalog.products);
  const essentials = productsByCollection("essentials", catalog.products).slice(0, 4);

  return (
    <div>
      <section className="relative isolate min-h-[78vh] overflow-hidden bg-zinc-900 text-white">
        <Image
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2000&q=80"
          alt="Winter fashion editorial"
          fill
          priority
          className="object-cover opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/20" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 py-16 sm:py-24">
          <p className="text-xs uppercase tracking-[0.28em] text-white/80">Winter 2026</p>
          <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight sm:text-6xl">
            Warmth, cut with intention.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
            {site.tagline} Shop the winter collection — puffers, wool coats, merino, and the layers
            underneath.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              className="h-11 bg-white px-6 text-zinc-900 hover:bg-white/90"
              render={<Link href="/collection/winter-collection" />}
            >
              Shop winter collection
            </Button>
            <Button
              variant="outline"
              className="h-11 border-white/40 bg-transparent px-6 text-white hover:bg-white/10"
              render={<Link href="/shop" />}
            >
              Browse all
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Featured</p>
            <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Pieces that earn their keep</h2>
          </div>
          <Link href="/shop" className="hidden items-center gap-1 text-sm sm:inline-flex">
            Shop all <ArrowRight className="size-4" />
          </Link>
        </div>
        <ProductGrid products={featured} />
      </section>

      <section className="bg-[#f4f1ec]">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.categories.map((category) => (
            <Link key={category.slug} href={`/category/${category.slug}`} className="group relative overflow-hidden rounded-xl">
              <div className="relative aspect-[4/5]">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="font-serif text-2xl">{category.name}</h3>
                  <p className="mt-1 text-xs text-white/80">{category.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
          <Image
            src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1400&q=80"
            alt="GarmentLoop atelier"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The house</p>
          <h2 className="mt-2 font-serif text-4xl">Built in Pakistan, made for winter.</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            GarmentLoop is a small winter-apparel house. We cut outerwear and knits for people who
            want quality they can feel — dense wool, honest fill power, and fits that work on a
            Karachi evening as well as a London commute. Cash on delivery is available across
            Pakistan because trust should be simple.
          </p>
          <Button variant="outline" className="mt-6 h-11 px-6" render={<Link href="/about" />}>
            Our story
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Essentials</p>
          <h2 className="mt-1 font-serif text-3xl">Reach for these all season</h2>
        </div>
        <ProductGrid products={essentials} />
      </section>
    </div>
  );
}
