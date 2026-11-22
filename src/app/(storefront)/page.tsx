import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product-card";
import { HeroParallax } from "@/components/hero-parallax";
import { Reveal } from "@/components/reveal";
import { featuredProducts, productsByCollection } from "@/lib/catalog";
import { getPublishedCatalog } from "@/lib/platform";
import { site } from "@/lib/site";

export default async function HomePage() {
  const catalog = await getPublishedCatalog();
  const featured = featuredProducts(catalog.products);
  const essentials = productsByCollection("essentials", catalog.products).slice(0, 4);

  return (
    <div>
      <section className="relative isolate min-h-[90vh] overflow-hidden text-cream">
        <HeroParallax>
          <Image
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2000&q=80"
            alt="Winter fashion editorial — wool coats and city light"
            fill
            priority
            className="animate-fade-in object-cover"
            sizes="100vw"
          />
        </HeroParallax>
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(14,22,18,0.82)_0%,rgba(31,51,40,0.45)_46%,rgba(166,90,63,0.22)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--ink)]/92 via-transparent to-[color:var(--ink)]/30" />
        <div className="relative mx-auto flex min-h-[90vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:pb-24">
          <div className="gold-rule mb-6 max-w-xs opacity-80" />
          <p className="animate-fade-up font-serif text-4xl tracking-[0.03em] text-cream sm:text-5xl md:text-6xl">
            GarmentLoop
          </p>
          <h1 className="animate-fade-up animation-delay-100 mt-4 max-w-2xl text-balance font-serif text-4xl leading-[1.05] text-cream sm:text-6xl md:text-7xl">
            Warmth, cut with intention.
          </h1>
          <p className="animate-fade-up animation-delay-200 mt-5 max-w-md text-sm leading-relaxed text-cream/85 sm:text-base">
            {site.tagline} Winter layers built to outlast a single season — then return to the loop.
          </p>
          <div className="animate-fade-up animation-delay-300 mt-9 flex flex-wrap gap-3">
            <Button
              className="btn-lux btn-shimmer h-12 bg-primary px-7 text-primary-foreground shadow-none hover:bg-[color:var(--olive-jewel)]"
              render={<Link href="/collection/winter-collection" />}
            >
              Shop winter collection
            </Button>
            <Button
              variant="outline"
              className="btn-lux h-12 border-champagne/50 bg-transparent px-7 text-cream hover:bg-cream/10 hover:text-cream"
              render={<Link href="/shop" />}
            >
              Browse all
            </Button>
          </div>
        </div>
      </section>

      <Reveal>
        <section className="border-b border-border/70 bg-[color-mix(in_oklab,var(--secondary)_65%,transparent)]">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-3">
            <p>
              <span className="block font-medium text-foreground">Free standard delivery</span>
              Over PKR {site.freeShippingThresholdPkr.toLocaleString("en-PK")} in Pakistan
            </p>
            <p>
              <span className="block font-medium text-foreground">Guest checkout + COD</span>
              No account required · pay on delivery in PK
            </p>
            <p>
              <span className="block font-medium text-foreground">Circular by design</span>
              <Link href="/circular" className="underline-offset-4 hover:underline">
                Take-back, repair, and recycling subscriptions
              </Link>
            </p>
          </div>
        </section>
      </Reveal>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-sage">Featured</p>
            <h2 className="mt-2 font-serif text-3xl text-balance sm:text-4xl">Pieces that earn their keep</h2>
          </div>
          <Link
            href="/shop"
            className="nav-link hidden items-center gap-1 text-sm text-olive hover:text-olive sm:inline-flex"
          >
            Shop all <ArrowRight className="size-4" />
          </Link>
        </Reveal>
        <Reveal delayMs={80}>
          <ProductGrid products={featured} listId="home-featured" listName="Featured" />
        </Reveal>
      </section>

      <Reveal variant="slide">
        <section className="bg-[linear-gradient(180deg,color-mix(in_oklab,var(--ink)_6%,transparent),color-mix(in_oklab,var(--secondary)_75%,transparent))]">
          <div className="mx-auto grid max-w-6xl gap-3 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="group relative overflow-hidden rounded-lg"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--ink)]/90 via-[color:var(--ink)]/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-cream">
                    <h3 className="font-serif text-2xl">{category.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-cream/75">{category.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 lg:grid-cols-2">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
            <Image
              src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1400&q=80"
              alt="GarmentLoop atelier"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </Reveal>
        <Reveal delayMs={120} variant="slide">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-sage">Circular atelier</p>
            <h2 className="mt-3 font-serif text-4xl text-balance md:text-5xl">Made to last — then return.</h2>
            <div className="gold-rule my-6 max-w-[8rem]" />
            <p className="max-w-md text-muted-foreground leading-relaxed">
              GarmentLoop designs outerwear and knits for longevity: dense wool, honest fill power,
              and fits that travel from a Karachi evening to a London commute. We are building
              take-back and care programs so pieces stay in the loop.
            </p>
            <Button
              variant="outline"
              className="btn-lux mt-8 h-11 border-olive/40 px-6 text-olive hover:bg-olive hover:text-cream"
              render={<Link href="/about" />}
            >
              Our story
            </Button>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <Reveal className="mb-10">
          <p className="text-xs uppercase tracking-[0.22em] text-sage">Essentials</p>
          <h2 className="mt-2 font-serif text-3xl text-balance">Reach for these all season</h2>
        </Reveal>
        <Reveal delayMs={80}>
          <ProductGrid products={essentials} listId="home-essentials" listName="Essentials" />
        </Reveal>
      </section>
    </div>
  );
}
