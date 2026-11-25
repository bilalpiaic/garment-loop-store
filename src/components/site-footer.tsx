import Link from "next/link";
import { site } from "@/lib/site";
import type { Category } from "@/lib/catalog";

export function SiteFooter({ categories }: { categories: Category[] }) {
  return (
    <footer className="ink-band mt-auto">
      <div className="gold-rule opacity-70" />
      <div className="page-shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-serif text-2xl tracking-tight text-ink">GarmentLoop</p>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {site.tagline} Designed in Lahore. Built for winters at home and abroad.
          </p>
        </div>
        <div>
          <p className="section-kicker mb-3">Shop</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/shop" className="hover:text-olive">
                All products
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/category/${category.slug}`} className="hover:text-olive">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="section-kicker mb-3">House</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:text-olive">
                About
              </Link>
            </li>
            <li>
              <Link href="/sustainability" className="hover:text-olive">
                Sustainability
              </Link>
            </li>
            <li>
              <Link href="/circular" className="hover:text-olive">
                Circular programs
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-olive">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-olive">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/account/login" className="hover:text-olive">
                Customer login
              </Link>
            </li>
            <li>
              <Link href="/admin/login" className="hover:text-olive">
                Staff / Admin sign in
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="section-kicker mb-3">Policies</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link className="text-foreground hover:text-olive" href="/policies/shipping">
                Shipping & returns
              </Link>
            </li>
            <li>
              <Link className="text-foreground hover:text-olive" href="/policies/privacy">
                Privacy
              </Link>
            </li>
            <li>
              <Link className="text-foreground hover:text-olive" href="/policies/terms">
                Terms
              </Link>
            </li>
            <li>
              WhatsApp{" "}
              <a className="text-foreground hover:text-olive" href={`https://wa.me/${site.whatsapp}`}>
                {site.phone}
              </a>
            </li>
            <li>
              <a className="text-foreground hover:text-olive" href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-champagne/20">
        <p className="page-shell py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} GarmentLoop. Circular wardrobe atelier · Demo runs without a
          database.
        </p>
      </div>
    </footer>
  );
}
