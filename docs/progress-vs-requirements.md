# GarmentLoop — Progress vs Original Requirements

Audit date: 2026-11-25 (Phase 2 Should push: address autocomplete, EasyPost labels, GA4 shipping/payment events; SEO + cPanel MySQL already live). Earlier Neon QA: 2026-11-22 — see [qa-report.md](./qa-report.md). Sources: living `docs/requirements.md`.

## Scoring method

- **Done** = shipped and verified (or demoable with safe fallback)
- **Partial** = core path works; advanced pieces missing
- **Not started** = not in the running demo

**MVP Must %** ≈ share of Must-row cells that are Done (Partial counts half).  
**Full wish list %** ≈ Must + Should + Could (Could weighted lightly).  
**Blended** ≈ `0.55·Must + 0.30·Should + 0.15·Could`.

---

## Storefront

| Area | Source emphasis | Status | Notes |
| --- | --- | --- | --- |
| Homepage hero + collections CTAs | Must | Done | Brand-first full-bleed hero polish |
| Catalog / variants / categories / collections | Must | Done | Seeded + admin CRUD |
| Multi-facet filters + sort | Must | Done | Shop filters verified |
| Search + suggestions | Must | Done | Page + API verified |
| PDP gallery, variants, stock, ATC | Must | Done | PDP verified |
| Wishlist | Must | Done | Guest + account paths |
| Reviews display + submit | Must | Done | Submit → pending moderation |
| Cart persistent | Must | Done | Zustand + localStorage |
| Guest multi-step checkout | Must | Done | COD verified (cPanel MySQL live) |
| Zone shipping + tax line | Must | Done | Config rates; PK/GCC + illustrative intl notes |
| Payments COD / bank / card_demo / Stripe | Must | Done | Stripe Payment Element when keyed; prod rejects `card_demo` unless `ALLOW_CARD_DEMO` |
| Account OTP + orders + returns portal | Must | Done | Prod OTP hides `devCode`; RMA via admin |
| Static pages + policies + consent | Must | Done | Content editor |
| SEO meta + Product JSON-LD + sitemap | Must | Done | `.com` canonicals; pageMeta; robots/sitemap |
| BreadcrumbList + OG/Twitter | Should | Done | Org/WebSite/FAQ schema; default OG image |
| Address autocomplete | Should | Done | Checkout Photon/OSM suggestions (`/api/address/suggest`) — no API key |
| Express pay / BNPL / wallets | Should–Could | Done | Stripe Express Checkout + Payment Element (Dashboard enablement + keys) |
| Live carrier rates | Should | Done | EasyPost quote + checkout re-verify; zone fallback without keys |
| Avalara / full VAT | Should | Partial | Local PK/GCC + Avalara/TaxJar quote path; no SalesInvoice commit |
| Photo UGC / Q&A | Should–Could | Not started | |
| GA4 ecommerce events | Must hooks | Done | Consent + view/cart/checkout/purchase/refund + `add_shipping_info` / `add_payment_info` (needs `NEXT_PUBLIC_GA_MEASUREMENT_ID`) |
| Circular take-back / repair subscriptions | Brand Could | Done | `/circular` hub + account + admin queues |
| i18n / hreflang | Could | Deferred | EN + PKR/USD display |
| Personalization | Could | Not started | |

## Admin

| Module | Source emphasis | Status | Notes |
| --- | --- | --- | --- |
| Password login + RBAC (Owner/Admin/Staff) | Must | Done | |
| Owner-level module CRUD (forms + bulk) | Must | Done | |
| Dashboard KPIs + low stock | Must | Done | |
| Orders lifecycle | Must | Done | |
| Products CRUD + variants | Must | Done | cPanel MySQL / Neon |
| Inventory adjust + low stock | Must | Done | |
| Customers list + profile | Must | Done | |
| Categories / collections CRUD | Must | Done | |
| Discounts / coupons | Must | Done | |
| Analytics basic | Must | Done | |
| Users / invite RBAC | Must | Done | |
| Settings | Must | Done | MySQL / Neon / demo + EasyPost status |
| Admin login (no public demo passwords) | Must | Done | Env-only owner seed |
| Returns / RMA queue | Must | Done | |
| Reviews moderation | Must | Done | |
| Content pages editor | Must | Done | |
| CSV import/export | Should | Done | |
| Carrier label print / webhooks | Should | Done | EasyPost label buy on admin order (`/api/admin/shipping/label`) when keyed |
| MFA / audit log UI | Should | Done | |
| Gift cards / loyalty | Could | Not started | |
| Multi-warehouse / 3PL | Could | Not started | |
| Full BI / ERP sync | Could | Not started | |

## Integrations & NFR

| Area | Status | Notes |
| --- | --- | --- |
| Zero required DB locally | Done | |
| Neon on Vercel (optional) | Done | |
| cPanel MySQL on garmentloop.com | Done | |
| Stripe Checkout + webhook | Partial | Code ready; live keys unset on cPanel as of 2026-11-25 |
| Transactional email | Partial | Resend/SMTP code ready; live keys unset — OTP falls back to mock |
| WhatsApp confirm links | Partial | Env number optional |
| Performance / a11y AA basics | Partial | |
| Theme / visual system | Must | Done | |
| GDPR export/delete tooling | Not started | Policy pages only |

---

## Overall %

| Scope | Estimate | Rationale |
| --- | --- | --- |
| **MVP Must items** | **~96%** | Residual: production inbox OTP / GA4 measurement ID / Stripe keys on host |
| **Should (Phase 2)** | **~72%** | Autocomplete + EasyPost rates/labels + Stripe wallets/BNPL code + GA4 events Done; Avalara commit + Photo UGC open |
| **Could / Phase 3 wish list** | **~28%** | Circular MVP; loyalty / i18n / personalization / BI open |
| **Blended “full original docs”** | **~72%** | `0.55·96 + 0.30·72 + 0.15·28 ≈ 72` |

## Honest top gaps (remaining)

1. Set Resend/SMTP + Stripe + EasyPost + `NEXT_PUBLIC_GA_MEASUREMENT_ID` on garmentloop.com (code already wired)  
2. Avalara/TaxJar SalesInvoice commit / filing (quoting path exists)  
3. Photo UGC / Q&A  
4. Gift cards / loyalty / multi-warehouse / full BI  
5. Formal a11y / Core Web Vitals audit  
6. GDPR data export/delete tooling  

## Login UX

- **Customers:** `/account/login` — email OTP (production: email via Resend/SMTP; no `devCode` unless `AUTH_SHOW_OTP`)  
- **Staff/Owner:** `/admin/login` — email + password; MFA optional unless `ADMIN_MFA_REQUIRED=1`
