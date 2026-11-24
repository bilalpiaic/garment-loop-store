# GarmentLoop — Progress vs Original Requirements

Audit date: 2026-11-24 (cPanel MySQL live on garmentloop.com; security harden #15 merged; admin portal MySQL completeness). Earlier Neon QA: 2026-11-22 — see [qa-report.md](./qa-report.md). Sources: living `docs/requirements.md`.

## Scoring method

- **Done** = shipped and verified (or demoable with safe fallback)
- **Partial** = core path works; advanced pieces missing
- **Not started** = not in the running demo

**MVP Must %** ≈ share of Must-row cells that are Done (Partial counts half).  
**Full wish list %** ≈ Must + Should + Could (Could weighted lightly).

---

## Storefront

| Area | Source emphasis | Status | Notes |
| --- | --- | --- | --- |
| Homepage hero + collections CTAs | Must | Done | Brand-first full-bleed hero polish (2026-11-22); see ui-polish-notes.md |
| Catalog / variants / categories / collections | Must | Done | Seeded + admin CRUD |
| Multi-facet filters + sort | Must | Done | Shop filters verified |
| Search + suggestions | Must | Done | Page + API verified |
| PDP gallery, variants, stock, ATC | Must | Done | PDP verified |
| Wishlist | Must | Done | Guest + account paths |
| Reviews display + submit | Must | Done | Submit → pending moderation |
| Cart persistent | Must | Done | Zustand + localStorage |
| Guest multi-step checkout | Must | Done | COD verified (Neon historically; cPanel MySQL live) |
| Zone shipping + tax line | Must | Done | Config rates; PK tax estimate |
| Payments COD / bank / card_demo / Stripe | Must | Done | COD verified; Stripe when keyed; production rejects `card_demo` unless `ALLOW_CARD_DEMO` |
| Account OTP + orders + returns portal | Must | Done | Prod OTP hides `devCode`; RMA via admin |
| Static pages + policies + consent | Must | Done | Content editor |
| SEO meta + Product JSON-LD + sitemap | Must | Done | `.com` canonicals; pageMeta; robots/sitemap from origin |
| BreadcrumbList + OG/Twitter | Should | Done | Org/WebSite/FAQ schema; default OG image |
| Address autocomplete | Should | Not started | |
| Express pay / BNPL / wallets | Should–Could | Not started | |
| Live carrier rates | Should | Not started | |
| Avalara / full VAT | Should | Partial | Simple PK estimate only |
| Photo UGC / Q&A | Should–Could | Not started | |
| GA4 ecommerce events | Must hooks | Partial | Consent stub; no GA4 wired |
| Circular take-back / repair subscriptions | Brand Could | Done | `/circular` hub + account + admin queues; Stripe or mock |
| i18n / hreflang | Could | Deferred | EN + PKR/USD display; SEO Could deferred |
| Personalization | Could | Not started | |

## Admin

| Module | Source emphasis | Status | Notes |
| --- | --- | --- | --- |
| Password login + RBAC (Owner/Admin/Staff) | Must | Done | Discoverability verified on prod |
| Owner-level module CRUD (forms + bulk) | Must | Done | Create/archive/adjust verified |
| Dashboard KPIs + low stock | Must | Done | |
| Orders lifecycle | Must | Done | |
| Products CRUD + variants | Must | Done | Persisted on DB (cPanel MySQL live / Neon on Vercel) |
| Inventory adjust + low stock | Must | Done | |
| Customers list + profile | Must | Done | |
| Categories / collections CRUD | Must | Done | |
| Discounts / coupons | Must | Done | QA10 created |
| Analytics basic | Must | Done | Revenue, status breakdown, ops queues |
| Users / invite RBAC | Must | Done | |
| Settings | Must | Done | Shows MySQL / Neon / demo mode + editable store settings |
| Admin login (no public demo passwords) | Must | Done | Demo credentials box removed (#12); env-only owner seed (#15) |
| Returns / RMA queue | Must | Done | RMA for GL-0006; audited |
| Reviews moderation | Must | Done | Audited |
| Content pages editor | Must | Done | Create/edit/delete; MySQL copy |
| CSV import/export | Should | Done | `/admin/products/import` + export API |
| Carrier label print / webhooks | Should | Partial | Label API stub 501 (Phase 2) |
| MFA / audit log UI | Should | Done | `/admin/security` + `/admin/audit`; broader mutation coverage |
| Gift cards / loyalty | Could | Not started | |
| Multi-warehouse / 3PL | Could | Not started | |
| Full BI / ERP sync | Could | Not started | |

## Integrations & NFR

| Area | Status | Notes |
| --- | --- | --- |
| Zero required DB locally | Done | Demo/file/memory without DB URL |
| Neon on Vercel (optional) | Done | Postgres path retained |
| cPanel MySQL on garmentloop.com | Done | Tables migrated; live Settings → MySQL/MariaDB |
| Stripe Checkout + webhook | Partial | Works when keyed; demo otherwise |
| Transactional email | Partial | Resend/SMTP or mock; OTP emails wired — set keys on Vercel for inbox |
| WhatsApp confirm links | Partial | Env number optional |
| Performance / a11y AA basics | Partial | Brand atmosphere + reduced-motion; no formal audit |
| Theme / visual system | Must | Done | Soft Cream atmosphere, Olive Deep admin, Rust sale, motion — ui-polish-notes.md |
| GDPR export/delete tooling | Not started | Policy pages only |

---

## Overall %

| Scope | Estimate | Rationale |
| --- | --- | --- |
| **MVP Must items** | **~95%** | cPanel MySQL live + admin login hardened; residual: production inbox OTP keys / GA4 IDs |
| **Should (Phase 2)** | **~30%** | DB + webhooks/email paths; carriers, autocomplete still open |
| **Could / Phase 3 wish list** | **~25%** | Circular MVP shipped; loyalty points, i18n, personalization open |
| **Blended “full original docs”** | **~60–64%** | Must coverage + cPanel MySQL production; Phase 2–3 tail remains |

## Honest top gaps

1. Set Resend/SMTP on garmentloop.com / Vercel so production OTP reaches inboxes (code already sends via email stack)  
2. Live carrier rates / prepaid RMA labels  
3. Stripe wallets / BNPL / express pay  
4. Tax engine beyond PK estimate  
5. CSV product import, MFA, audit log UI  
6. ~~Circular take-back / repair / recycling subscriptions~~ (MVP done — `/circular`, admin Circular)
7. GA4 + marketing pixels beyond consent stub  

## Login UX

- **Customers:** `/account/login` — email OTP (production: email via Resend/SMTP; no `devCode` unless `AUTH_SHOW_OTP`)  
- **Staff/Owner:** `/admin/login` — email + password; linked from footer + account login
