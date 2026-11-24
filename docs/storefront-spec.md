# GarmentLoop — Storefront Spec

## Routes

Home · Shop (multi-facet) · Collections/Categories · PDP · Cart · **multi-step Checkout** · Order confirm · Wishlist · Account (orders, addresses, returns) · Search · About · **Sustainability** · FAQ · Contact · **Policies** (privacy, terms, shipping) · Consent banner

## Checkout steps

1. Contact & address  
2. Shipping options + payment  
3. Review → Place order (guest OK)

## SEO / trust

- **Canonical host:** `https://garmentloop.com` via `site.url` / `NEXT_PUBLIC_SITE_URL` (`siteOrigin()` in `src/lib/seo.ts`); root `metadataBase`, default OG + Twitter `summary_large_image`, `en_PK`.
- **Must:** per-route titles/descriptions (`pageMeta`), Product JSON-LD (url/sku/AggregateOffer), dynamic `robots.ts` + `sitemap.ts` (no cart/checkout; includes policies + circular).
- **Should:** Organization + WebSite JSON-LD, BreadcrumbList (product/category/collection), FAQPage schema, Open Graph images (default `/og-default.svg`).
- **Could (deferred):** hreflang / multi-locale; Search Console verification meta (env later).
- Private routes (cart, checkout, account, wishlist, order) set `robots: noindex` in addition to robots.txt disallow.
- Trust strip under hero (free delivery, COD, circular).

## Persistence note

Works with demo seed when no DB — see architecture.md.
