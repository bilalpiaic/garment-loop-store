import Link from "next/link";
import { site } from "@/lib/site";
import type { Category } from "@/lib/catalog";

export function SiteFooter({ categories }: { categories: Category[] }) {
  return (
    <footer className="mt-auto border-t bg-secondary/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-serif text-2xl">GarmentLoop</p>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {site.tagline} Designed in Lahore. Built for winters at home and abroad.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Shop</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/shop">All products</Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/category/${category.slug}`}>{category.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">House</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about">About</Link>
            </li>
            <li>
              <Link href="/sustainability">Sustainability</Link>
            </li>
            <li>
              <Link href="/faq">FAQ</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <Link href="/account/login">Customer login</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Policies</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link className="text-foreground" href="/policies/shipping">
                Shipping & returns
              </Link>
            </li>
            <li>
              <Link className="text-foreground" href="/policies/privacy">
                Privacy
              </Link>
            </li>
            <li>
              <Link className="text-foreground" href="/policies/terms">
                Terms
              </Link>
            </li>
            <li>
              WhatsApp{" "}
              <a className="text-foreground" href={`https://wa.me/${site.whatsapp}`}>
                {site.phone}
              </a>
            </li>
            <li>
              <a className="text-foreground" href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} GarmentLoop. Circular wardrobe atelier · Demo runs without a
          database.
        </p>
      </div>
    </footer>
  );
}
