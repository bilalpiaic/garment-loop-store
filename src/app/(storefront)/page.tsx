import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product-card";
import { RecentlyViewedShelf } from "@/components/recently-viewed-shelf";
import { HeroParallax } from "@/components/hero-parallax";
import { Reveal } from "@/components/reveal";
import { featuredProducts, productsByCollection } from "@/lib/catalog";
import { getPublishedCatalog } from "@/lib/platform";
import { site } from "@/lib/site";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: `${site.name} — Circular wardrobe atelier`,
  description: site.description,
  path: "/",
  absoluteTitle: true,
  images: [
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2000&q=80",
  ],
});

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
        <div className="absolute inset-0 bg-[linear-gradient(118deg,rgba(14,22,18,0.88)_0%,rgba(31,51,40,0.55)_52%,rgba(14,22,18,0.35)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--ink)]/94 via-transparent to-[color:var(--ink)]/28" />
        <div className="page-shell relative flex min-h-[90vh] flex-col justify-end pb-16 pt-28 sm:pb-24">
          <div className="gold-rule mb-7 max-w-xs opacity-75" />
          <p className="animate-fade-up font-serif text-5xl tracking-[0.06em] text-cream sm:text-6xl md:text-7xl">
            GarmentLoop
          </p>
          <h1 className="animate-fade-up animation-delay-100 mt-5 max-w-2xl text-balance font-serif text-3xl leading-[1.08] text-cream/95 sm:text-5xl md:text-6xl">
            Warmth, cut with intention.
          </h1>
          <p className="animate-fade-up animation-delay-200 mt-5 max-w-md text-sm leading-relaxed text-cream/80 sm:text-base">
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
              className="btn-lux h-12 border-champagne/45 bg-transparent px-7 text-cream hover:bg-cream/10 hover:text-cream"
              render={<Link href="/shop" />}
            >
              Browse all
            </Button>
          </div>
        </div>
      </section>

      <Reveal>
        <section className="border-b border-border/50">
          <div className="page-shell grid gap-8 py-9 text-sm text-muted-foreground sm:grid-cols-3">
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

      <section className="page-shell py-20">
        <Reveal className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Featured</p>
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
        <section className="ink-band">
          <div className="page-shell grid gap-px py-16 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="group relative overflow-hidden"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition duration-700 ease-out group-hover:scale-[1.05]"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--ink)]/88 via-[color:var(--ink)]/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-cream">
                    <h3 className="font-serif text-2xl">{category.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-cream/70">{category.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      <section className="page-shell grid items-center gap-12 py-24 lg:grid-cols-2">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden">
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
            <p className="section-kicker">Circular atelier</p>
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

      <section className="page-shell pb-24">
        <Reveal className="mb-10">
          <p className="section-kicker">Essentials</p>
          <h2 className="mt-2 font-serif text-3xl text-balance">Reach for these all season</h2>
        </Reveal>
        <Reveal delayMs={80}>
          <ProductGrid products={essentials} listId="home-essentials" listName="Essentials" />
        </Reveal>
      </section>

      <RecentlyViewedShelf />
    </div>
  );
}
